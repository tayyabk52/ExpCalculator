import type { GroupAIContext } from '@/lib/types/ai-expense';
import { SchemaType } from '@google/generative-ai';

// ============================================
// JSON Schema for Gemini Structured Output
// ============================================

/**
 * JSON Schema for Gemini's responseSchema parameter
 * Ensures AI returns data in our expected format
 */
export const expenseResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    success: {
      type: SchemaType.BOOLEAN,
      description: "Whether parsing was successful"
    },
    people: {
      type: SchemaType.ARRAY,
      description: "List of people involved in the expense",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          active: { type: SchemaType.BOOLEAN }
        },
        required: ["name", "active"]
      }
    },
    currency: {
      type: SchemaType.STRING,
      description: "Currency code",
      enum: ["PKR", "USD", "EUR", "GBP", "AED", "INR", "SAR", "CAD", "AUD", "JPY"]
    },
    useLineItems: {
      type: SchemaType.BOOLEAN,
      description: "Whether to use itemized line items"
    },
    total: {
      type: SchemaType.NUMBER,
      description: "Total amount of the expense"
    },
    items: {
      type: SchemaType.ARRAY,
      description: "Line items (only if useLineItems is true)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER },
          ownerId: {
            type: SchemaType.STRING,
            description: "Name of item owner, or comma-separated names for multiple owners"
          }
        },
        required: ["label", "amount"]
      }
    },
    payers: {
      type: SchemaType.ARRAY,
      description: "Who paid what amount",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER }
        },
        required: ["name", "amount"]
      }
    },
    splitMethod: {
      type: SchemaType.STRING,
      description: "How to split the expense",
      enum: ["EQUAL", "EXACT", "PERCENT", "SHARES"]
    },
    exactAmounts: {
      type: SchemaType.ARRAY,
      description: "Exact amounts per person (for EXACT method)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER }
        },
        required: ["name", "amount"]
      }
    },
    percentages: {
      type: SchemaType.ARRAY,
      description: "Percentage per person (for PERCENT method)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          percent: { type: SchemaType.NUMBER }
        },
        required: ["name", "percent"]
      }
    },
    shares: {
      type: SchemaType.ARRAY,
      description: "Shares per person (for SHARES method)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          shares: { type: SchemaType.NUMBER }
        },
        required: ["name", "shares"]
      }
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence score from 0 to 1"
    },
    error: {
      type: SchemaType.STRING,
      description: "Error code if success is false"
    },
    message: {
      type: SchemaType.STRING,
      description: "Error or success message"
    },
    unknownMembers: {
      type: SchemaType.ARRAY,
      description: "List of member names that are not in the group",
      items: { type: SchemaType.STRING }
    },
    suggestions: {
      type: SchemaType.ARRAY,
      description: "Suggestions for fixing the input",
      items: { type: SchemaType.STRING }
    },
    expected: {
      type: SchemaType.NUMBER,
      description: "Expected total (for amount mismatch errors)"
    },
    calculated: {
      type: SchemaType.NUMBER,
      description: "Calculated total from payers (for amount mismatch errors)"
    }
  },
  required: [
    "success",
    "people",
    "currency",
    "total",
    "useLineItems",
    "items",
    "payers",
    "splitMethod",
    "exactAmounts",
    "percentages",
    "shares",
    "confidence"
  ]
};

// ============================================
// Prompt Templates
// ============================================

/**
 * Builds prompt for group expense parsing
 * Includes context about group members to constrain AI
 *
 * @param userInput - Natural language input from user
 * @param context - Group context (user identity and members)
 * @returns Formatted prompt for Gemini
 */
export function buildGroupPrompt(
  userInput: string,
  context: GroupAIContext
): string {
  const membersList = context.involvedMembers
    .map(name => `- ${name}`)
    .join('\n');

  return `You are an expense parser for a group expense splitting application.

=== STRICT CONTEXT (READ CAREFULLY) ===
User identity: "${context.userName}" (ID: ${context.userId})
- When user says "I", "me", "my", "myself" → ALWAYS means: ${context.userName}

Involved members (ONLY these people are in this expense):
${membersList}

=== CRITICAL RULES ===
1. ONLY use members from the "Involved members" list above
2. If user mentions a name NOT in the list, return error with error="UNKNOWN_MEMBER"
3. You CANNOT add new people - strictly use the pre-selected list
4. Default currency: PKR (Pakistan Rupees)
5. If user says "everyone", "all", or "everybody", include ALL members from the involved list
6. If split method is not specified, assume "EQUAL"
7. Validate that payer amounts sum to total amount (within 0.01 tolerance)
8. If amounts don't match, return error with error="AMOUNT_MISMATCH"
9. If input is too vague, return error with error="AMBIGUOUS_INPUT"
10. Set confidence between 0 and 1 based on how clear the input is

=== USER INPUT ===
"${userInput}"

=== PARSING GUIDELINES ===

**Split Method Detection:**
- "split equally", "split evenly", "divide equally", "share equally" → EQUAL
- "charge X amount Y, charge Z amount W", specific amounts per person → EXACT (use exactAmounts array)
- "X gets 40%, Y gets 60%", percentage splits → PERCENT (use percentages array)
- "X gets 2 shares, Y gets 3 shares", share-based splits → SHARES (use shares array)

**Important:** For EXACT method, populate exactAmounts array like [{"name": "Ali", "amount": 300}].
For PERCENT method, populate percentages array like [{"name": "Ali", "percent": 60}].
For SHARES method, populate shares array like [{"name": "Ali", "shares": 2}].

**Keywords:**
- "everyone", "all", "everybody" → Include all members from involved list
- "I", "me", "my", "myself" → Replace with ${context.userName}
- "paid", "payed", "covered", "spent" → Indicates payer

**Line Items Detection:**
- If user lists specific items (e.g., "Pizza 300, Drinks 200"), set useLineItems=true
- Use "for" or "to" keywords to assign items (e.g., "Pizza for Alice")
- If no assignment, leave ownerId empty (will split equally)

=== OUTPUT FORMAT ===

**SUCCESS CASE:**
Return JSON with success=true and all expense details. Example:
{
  "success": true,
  "people": [
    {"name": "Tayyab", "active": true},
    {"name": "Ali", "active": true}
  ],
  "currency": "PKR",
  "useLineItems": false,
  "total": 500,
  "items": [],
  "payers": [
    {"name": "Tayyab", "amount": 500},
    {"name": "Ali", "amount": 0}
  ],
  "splitMethod": "EQUAL",
  "exactAmounts": [],
  "percentages": [],
  "shares": [],
  "confidence": 0.95
}

**ERROR CASES:**

Unknown member mentioned:
{
  "success": false,
  "error": "UNKNOWN_MEMBER",
  "message": "Cannot use member 'Sara'. Only these members are involved: ${context.involvedMembers.join(', ')}",
  "unknownMembers": ["Sara"],
  "confidence": 0
}

Ambiguous input:
{
  "success": false,
  "error": "AMBIGUOUS_INPUT",
  "message": "Please specify who paid and how to split the amount",
  "suggestions": [
    "Try: 'I paid 500, split equally'",
    "Or: 'I paid 300, Ali paid 200, split evenly'"
  ],
  "confidence": 0
}

Amount mismatch:
{
  "success": false,
  "error": "AMOUNT_MISMATCH",
  "message": "Total (500) doesn't match sum of payer amounts (600)",
  "expected": 500,
  "calculated": 600,
  "confidence": 0
}

=== VALIDATION CHECKLIST ===
Before returning JSON, verify:
☑ All people names exist in involved members list
☑ Payer amounts sum to total (within 0.01)
☑ Currency is valid (default: PKR)
☑ Split method matches the data provided
☑ If EXACT method, exactAmounts array must be provided with all people
☑ If PERCENT method, percentages array must be provided with all people
☑ If SHARES method, shares array must be provided with all people
☑ Confidence is between 0 and 1
☑ If success=false, error and message are provided

=== EXAMPLES ===

Input: "I paid 500, split equally"
Output: {success: true, people: [{name: "${context.userName}", active: true}, ...all involved], total: 500, payers: [{name: "${context.userName}", amount: 500}], splitMethod: "EQUAL", ...}

Input: "I paid 800, Ali paid 200, divide evenly"
Output: {success: true, total: 1000, payers: [{name: "${context.userName}", amount: 800}, {name: "Ali", amount: 200}], splitMethod: "EQUAL", ...}

Input: "Pizza 300 for me and Ali, drinks 200 for everyone"
Output: {success: true, useLineItems: true, items: [{label: "Pizza", amount: 300, ownerId: "${context.userName},Ali"}, {label: "Drinks", amount: 200, ownerId: null}], ...}

Input: "Split 1000 with Sara"
Output: {success: false, error: "UNKNOWN_MEMBER", message: "Sara is not in the involved members list", unknownMembers: ["Sara"]}

Input: "I paid 600, Ali should pay 400"
Output: {success: true, total: 1000, payers: [{name: "${context.userName}", amount: 600}], splitMethod: "EXACT", exactAmounts: [{name: "${context.userName}", amount: 600}, {name: "Ali", amount: 400}], ...}

Input: "Ali gets 60% and I get 40% of the 1000 bill I paid"
Output: {success: true, total: 1000, payers: [{name: "${context.userName}", amount: 1000}], splitMethod: "PERCENT", percentages: [{name: "Ali", percent: 60}, {name: "${context.userName}", percent: 40}], ...}

Now parse the user input above and return valid JSON according to the schema.`;
}

/**
 * Builds prompt for standalone calculator parsing
 * No group context - AI can extract people from input freely
 *
 * @param userInput - Natural language input from user
 * @returns Formatted prompt for Gemini
 */
export function buildStandalonePrompt(userInput: string): string {
  return `You are an expense parser for an expense splitting calculator.

=== USER INPUT ===
"${userInput}"

=== YOUR TASK ===
Extract structured expense information from the user's natural language description.

=== PARSING GUIDELINES ===

**Extract People:**
- Identify all person names mentioned in the input
- If no names mentioned, ask for clarification

**Determine Currency:**
- Look for currency symbols: $ (USD), € (EUR), £ (GBP), Rs/₨ (PKR), etc.
- If not specified, default to USD

**Calculate Totals:**
- Extract total amount or sum up line items
- Ensure payer amounts equal total

**Detect Split Method:**
- "split equally", "divide evenly" → EQUAL
- Specific amounts per person → EXACT (use exactAmounts array: [{"name": "Alice", "amount": 50}])
- Percentages → PERCENT (use percentages array: [{"name": "Alice", "percent": 60}])
- Shares → SHARES (use shares array: [{"name": "Alice", "shares": 2}])

**Line Items:**
- If items are listed separately (e.g., "Pizza $30, Drinks $20"), use line items
- Assign ownership if mentioned (e.g., "for Alice")

=== OUTPUT FORMAT ===

**SUCCESS CASE:**
{
  "success": true,
  "people": [
    {"name": "Alice", "active": true},
    {"name": "Bob", "active": true}
  ],
  "currency": "USD",
  "useLineItems": false,
  "total": 150,
  "items": [],
  "payers": [
    {"name": "Alice", "amount": 150},
    {"name": "Bob", "amount": 0}
  ],
  "splitMethod": "EQUAL",
  "exactAmounts": [],
  "percentages": [],
  "shares": [],
  "confidence": 0.9
}

**ERROR CASE (if unclear):**
{
  "success": false,
  "error": "AMBIGUOUS_INPUT",
  "message": "Please specify who the people are and who paid what amount",
  "suggestions": ["Try: 'Alice paid $150, split equally with Alice and Bob'"],
  "confidence": 0
}

=== EXAMPLES ===

Input: "Alice paid $150 for dinner, split equally between Alice, Bob, and Charlie"
→ 3 people, Alice paid, EQUAL split

Input: "Alice paid $80, Bob paid $70, split the $150 evenly among 4 people"
→ 4 people (need names), two payers, EQUAL split

Input: "Pizza $30 for Alice and Bob, Drinks $20 split equally"
→ Line items mode, first item assigned to Alice and Bob

Now parse the input and return JSON.`;
}

// ============================================
// System Instructions
// ============================================

/**
 * System instruction for Gemini model
 * Sets the overall behavior and tone
 */
export const SYSTEM_INSTRUCTION = `You are a helpful assistant that parses natural language expense descriptions into structured data.

Key behaviors:
- Be precise and follow instructions exactly
- Return valid JSON that matches the provided schema
- If uncertain, return error with suggestions rather than guessing
- Validate all amounts and ensure they add up correctly
- Use only the members provided in group context (if applicable)
- Default to PKR currency unless specified otherwise
- Be case-insensitive when matching names`;
