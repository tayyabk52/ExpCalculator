'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportGroupStatement } from '@/lib/utils/group-pdf-exporter';
import type { 
  Group, 
  GroupExpense, 
  NetSettlement, 
  MemberBalance 
} from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';

interface ExportGroupStatementButtonProps {
  group: Group;
  expenses: GroupExpense[];
  netSettlements: NetSettlement[];
  memberBalances: MemberBalance[];
  currency: Currency;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ExportGroupStatementButton({
  group,
  expenses,
  netSettlements,
  memberBalances,
  currency,
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportGroupStatementButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      exportGroupStatement({
        group,
        expenses,
        netSettlements,
        memberBalances,
        currency,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export statement. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={`gap-2 ${className}`}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Generating...</span>
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Export Statement</span>
          <span className="sm:hidden">Export</span>
        </>
      )}
    </Button>
  );
}
