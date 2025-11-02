import { generateId } from './expense-utils';
import type {
  ParsedExpenseData,
  CalculatorState,
  AIExpenseMode,
  AIParseConfig,
} from '@/lib/types/ai-expense';
import type { Currency } from '@/lib/types/expense';

// ============================================
// Configuration
// ============================================

export const DEFAULT_AI_CONFIG: AIParseConfig = {
  maxInputLength: 500,
  minConfidenceThreshold: 0.7,
  defaultCurrency: 'PKR',
  enableFuzzyMatching: true,
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validates AI response structure and data integrity
 * @param data - Parsed data from AI
 * @returns true if valid, false otherwise
 */
export function validateAIResponse(data: ParsedExpenseData): boolean {
  // Check required fields exist
  if (typeof data.success !== 'boolean') return false;

  if (!data.success) {
    // For error responses, just need error message
    return typeof data.error === 'string' && typeof data.message === 'string';
  }

  // For success responses, validate all fields
  if (!Array.isArray(data.people) || data.people.length === 0) return false;
  if (!data.currency || typeof data.total !== 'number') return false;
  if (!Array.isArray(data.payers)) return false;
  if (!data.splitMethod) return false;

  // Validate people structure
  for (const person of data.people) {
    if (!person.name || typeof person.active !== 'boolean') return false;
  }

  // Validate payers structure
  for (const payer of data.payers) {
    if (!payer.name || typeof payer.amount !== 'number') return false;
  }

  // Validate payer amounts sum to total (with small tolerance for floating point)
  const payerTotal = data.payers.reduce((sum, p) => sum + p.amount, 0);
  const tolerance = 0.01;
  if (Math.abs(payerTotal - data.total) > tolerance) {
    console.warn(`Payer amounts (${payerTotal}) don't match total (${data.total})`);
    return false;
  }

  // Validate line items if present
  if (data.useLineItems) {
    if (!Array.isArray(data.items)) return false;
    for (const item of data.items) {
      if (!item.label || typeof item.amount !== 'number') return false;
    }
  }

  return true;
}

/**
 * Checks if AI confidence meets minimum threshold
 * @param data - Parsed data from AI
 * @param config - Configuration
 * @returns true if confidence is sufficient
 */
export function isConfidenceSufficient(
  data: ParsedExpenseData,
  config: AIParseConfig = DEFAULT_AI_CONFIG
): boolean {
  return data.confidence >= config.minConfidenceThreshold;
}

/**
 * Validates that all mentioned members exist in the allowed list
 * @param data - Parsed data from AI
 * @param allowedMembers - List of valid member names
 * @returns Array of unknown members (empty if all valid)
 */
export function findUnknownMembers(
  data: ParsedExpenseData,
  allowedMembers: string[]
): string[] {
  const unknown: string[] = [];
  const allowedSet = new Set(allowedMembers.map(m => m.toLowerCase()));

  for (const person of data.people) {
    if (!allowedSet.has(person.name.toLowerCase())) {
      unknown.push(person.name);
    }
  }

  for (const payer of data.payers) {
    if (!allowedSet.has(payer.name.toLowerCase())) {
      if (!unknown.includes(payer.name)) {
        unknown.push(payer.name);
      }
    }
  }

  return unknown;
}

// ============================================
// Mapping Functions
// ============================================

/**
 * Maps AI parsed data to calculator state
 * Generates IDs for people and items, and maps names to IDs
 *
 * @param aiData - Parsed data from AI
 * @param mode - standalone or group mode
 * @returns Calculator state ready to be applied
 */
export function mapAIDataToCalculatorState(
  aiData: ParsedExpenseData,
  mode: AIExpenseMode
): CalculatorState {
  // Generate IDs for people
  const peopleWithIds = aiData.people.map(person => ({
    id: generateId(),
    name: person.name,
    active: person.active,
  }));

  // Create name-to-ID lookup map
  const nameToIdMap: Record<string, string> = {};
  peopleWithIds.forEach(person => {
    nameToIdMap[person.name.toLowerCase()] = person.id;
  });

  // Map payers (convert names to IDs)
  const payersWithIds = aiData.payers.map(payer => {
    const personId = nameToIdMap[payer.name.toLowerCase()];
    return {
      id: personId || generateId(), // Fallback to new ID if not found
      amount: payer.amount,
    };
  });

  // Map line items (generate IDs and map owner names to IDs)
  const itemsWithIds = aiData.items.map(item => {
    let ownerId: string | undefined = undefined;

    if (item.ownerId) {
      // Handle multiple owners (comma-separated)
      const ownerNames = item.ownerId.split(',').map(n => n.trim());
      if (ownerNames.length === 1) {
        ownerId = nameToIdMap[ownerNames[0].toLowerCase()];
      } else {
        // For multiple owners, use the first one (or enhance this logic later)
        ownerId = nameToIdMap[ownerNames[0].toLowerCase()];
      }
    }

    return {
      id: generateId(),
      label: item.label,
      amount: item.amount,
      ownerId,
    };
  });

  // Convert arrays to Records and map names to IDs
  const exactByPerson: Record<string, number> = {};
  aiData.exactAmounts.forEach(({ name, amount }) => {
    const personId = nameToIdMap[name.toLowerCase()];
    if (personId) {
      exactByPerson[personId] = amount;
    }
  });

  const percentByPerson: Record<string, number> = {};
  aiData.percentages.forEach(({ name, percent }) => {
    const personId = nameToIdMap[name.toLowerCase()];
    if (personId) {
      percentByPerson[personId] = percent;
    }
  });

  const sharesByPerson: Record<string, number> = {};
  aiData.shares.forEach(({ name, shares }) => {
    const personId = nameToIdMap[name.toLowerCase()];
    if (personId) {
      sharesByPerson[personId] = shares;
    }
  });

  return {
    people: peopleWithIds,
    currency: aiData.currency,
    total: aiData.total,
    useLineItems: aiData.useLineItems,
    items: itemsWithIds,
    payers: payersWithIds,
    method: aiData.splitMethod,
    exactByPerson,
    percentByPerson,
    sharesByPerson,
  };
}

// ============================================
// Fuzzy Matching
// ============================================

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching member names
 *
 * @param a - First string
 * @param b - Second string
 * @returns Distance (lower = more similar)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Finds closest matching member name using fuzzy matching
 *
 * @param input - Input name (possibly misspelled)
 * @param members - List of valid member names
 * @param threshold - Maximum distance to consider a match (default: 2)
 * @returns Matched name or null if no close match
 */
export function fuzzyMatchMember(
  input: string,
  members: string[],
  threshold: number = 2
): string | null {
  const inputLower = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const member of members) {
    const distance = levenshteinDistance(inputLower, member.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = member;
    }
  }

  return bestMatch;
}

/**
 * Suggests corrections for unknown members using fuzzy matching
 *
 * @param unknownMembers - List of unknown member names
 * @param validMembers - List of valid member names
 * @returns Map of unknown name to suggested correction
 */
export function suggestMemberCorrections(
  unknownMembers: string[],
  validMembers: string[]
): Record<string, string | null> {
  const suggestions: Record<string, string | null> = {};

  for (const unknown of unknownMembers) {
    suggestions[unknown] = fuzzyMatchMember(unknown, validMembers);
  }

  return suggestions;
}

// ============================================
// Sanitization
// ============================================

/**
 * Sanitizes user input before sending to AI
 * Removes potentially dangerous content and enforces length limits
 *
 * @param input - Raw user input
 * @param config - Configuration
 * @returns Sanitized input
 */
export function sanitizeUserInput(
  input: string,
  config: AIParseConfig = DEFAULT_AI_CONFIG
): string {
  return input
    .trim()
    .slice(0, config.maxInputLength)
    // Remove script tags and HTML
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ');
}

// ============================================
// Error Formatting
// ============================================

/**
 * Formats AI error into user-friendly message
 *
 * @param data - Parsed data with error
 * @param validMembers - List of valid members (for context)
 * @returns User-friendly error message
 */
export function formatAIError(
  data: ParsedExpenseData,
  validMembers?: string[]
): string {
  if (!data.error) return 'An unknown error occurred';

  switch (data.error) {
    case 'UNKNOWN_MEMBER':
      if (data.unknownMembers && data.unknownMembers.length > 0 && validMembers) {
        const suggestions = suggestMemberCorrections(data.unknownMembers, validMembers);
        const suggestionText = Object.entries(suggestions)
          .filter(([_, match]) => match !== null)
          .map(([unknown, match]) => `Did you mean "${match}" instead of "${unknown}"?`)
          .join(' ');

        return `${data.message || 'Unknown member mentioned'}. ${suggestionText}`;
      }
      return data.message || 'One or more members are not in this group';

    case 'AMBIGUOUS_INPUT':
      return data.message || 'Please provide more details about the expense';

    case 'AMOUNT_MISMATCH':
      return data.message || 'The amounts don\'t add up correctly';

    case 'API_ERROR':
      return 'Failed to process your request. Please try again.';

    case 'VALIDATION_ERROR':
      return 'The response format was invalid. Please try rephrasing.';

    default:
      return data.message || 'An error occurred while processing your request';
  }
}

// ============================================
// Debugging Utilities
// ============================================

/**
 * Logs AI parse results for debugging
 * Only logs in development mode
 *
 * @param data - Parsed data from AI
 * @param input - Original user input
 */
export function logAIParse(data: ParsedExpenseData, input: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('🤖 AI Parse Result');
    console.log('Input:', input);
    console.log('Success:', data.success);
    if (data.success) {
      console.log('Confidence:', data.confidence);
      console.log('People:', data.people);
      console.log('Total:', data.total, data.currency);
      console.log('Split Method:', data.splitMethod);
    } else {
      console.log('Error:', data.error);
      console.log('Message:', data.message);
    }
    console.groupEnd();
  }
}
