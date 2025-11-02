import jsPDF from 'jspdf';
import type { 
  Group, 
  GroupExpense, 
  NetSettlement, 
  MemberBalance 
} from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';
import { formatGroupCode } from './group-utils';
import { format } from 'date-fns';

interface GroupStatementData {
  group: Group;
  expenses: GroupExpense[];
  netSettlements: NetSettlement[];
  memberBalances: MemberBalance[];
  currency: Currency;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PKR: 'Rs',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'د.إ',
  SAR: '﷼',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
};

export function exportGroupStatement(data: GroupStatementData): void {
  const { group, expenses, netSettlements, memberBalances, currency } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;
  const margin = 15;
  const lineHeight = 7;
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  // Helper function to add new page if needed
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPos + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toFixed(2)}`;
  };

  // ====================
  // HEADER SECTION
  // ====================
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Group Statement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Group Info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(group.name || 'Unnamed Group', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Group Code: ${formatGroupCode(group.code)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ====================
  // SUMMARY STATS
  // ====================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
  const openSettlements = netSettlements.filter(s => !s.is_paid).length;
  const closedSettlements = netSettlements.filter(s => s.is_paid).length;
  const totalMembers = memberBalances.length;

  const summaryData = [
    ['Total Expenses:', `${expenses.length}`],
    ['Total Amount:', formatCurrency(totalExpenseAmount)],
    ['Total Members:', `${totalMembers}`],
    ['Open Settlements:', `${openSettlements}`],
    ['Closed Settlements:', `${closedSettlements}`],
  ];

  summaryData.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin + 5, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 60, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += lineHeight;
  });

  yPos += 8;

  // ====================
  // NET SETTLEMENTS SECTION
  // ====================
  checkPageBreak(40);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Net Settlements', margin, yPos);
  yPos += 8;

  if (netSettlements.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No settlements to show', margin + 5, yPos);
    yPos += 10;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('From', margin + 3, yPos);
    doc.text('To', margin + 55, yPos);
    doc.text('Amount', margin + 105, yPos);
    doc.text('Status', margin + 145, yPos);
    yPos += 8;

    // Sort: open settlements first
    const sortedSettlements = [...netSettlements].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'closed' ? 1 : -1;
    });

    sortedSettlements.forEach((settlement, index) => {
      checkPageBreak(10);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
      }

      // Truncate names if too long
      const fromName = settlement.from && settlement.from.length > 15 
        ? settlement.from.substring(0, 12) + '...'
        : settlement.from || 'Unknown';
      const toName = settlement.to && settlement.to.length > 15
        ? settlement.to.substring(0, 12) + '...'
        : settlement.to || 'Unknown';

      doc.text(fromName, margin + 3, yPos);
      doc.text(toName, margin + 55, yPos);
      doc.text(formatCurrency(settlement.amount), margin + 105, yPos);

      // Status badge
      if (settlement.status === 'closed') {
        doc.setTextColor(34, 197, 94); // green
        doc.text('Paid', margin + 145, yPos);
      } else {
        doc.setTextColor(234, 88, 12); // orange
        doc.text('Open', margin + 145, yPos);
      }

      yPos += 7;
    });

    yPos += 5;
  }

  // ====================
  // MEMBER BALANCES SECTION
  // ====================
  checkPageBreak(40);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Member Balances', margin, yPos);
  yPos += 8;

  if (memberBalances.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No members found', margin + 5, yPos);
    yPos += 10;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Member', margin + 3, yPos);
    doc.text('Total Paid', margin + 80, yPos);
    doc.text('Total Owed', margin + 120, yPos);
    doc.text('Net Balance', margin + 160, yPos);
    yPos += 8;

    memberBalances.forEach((member, index) => {
      checkPageBreak(10);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
      }

      const memberName = member.name && member.name.length > 20
        ? member.name.substring(0, 17) + '...'
        : member.name || 'Unknown';

      // Calculate total paid and owed
      const totalOwed = member.owedTo.reduce((sum, debt) => sum + debt.amount, 0);
      const totalReceiving = member.owedBy.reduce((sum, credit) => sum + credit.amount, 0);

      doc.text(memberName, margin + 3, yPos);
      doc.text(formatCurrency(totalReceiving), margin + 80, yPos);
      doc.text(formatCurrency(totalOwed), margin + 120, yPos);

      // Net balance with color
      const netBalance = member.netBalance;
      if (netBalance > 0) {
        doc.setTextColor(34, 197, 94); // green - gets back
        doc.text(`+${formatCurrency(netBalance)}`, margin + 160, yPos);
      } else if (netBalance < 0) {
        doc.setTextColor(239, 68, 68); // red - owes
        doc.text(formatCurrency(netBalance), margin + 160, yPos);
      } else {
        doc.setTextColor(100, 100, 100);
        doc.text(formatCurrency(0), margin + 160, yPos);
      }

      yPos += 7;
    });

    yPos += 5;
  }

  // ====================
  // EXPENSE HISTORY SECTION
  // ====================
  checkPageBreak(40);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Expense History', margin, yPos);
  yPos += 8;

  if (expenses.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No expenses recorded', margin + 5, yPos);
    yPos += 10;
  } else {
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sortedExpenses.forEach((expense, index) => {
      checkPageBreak(25);

      // Expense card
      doc.setFillColor(248, 250, 252);
      const cardHeight = 20;
      doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, cardHeight, 2, 2, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(expense.title || `Expense #${index + 1}`, margin + 3, yPos + 2);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(format(new Date(expense.created_at), 'MMM dd, yyyy'), margin + 3, yPos + 8);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(expense.total_amount), pageWidth - margin - 3, yPos + 2, { align: 'right' });

      // Participants summary
      const expenseData = expense.expense_data;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const splitMethod = expenseData?.method || 'EQUAL';
      doc.text(splitMethod, pageWidth - margin - 3, yPos + 8, { align: 'right' });
      if (expenseData?.people && expenseData.people.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const participantNames = expenseData.people.slice(0, 3).map(p => p.name).join(', ');
        const moreText = expenseData.people.length > 3 ? ` +${expenseData.people.length - 3} more` : '';
        const participantsText = `Participants: ${participantNames}${moreText}`;
        doc.text(participantsText, margin + 3, yPos + 14);
      }

      yPos += cardHeight + 3;
    });
  }

  // ====================
  // FOOTER
  // ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by CalcHub - Expense Calculator',
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Save the PDF
  const fileName = `${group.name || 'Group'}_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
