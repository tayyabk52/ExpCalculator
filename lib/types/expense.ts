// Shared types for expense calculator

export type Currency = "PKR" | "USD" | "EUR" | "GBP" | "AED";

export type Person = {
  id: string;
  name: string;
  active: boolean;
};

export type LineItem = {
  id: string;
  label: string;
  amount: number;
  ownerId?: string;
};

export type Payer = {
  id: string;
  amount: number;
};

export type SplitMethod = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

export type Transfer = {
  from: string;
  to: string;
  amount: number;
};
