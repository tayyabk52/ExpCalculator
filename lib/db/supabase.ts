import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (automatically inferred from schema)
export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          code: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string | null;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      group_expenses: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          currency: string;
          total_amount: number;
          expense_data: any; // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          currency: string;
          total_amount: number;
          expense_data: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          currency?: string;
          total_amount?: number;
          expense_data?: any;
          created_at?: string;
        };
      };
      group_settlements: {
        Row: {
          id: string;
          expense_id: string;
          group_id: string;
          from_member: string;
          to_member: string;
          amount: number;
          status: 'open' | 'closed';
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          group_id: string;
          from_member: string;
          to_member: string;
          amount: number;
          status?: 'open' | 'closed';
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          expense_id?: string;
          group_id?: string;
          from_member?: string;
          to_member?: string;
          amount?: number;
          status?: 'open' | 'closed';
          created_at?: string;
          closed_at?: string | null;
        };
      };
    };
  };
};
