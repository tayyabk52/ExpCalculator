import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { ParseExpenseRequest, ParsedExpenseData } from "@/lib/types/ai-expense";
import { buildGroupPrompt, buildStandalonePrompt, expenseResponseSchema, SYSTEM_INSTRUCTION } from "@/lib/utils/ai-prompts";
import { validateAIResponse, sanitizeUserInput, logAIParse } from "@/lib/utils/ai-parser";

// ============================================
// Rate Limiting (Simple In-Memory)
// ============================================

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

/**
 * Check if request should be rate limited
 * @param identifier - IP address or user identifier
 * @returns true if should be blocked, false if allowed
 */
function shouldRateLimit(identifier: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(identifier) || [];

  // Remove old requests outside the window
  const recentRequests = requests.filter(
    time => now - time < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);

  return false;
}

// ============================================
// API Route Handler
// ============================================

/**
 * POST /api/parse-expense
 * Parses natural language expense description using Gemini AI
 *
 * Request body:
 * {
 *   mode: "standalone" | "group",
 *   userInput: string,
 *   context?: GroupAIContext (required for group mode)
 * }
 *
 * Response:
 * ParsedExpenseData (success or error)
 */
export async function POST(request: Request) {
  try {
    // ============================================
    // 1. Extract and validate request data
    // ============================================

    const body = await request.json() as ParseExpenseRequest;
    const { mode, userInput, context } = body;

    // Validate required fields
    if (!mode || !userInput) {
      return NextResponse.json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Missing required fields: mode and userInput",
        confidence: 0
      } as ParsedExpenseData, { status: 400 });
    }

    // Validate mode
    if (mode !== "standalone" && mode !== "group") {
      return NextResponse.json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Invalid mode. Must be 'standalone' or 'group'",
        confidence: 0
      } as ParsedExpenseData, { status: 400 });
    }

    // Validate group context if in group mode
    if (mode === "group") {
      if (!context || !context.userId || !context.userName || !context.involvedMembers) {
        return NextResponse.json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Group mode requires context with userId, userName, and involvedMembers",
          confidence: 0
        } as ParsedExpenseData, { status: 400 });
      }

      if (context.involvedMembers.length === 0) {
        return NextResponse.json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "At least one member must be selected",
          confidence: 0
        } as ParsedExpenseData, { status: 400 });
      }
    }

    // ============================================
    // 2. Rate limiting
    // ============================================

    const identifier = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    if (shouldRateLimit(identifier)) {
      return NextResponse.json({
        success: false,
        error: "RATE_LIMIT_ERROR",
        message: "Too many requests. Please wait a moment and try again.",
        confidence: 0
      } as ParsedExpenseData, { status: 429 });
    }

    // ============================================
    // 3. Sanitize input
    // ============================================

    const sanitizedInput = sanitizeUserInput(userInput);

    if (sanitizedInput.length < 5) {
      return NextResponse.json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Input is too short. Please provide more details.",
        confidence: 0
      } as ParsedExpenseData, { status: 400 });
    }

    // ============================================
    // 4. Check API key
    // ============================================

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return NextResponse.json({
        success: false,
        error: "API_ERROR",
        message: "API is not configured. Please contact support.",
        confidence: 0
      } as ParsedExpenseData, { status: 500 });
    }

    // ============================================
    // 5. Build prompt based on mode
    // ============================================

    const prompt = mode === "group" && context
      ? buildGroupPrompt(sanitizedInput, context)
      : buildStandalonePrompt(sanitizedInput);

    // ============================================
    // 6. Call Gemini API
    // ============================================

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: expenseResponseSchema as Schema,
        temperature: 0.2, // Lower temperature for more consistent outputs
        maxOutputTokens: 2048,
      },
    });

    // Generate content with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API timeout')), 30000); // 30 second timeout
    });

    const generatePromise = model.generateContent(prompt);

    const result = await Promise.race([
      generatePromise,
      timeoutPromise
    ]) as Awaited<ReturnType<typeof model.generateContent>>;

    // ============================================
    // 7. Parse and validate response
    // ============================================

    const responseText = result.response.text();
    let parsed: ParsedExpenseData;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json({
        success: false,
        error: "API_ERROR",
        message: "Failed to understand the AI response. Please try rephrasing your input.",
        confidence: 0
      } as ParsedExpenseData, { status: 500 });
    }

    // Validate response structure
    if (!validateAIResponse(parsed)) {
      console.error("Invalid AI response structure:", parsed);
      return NextResponse.json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "The AI response was invalid. Please try rephrasing your input.",
        confidence: 0
      } as ParsedExpenseData, { status: 500 });
    }

    // ============================================
    // 8. Log and return success
    // ============================================

    logAIParse(parsed, sanitizedInput);

    return NextResponse.json(parsed, {
      status: parsed.success ? 200 : 400
    });

  } catch (error: any) {
    // ============================================
    // Error handling
    // ============================================

    console.error("Error in parse-expense API:", error);

    // Check for specific error types
    if (error.message === 'API timeout') {
      return NextResponse.json({
        success: false,
        error: "API_ERROR",
        message: "Request timed out. Please try again with a simpler description.",
        confidence: 0
      } as ParsedExpenseData, { status: 504 });
    }

    // Gemini API specific errors
    if (error.message?.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: "API_ERROR",
        message: "API authentication failed. Please contact support.",
        confidence: 0
      } as ParsedExpenseData, { status: 500 });
    }

    if (error.message?.includes('quota')) {
      return NextResponse.json({
        success: false,
        error: "RATE_LIMIT_ERROR",
        message: "Service is temporarily unavailable. Please try again later.",
        confidence: 0
      } as ParsedExpenseData, { status: 503 });
    }

    // Generic error
    return NextResponse.json({
      success: false,
      error: "API_ERROR",
      message: "An unexpected error occurred. Please try again.",
      confidence: 0
    } as ParsedExpenseData, { status: 500 });
  }
}

// ============================================
// OPTIONS handler for CORS (if needed)
// ============================================

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
