import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import type { Currency, Person, LineItem, Payer, SplitMethod } from '@/lib/types/expense';
import { formatCurrency, clamp2 } from '@/lib/utils/expense-utils';

interface ExportData {
  currency: Currency;
  people: Person[];
  items: LineItem[];
  payers: Payer[];
  method: SplitMethod;
  useLineItems: boolean;
  calculations: any;
  exactByPerson: Record<string, number>;
  percentByPerson: Record<string, number>;
  sharesByPerson: Record<string, number>;
}

export function exportExpenseToPDF(data: ExportData) {
  const { currency, people, items, calculations, method, useLineItems } = data;
  const { activePeople, totalToUse, paidTotal, transfers, owedByPerson, payersMap, assignedSum, unassignedAmount, assignedForDisplay, unassignedForDisplay } = calculations;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129];
  const darkColor: [number, number, number] = [31, 41, 55];
  const lightGray: [number, number, number] = [249, 250, 251];
  const accentColor: [number, number, number] = [59, 130, 246];

  doc.setProperties({ title: `Expense Summary - ${new Date().toLocaleDateString()}` });

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Summary', marginX, 45);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    marginX,
    62
  );

  y = 100;
  doc.setTextColor(...darkColor);

  // Overview
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Overview', marginX, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Total Expense', 'Total Paid', 'Balance']],
    body: [[
      formatCurrency(totalToUse || 0, currency),
      formatCurrency(paidTotal || 0, currency),
      formatCurrency(clamp2((totalToUse || 0) - (paidTotal || 0)), currency),
    ]],
    styles: { fontSize: 11, cellPadding: 10, font: 'helvetica', fontStyle: 'bold', halign: 'center' },
    headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 11, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGray },
    theme: 'striped',
    margin: { left: marginX, right: marginX },
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 20;

  // Line Items
  if (items.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Line Items', marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['Item Description', 'Amount', 'Assigned To']],
      body: items.map((it) => [
        it.label || 'Unnamed Item',
        formatCurrency(it.amount || 0, currency),
        it.ownerId ? people.find((p) => p.id === it.ownerId)?.name || 'Unassigned' : 'Unassigned',
      ]),
      styles: { fontSize: 10, cellPadding: 8 },
      headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: lightGray },
      theme: 'striped',
      margin: { left: marginX, right: marginX },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;
  }

  // Payments
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Payments Made', marginX, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Person', 'Amount Paid']],
    body: activePeople.map((p: Person) => [p.name, formatCurrency(payersMap[p.id] || 0, currency)]),
    styles: { fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGray },
    theme: 'striped',
    margin: { left: marginX, right: marginX },
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 20;

  // Split Method Box
  doc.setFillColor(254, 249, 195);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(marginX, y, pageWidth - 2 * marginX, 60, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Split Method', marginX + 10, y + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let methodText = '';
  if (method === 'EXACT' && useLineItems) {
    methodText = `EXACT via line items • Assigned: ${formatCurrency(assignedSum, currency)} • Unassigned: ${formatCurrency(unassignedAmount, currency)}`;
  } else if (method === 'EQUAL') {
    methodText = `EQUAL split among ${activePeople.length} people`;
  } else if (method === 'EXACT') {
    methodText = 'EXACT amounts per person';
  } else if (method === 'PERCENT') {
    methodText = 'PERCENT-based split';
  } else if (method === 'SHARES') {
    methodText = 'SHARES-based split';
  }
  doc.text(methodText, marginX + 10, y + 35);

  y += 80;

  // Detailed Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Detailed Breakdown by Person', marginX, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Person', 'Assigned', 'Unassigned', 'Total Owes', 'Paid', 'Net Balance']],
    body: activePeople.map((p: Person) => {
      const assigned = assignedForDisplay[p.id] || 0;
      const unassigned = unassignedForDisplay[p.id] || 0;
      const owes = owedByPerson[p.id] || 0;
      const paid = payersMap[p.id] || 0;
      const net = clamp2(paid - owes);
      return [
        p.name,
        formatCurrency(assigned, currency),
        formatCurrency(unassigned, currency),
        formatCurrency(owes, currency),
        formatCurrency(paid, currency),
        formatCurrency(net, currency),
      ];
    }),
    styles: { fontSize: 9, cellPadding: 8 },
    headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: { 5: { fontStyle: 'bold' } },
    theme: 'striped',
    margin: { left: marginX, right: marginX },
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 20;

  // Settlements
  if (transfers.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('💸 Suggested Settlements', marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['From', 'To', 'Amount']],
      body: transfers.map((t: any) => [
        people.find((p) => p.id === t.from)?.name || '',
        people.find((p) => p.id === t.to)?.name || '',
        formatCurrency(t.amount, currency),
      ]),
      styles: { fontSize: 10, cellPadding: 10, fontStyle: 'bold' },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [220, 252, 231] },
      theme: 'striped',
      margin: { left: marginX, right: marginX },
    });
  }

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || y;
  const footerY = doc.internal.pageSize.getHeight() - 30;
  if (finalY < footerY - 20) {
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'italic');
    const footerText = `Generated by CalcHub • Currency: ${currency}`;
    const textWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - textWidth) / 2, footerY);
  }

  doc.save(`expense-summary-${new Date().toISOString().split('T')[0]}.pdf`);
}
