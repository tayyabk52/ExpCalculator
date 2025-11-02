import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { ensureGroupMembers } from '@/lib/utils/group-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();

    const {
      groupId,
      title,
      currency,
      total_amount,
      expense_data,
      memberNames,
      transfers,
    } = body;

    // Validate required fields
    if (!groupId || !title || !currency || total_amount === undefined || !expense_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Ensure all people are added as group members
    if (memberNames && memberNames.length > 0) {
      await ensureGroupMembers(groupId, memberNames);
    }

    // Step 2: Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from('group_expenses')
      .insert({
        group_id: groupId,
        title: title,
        currency,
        total_amount,
        expense_data,
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error inserting expense:', expenseError);
      return NextResponse.json(
        { error: expenseError.message },
        { status: 500 }
      );
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    // Step 3: Insert settlements if provided
    if (transfers && transfers.length > 0) {
      const settlements = transfers.map((transfer: any) => ({
        expense_id: expense.id,
        group_id: groupId,
        from_member: transfer.from_member,
        to_member: transfer.to_member,
        amount: transfer.amount,
        status: 'open' as const,
      }));

      const { error: settlementsError } = await supabase
        .from('group_settlements')
        .insert(settlements);

      if (settlementsError) {
        console.error('Error inserting settlements:', settlementsError);
        // Don't fail the whole request if settlements fail
        // The expense is already created
      }
    }

    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense created successfully',
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
