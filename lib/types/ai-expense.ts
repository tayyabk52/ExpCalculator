import type { Currency, SplitMethod } from './expense';

// ============================================
// AI Expense Input Types
// ============================================

/**
 * Mode for AI expense parsing
 * - standalone: Individual expense calculator (no group context)
 * - group: Group expense with database members
 */
export type AIExpenseMode = 'standalone' | 'group';

/**
 * Context for group mode AI parsing
 * Provides member information from database to constrain AI
 */
export type GroupAIContext = {
  userId: string;           // ID of the current user
  userName: string;         // Name of the current user (for "me"/"I" resolution)
  involvedMembers: string[]; // Names of members selected as involved in this expense
};

/**
 * Parsed expense data returned from AI
 * This is the structured output from Gemini API
 */
export type ParsedExpenseData = {
  // Success indicator
  success: boolean;

  // People involved in the expense
  people: Array<{
    name: string;
    active: boolean;
  }>;

  // Financial details
  currency: Currency;
  total: number;

  // Line items (if applicable)
  useLineItems: boolean;
  items: Array<{
    label: string;
    amount: number;
    ownerId?: string; // Can be comma-separated for multiple owners
  }>;

  // Who paid what
  payers: Array<{
    name: string;
    amount: number;
  }>;

  // Split configuration
  splitMethod: SplitMethod;
  exactAmounts: Array<{ name: string; amount: number }>;   // For EXACT method
  percentages: Array<{ name: string; percent: number }>;    // For PERCENT method
  shares: Array<{ name: string; shares: number }>;         // For SHARES method

  // Metadata
  confidence: number; // 0-1 scale of AI confidence in the parse

  // Error information (if success = false)
  error?: string;
  message?: string;
  unknownMembers?: string[];
  suggestions?: string[];
  expected?: number;     // For amount mismatch errors
  calculated?: number;   // For amount mismatch errors
};

/**
 * Request payload for AI parsing API
 */
export type ParseExpenseRequest = {
  mode: AIExpenseMode;
  userInput: string;
  context?: GroupAIContext; // Required for group mode
};

/**
 * Calculator state that can be populated from AI data
 * Used to map AI response to calculator's internal state
 */
export type CalculatorState = {
  people: Array<{
    id: string;
    name: string;
    active: boolean;
  }>;
  currency: Currency;
  total: number;
  useLineItems: boolean;
  items: Array<{
    id: string;
    label: string;
    amount: number;
    ownerId?: string;
  }>;
  payers: Array<{
    id: string;
    amount: number;
  }>;
  method: SplitMethod;
  exactByPerson: Record<string, number>;
  percentByPerson: Record<string, number>;
  sharesByPerson: Record<string, number>;
};

/**
 * Error types that can occur during AI parsing
 */
export type AIParseError =
  | 'UNKNOWN_MEMBER'      // Member mentioned not in group
  | 'AMBIGUOUS_INPUT'     // Input too vague to parse
  | 'AMOUNT_MISMATCH'     // Payer amounts don't match total
  | 'API_ERROR'           // Gemini API failure
  | 'VALIDATION_ERROR'    // AI response doesn't match schema
  | 'RATE_LIMIT_ERROR';   // Too many requests

/**
 * Configuration for AI parsing
 */
export type AIParseConfig = {
  maxInputLength: number;
  minConfidenceThreshold: number;
  defaultCurrency: Currency;
  enableFuzzyMatching: boolean;
};
