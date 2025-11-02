'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/expense-utils';
import type { MemberBalance } from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';

type MemberBalanceSummaryProps = {
  balances: MemberBalance[];
  currency: Currency;
};

export default function MemberBalanceSummary({ balances, currency }: MemberBalanceSummaryProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (balances.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        No member data available
      </div>
    );
  }

  // Sort by net balance (creditors first, then debtors)
  const sortedBalances = [...balances].sort((a, b) => b.netBalance - a.netBalance);

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  // Helper to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 1);
  };

  return (
    <div className="space-y-4">
      <div className="px-4 sm:px-0">
        <p className="text-sm text-slate-500">Overall balance for each member</p>
      </div>

      <div className="space-y-2 sm:space-y-4">
        {sortedBalances.map((balance, index) => {
          const isCreditor = balance.netBalance > 0.01;
          const isDebtor = balance.netBalance < -0.01;
          const isEven = !isCreditor && !isDebtor;
          const hasDetails = balance.owedTo.length > 0 || balance.owedBy.length > 0;
          const isExpanded = expandedCards.has(balance.name);

          return (
            <div
              key={balance.name}
              className="member-card bg-white rounded-lg sm:rounded-xl sm:shadow-sm border border-slate-100"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Card Header - Clickable if has details */}
              <div
                className={`flex items-center p-4 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && toggleCard(balance.name)}
              >
                {/* Semantic Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCreditor
                    ? 'bg-emerald-100'
                    : isDebtor
                    ? 'bg-rose-100'
                    : 'bg-slate-100'
                }`}>
                  {isCreditor ? (
                    <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  ) : isDebtor ? (
                    <svg className="w-5 h-5 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="ml-3 flex-1">
                  <p className="text-base font-semibold text-slate-900">{balance.name}</p>
                  <p className="text-sm text-slate-500">
                    {isCreditor && 'Receives money'}
                    {isDebtor && 'Owes money'}
                    {isEven && 'All settled'}
                  </p>
                </div>

                {/* Data */}
                <div className="text-right">
                  <p className={`text-base font-bold ${
                    isCreditor
                      ? 'text-emerald-600'
                      : isDebtor
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}>
                    {formatCurrency(Math.abs(balance.netBalance), currency)}
                  </p>
                  <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isCreditor
                      ? 'bg-emerald-100 text-emerald-800'
                      : isDebtor
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isCreditor && 'To Receive'}
                    {isDebtor && 'To Pay'}
                    {isEven && 'Settled'}
                  </span>
                </div>

                {/* Chevron - Only show if has details */}
                {hasDetails && (
                  <div className="pl-2">
                    <ChevronDown 
                      className={`h-5 w-5 text-slate-400 transition-transform duration-300 ease-out ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Expandable Details */}
              {hasDetails && (
                <div 
                  className={`member-card-details overflow-hidden transition-all duration-300 ease-out ${
                    isExpanded ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="pb-4 px-4">
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      {/* Owes To */}
                      {balance.owedTo.map((debt, idx) => (
                        <div
                          key={`owes-${idx}`}
                          className="flex justify-between items-center text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Owes to</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                                {getInitials(debt.member)}
                              </div>
                              <span className="font-medium text-slate-800">{debt.member}</span>
                            </div>
                          </div>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(debt.amount, currency)}
                          </span>
                        </div>
                      ))}
                      {/* Receives From */}
                      {balance.owedBy.map((credit, idx) => (
                        <div
                          key={`receives-${idx}`}
                          className="flex justify-between items-center text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Receives from</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                                {getInitials(credit.member)}
                              </div>
                              <span className="font-medium text-slate-800">{credit.member}</span>
                            </div>
                          </div>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(credit.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
