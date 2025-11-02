'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowRightLeft,
  Users,
  SplitSquareHorizontal,
  Info,
  LayoutPanelLeft,
  Percent,
  Sigma,
  Scale,
  Receipt,
  HelpCircle,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- PDF ---
import jsPDF from "jspdf";
// @ts-ignore - types shipped by plugin
import autoTable from "jspdf-autotable";

// --- shadcn/ui imports ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ---------------- Types ----------------

type Currency = "PKR" | "USD" | "EUR" | "GBP" | "AED";

type Person = {
  id: string;
  name: string;
  active: boolean; // participating in this expense
};

type LineItem = {
  id: string;
  label: string;
  amount: number;
  ownerId?: string; // for Exact Amounts via line items
};

type Payer = {
  id: string; // personId
  amount: number;
};

type SplitMethod = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

// --------------- Helpers ---------------

const fmt = (n: number, currency: Currency) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);

const uid = () => Math.random().toString(36).slice(2, 9);

const clamp2 = (n: number) => Math.round((isFinite(n) ? n : 0) * 100) / 100;

function settleDebts(balances: Record<string, number>) {
  // balances: +ve means others owe this person; -ve means this person owes others
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];

  Object.entries(balances).forEach(([id, val]) => {
    const v = clamp2(val);
    if (v > 0.009) creditors.push({ id, amt: v });
    else if (v < -0.009) debtors.push({ id, amt: -v });
  });

  // Greedy settlement
  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: clamp2(pay) });
    debtors[i].amt = clamp2(debtors[i].amt - pay);
    creditors[j].amt = clamp2(creditors[j].amt - pay);
    if (debtors[i].amt <= 0.009) i++;
    if (creditors[j].amt <= 0.009) j++;
  }
  return transfers;
}

// --------------- Main Component ---------------

export default function SmartExpenseCalculator_LineItemsFix() {
  // People & currency
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [currency, setCurrency] = useState<Currency>("PKR");

  // Expense entry
  const [total, setTotal] = useState<number>(0);
  const [useLineItems, setUseLineItems] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);

  // Paid By
  const [payers, setPayers] = useState<Payer[]>([]);

  // Split method
  const [method, setMethod] = useState<SplitMethod>("EQUAL");
  const [exactByPerson, setExactByPerson] = useState<Record<string, number>>({});
  const [percentByPerson, setPercentByPerson] = useState<Record<string, number>>({});
  const [sharesByPerson, setSharesByPerson] = useState<Record<string, number>>({});

  // ---------- Derived values ----------

  const activePeople = people.filter((p) => p.active !== false);
  const activeIds = activePeople.map((p) => p.id);

  const nameById = (id?: string) => (id ? people.find((p) => p.id === id)?.name ?? "—" : "—");

  const totalFromItems = useMemo(
    () => clamp2(items.reduce((s, it) => s + (isFinite(it.amount) ? it.amount : 0), 0)),
    [items]
  );
  const payersMap = useMemo(
    () => Object.fromEntries(payers.map((p) => [p.id, p.amount || 0])),
    [payers]
  );
  const paidTotal = useMemo(
    () => clamp2(payers.reduce((s, p) => s + (isFinite(p.amount) ? p.amount : 0), 0)),
    [payers]
  );

  const lineItemExactByPerson = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      if (it.ownerId) map[it.ownerId] = clamp2((map[it.ownerId] || 0) + (isFinite(it.amount) ? it.amount : 0));
    });
    return map;
  }, [items]);

  const totalToUse = useLineItems ? totalFromItems : total;

  // 🔁 Auto-switch to EXACT when using line items with any owner assigned
  useEffect(() => {
    if (!useLineItems) return;
    const anyAssigned = items.some((i) => i.ownerId && isFinite(i.amount) && i.amount > 0);
    if (anyAssigned && method !== "EXACT") setMethod("EXACT");
  }, [useLineItems, items, method]);

  // Helper sums for EXact + line items hybrid logic
  const assignedSum = useMemo(() => {
    if (!useLineItems) return 0;
    return clamp2(activeIds.reduce((s, id) => s + (lineItemExactByPerson[id] || 0), 0));
  }, [useLineItems, lineItemExactByPerson, activeIds]);

  const unassignedAmount = useMemo(() => {
    if (!useLineItems) return 0;
    return clamp2(totalFromItems - assignedSum);
  }, [useLineItems, totalFromItems, assignedSum]);

  const owedByPerson: Record<string, number> = useMemo(() => {
    const ids = activePeople.map((p) => p.id);
    const result: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));

    if (totalToUse <= 0 || ids.length === 0) return result;

    switch (method) {
      case "EQUAL": {
        const each = clamp2(totalToUse / ids.length);
        ids.forEach((id) => (result[id] = each));
        return result;
      }
      case "EXACT": {
        if (useLineItems) {
          // ✅ Hybrid behavior
          // - Assigned items: charge full amount to that owner
          // - Unassigned items: split equally among all active participants
          const eachUnassigned = clamp2(unassignedAmount / ids.length);
          ids.forEach((id) => {
            const assigned = lineItemExactByPerson[id] || 0;
            result[id] = clamp2(assigned + eachUnassigned);
          });
          return result;
        }
        // Manual per-person exacts (scale to match total)
        const sum = clamp2(ids.reduce((s, id) => s + (exactByPerson[id] || 0), 0));
        if (sum === 0) return result;
        const factor = totalToUse > 0 ? totalToUse / sum : 1;
        ids.forEach((id) => (result[id] = clamp2((exactByPerson[id] || 0) * factor)));
        return result;
      }
      case "PERCENT": {
        const pctSum = ids.reduce((s, id) => s + (percentByPerson[id] || 0), 0);
        if (pctSum <= 0) return result;
        ids.forEach((id) => (result[id] = clamp2(totalToUse * ((percentByPerson[id] || 0) / pctSum))));
        return result;
      }
      case "SHARES": {
        const shares = ids.reduce((s, id) => s + (sharesByPerson[id] || 0), 0);
        if (shares <= 0) return result;
        const perShare = totalToUse / shares;
        ids.forEach((id) => (result[id] = clamp2((sharesByPerson[id] || 0) * perShare)));
        return result;
      }
    }
  }, [activePeople, method, exactByPerson, percentByPerson, sharesByPerson, lineItemExactByPerson, totalToUse, useLineItems, unassignedAmount]);

  const balances = useMemo(() => {
    const map: Record<string, number> = {};
    activePeople.forEach((p) => {
      const paid = payersMap[p.id] || 0;
      const owe = owedByPerson[p.id] || 0;
      map[p.id] = clamp2(paid - owe);
    });
    return map;
  }, [activePeople, payersMap, owedByPerson]);

  const transfers = useMemo(() => settleDebts(balances), [balances]);

  // ---------- Display helpers for audit ----------
  const exactEachUnassigned = useMemo(() => (method === "EXACT" && useLineItems && activeIds.length ? clamp2(unassignedAmount / activeIds.length) : 0), [method, useLineItems, unassignedAmount, activeIds.length]);

  const assignedForDisplay: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    activeIds.forEach((id) => {
      if (method === "EXACT" && useLineItems) result[id] = lineItemExactByPerson[id] || 0;
      else if (method === "EXACT" && !useLineItems) result[id] = exactByPerson[id] || 0;
      else result[id] = 0;
    });
    return result;
  }, [activeIds, method, useLineItems, lineItemExactByPerson, exactByPerson]);

  const unassignedForDisplay: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    activeIds.forEach((id) => {
      if (method === "EXACT" && useLineItems) result[id] = exactEachUnassigned;
      else if (method === "EQUAL") result[id] = owedByPerson[id] || 0; // equal method shows as unassigned share
      else result[id] = 0;
    });
    return result;
  }, [activeIds, method, useLineItems, exactEachUnassigned, owedByPerson]);

  // ---------- PDF export ----------
  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 50;

    // Brand colors
    const primaryColor: [number, number, number] = [16, 185, 129]; // emerald-500
    const darkColor: [number, number, number] = [31, 41, 55]; // gray-800
    const lightGray: [number, number, number] = [249, 250, 251]; // gray-50
    const accentColor: [number, number, number] = [59, 130, 246]; // blue-500

    doc.setProperties({ title: `Expense Summary - ${new Date().toLocaleDateString()}` });

    // Header with colored background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 80, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("Expense Summary", marginX, 45);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, marginX, 62);
    
    y = 100;
    doc.setTextColor(...darkColor);

    // Overview section with highlight box
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Financial Overview", marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Total Expense", "Total Paid", "Balance"]],
      body: [[
        fmt(totalToUse || 0, currency), 
        fmt(paidTotal || 0, currency), 
        fmt(clamp2((totalToUse || 0) - (paidTotal || 0)), currency)
      ]],
      styles: { 
        fontSize: 11,
        cellPadding: 10,
        font: 'helvetica',
        fontStyle: 'bold',
        halign: 'center'
      },
      headStyles: { 
        fillColor: darkColor,
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: lightGray },
      theme: "striped",
      margin: { left: marginX, right: marginX }
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;

    // Line Items section
    if (items.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text("Line Items", marginX, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Item Description", "Amount", "Assigned To"]],
        body: items.map(it => [
          it.label || "Unnamed Item", 
          fmt(it.amount || 0, currency), 
          it.ownerId ? nameById(it.ownerId) : "Unassigned"
        ]),
        styles: { 
          fontSize: 10,
          cellPadding: 8
        },
        headStyles: { 
          fillColor: accentColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: lightGray },
        theme: "striped",
        margin: { left: marginX, right: marginX }
      });
      // @ts-ignore
      y = doc.lastAutoTable.finalY + 20;
    }

    // Payments section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text("Payments Made", marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Person", "Amount Paid"]],
      body: activePeople.map(p => [p.name, fmt(payersMap[p.id] || 0, currency)]),
      styles: { 
        fontSize: 10,
        cellPadding: 8
      },
      headStyles: { 
        fillColor: accentColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: lightGray },
      theme: "striped",
      margin: { left: marginX, right: marginX }
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;

    // Split method explanation box
    doc.setFillColor(254, 249, 195); // yellow-100
    doc.setDrawColor(251, 191, 36); // yellow-400
    doc.roundedRect(marginX, y, pageWidth - 2 * marginX, 60, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text("Split Method", marginX + 10, y + 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let methodText = "";
    if (method === "EXACT" && useLineItems) {
      methodText = `EXACT via line items • Assigned: ${fmt(assignedSum, currency)} • Unassigned: ${fmt(unassignedAmount, currency)} (split ${activeIds.length} ways)`;
    } else if (method === "EQUAL") {
      methodText = `EQUAL split among ${activeIds.length} people • Each pays: ${fmt((totalToUse || 0) / activeIds.length, currency)}`;
    } else if (method === "EXACT") {
      methodText = "EXACT amounts per person (scaled proportionally if needed)";
    } else if (method === "PERCENT") {
      methodText = "PERCENT-based split (proportional to percentages)";
    } else if (method === "SHARES") {
      methodText = "SHARES-based split (proportional to share count)";
    }
    doc.text(methodText, marginX + 10, y + 35);
    
    y += 80;

    // Detailed breakdown
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text("Detailed Breakdown by Person", marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Person", "Assigned", "Unassigned", "Total Owes", "Paid", "Net Balance"]],
      body: activePeople.map((p) => {
        const assigned = assignedForDisplay[p.id] || 0;
        const unassigned = unassignedForDisplay[p.id] || 0;
        const owes = owedByPerson[p.id] || 0;
        const paid = payersMap[p.id] || 0;
        const net = clamp2(paid - owes);
        return [
          p.name, 
          fmt(assigned, currency), 
          fmt(unassigned, currency), 
          fmt(owes, currency), 
          fmt(paid, currency), 
          fmt(net, currency)
        ];
      }),
      styles: { 
        fontSize: 9,
        cellPadding: 8
      },
      headStyles: { 
        fillColor: darkColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: lightGray },
      columnStyles: {
        5: { fontStyle: 'bold' } // Net balance column in bold
      },
      theme: "striped",
      margin: { left: marginX, right: marginX }
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 20;

    // Settlement suggestions
    if (transfers.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text("💸 Suggested Settlements", marginX, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["From", "To", "Amount"]],
        body: transfers.map(t => [nameById(t.from), nameById(t.to), fmt(t.amount, currency)]),
        styles: { 
          fontSize: 10,
          cellPadding: 10,
          fontStyle: 'bold'
        },
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [220, 252, 231] }, // emerald-100
        theme: "striped",
        margin: { left: marginX, right: marginX }
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || y;
    const footerY = doc.internal.pageSize.getHeight() - 30;
    if (finalY < footerY - 20) {
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.setFont('helvetica', 'italic');
      const footerText = `Generated by Expense Calculator • Currency: ${currency}`;
      const textWidth = doc.getTextWidth(footerText);
      doc.text(footerText, (pageWidth - textWidth) / 2, footerY);
    }

    doc.save(`expense-summary-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------- Demos ----------
  const loadPrintShop = () => {
    const Taha = { id: uid(), name: "Taha", active: true };
    const Fatima = { id: uid(), name: "Fatima", active: true };
    const Tayyab = { id: uid(), name: "Tayyab", active: true };
    setPeople([Taha, Fatima, Tayyab]);
    setCurrency("PKR");
    setUseLineItems(false);
    setItems([]);
    const total = 490 + 970; // 1,460
    setTotal(total);
    setPayers([
      { id: Fatima.id, amount: 490 },
      { id: Tayyab.id, amount: 970 },
      { id: Taha.id, amount: 0 },
    ]);
    setMethod("EQUAL");
    setExactByPerson({});
    setPercentByPerson({});
    setSharesByPerson({});
  };

  // ---------- Add / Remove helpers ----------
  const addPerson = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p: Person = { id: uid(), name: trimmed, active: true };
    setPeople((prev) => [...prev, p]);
    setPayers((prev) => [...prev, { id: p.id, amount: 0 }]);
    setExactByPerson((prev) => ({ ...prev, [p.id]: 0 }));
    setPercentByPerson((prev) => ({ ...prev, [p.id]: 0 }));
    setSharesByPerson((prev) => ({ ...prev, [p.id]: 0 }));
    setNewName("");
  };

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setPayers((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) => prev.map((it) => (it.ownerId === id ? { ...it, ownerId: undefined } : it)));
    setExactByPerson((prev) => {
      const n = { ...prev } as Record<string, number>;
      delete n[id];
      return n;
    });
    setPercentByPerson((prev) => {
      const n = { ...prev } as Record<string, number>;
      delete n[id];
      return n;
    });
    setSharesByPerson((prev) => {
      const n = { ...prev } as Record<string, number>;
      delete n[id];
      return n;
    });
  };

  const upsertPayer = (id: string, amount: number) => {
    setPayers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return [...prev, { id, amount }];
      const copy = [...prev];
      copy[idx] = { id, amount };
      return copy;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { id: uid(), label: "", amount: 0 }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // ---------- Validation helpers ----------
  const totalToShow = totalToUse || 0;
  const payerDelta = clamp2(totalToShow - paidTotal);

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SplitSquareHorizontal className="h-7 w-7" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">Smart Expense Calculator</h1>
              <p className="text-xs text-muted-foreground">Cleaner flow • Built-in help • Instant math</p>
            </div>
            <Badge variant="secondary" className="rounded-xl ml-2">Who Paid ≠ Who Owes</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={(v: Currency) => setCurrency(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                {(["PKR", "USD", "EUR", "GBP", "AED"] as Currency[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export PDF */}
            <Button onClick={exportPdf} variant="outline" className="gap-2"><FileDown className="h-4 w-4"/>Export PDF</Button>

            {/* Help Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><HelpCircle className="h-4 w-4"/>Help</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>How this calculator works</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="font-medium">Key idea</div>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Who paid</span> is tracked in <em>Paid By</em>. Multiple people can pay different amounts.</li>
                      <li><span className="font-medium text-foreground">How to split</span> is chosen in <em>Split Method</em> (Equal, Exact, Percent, Shares).</li>
                      <li>We compute each person’s <em>owed</em> share, compare with what they <em>paid</em>, and suggest settlements.</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border p-3 bg-white">
                    <div className="font-medium">What is a <em>Line Item</em>?</div>
                    <p className="text-muted-foreground mt-1">A line item is a single product/service within the bill (e.g., "Pizza", "USB cable"). Use it when different people bought different things and you want to charge exact amounts per person. If you’re splitting the whole bill equally, you usually <b>don’t need</b> line items.</p>
                    <div className="mt-2 text-xs text-muted-foreground">Tip: Turn on <b>Add Line Items</b> in Step 2, add items, and assign each item to its owner. When any item is assigned, we’ll auto-switch to <b>Exact</b> and split unassigned items equally.</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* MAIN GRID: Wizard (left) + Overview (right) */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: Wizard */}
          <div className="col-span-12 lg:col-span-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutPanelLeft className="h-5 w-5" /> Setup Wizard
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Progress value={0} className="h-2 w-48" />
                  <span className="text-xs text-muted-foreground">Follow the steps below</span>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {/* Step 1: People */}
                  <AccordionItem value="step1" defaultChecked>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600">1</Badge>
                        <span className="font-medium">Add People</span>
                        <span className="text-xs text-muted-foreground">(who's involved)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-3">
                        <div className="flex w-full gap-2 md:w-[420px]">
                          <Input
                            placeholder="Type a name and press Enter"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addPerson(newName);
                            }}
                          />
                          <Button onClick={() => addPerson(newName)}>
                            <Plus className="mr-1 h-4 w-4" />Add
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Toggle a person off if they didn't participate in this bill.</div>
                        <div className="flex flex-wrap gap-2">
                          <AnimatePresence>
                            {people.map((p) => (
                              <motion.div
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-1.5 shadow-sm"
                              >
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                  {p.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-medium">{p.name}</span>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Include</Label>
                                  <Switch
                                    checked={p.active !== false}
                                    onCheckedChange={(v) =>
                                      setPeople((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: v } : x)))
                                    }
                                  />
                                  <Button size="icon" variant="ghost" onClick={() => removePerson(p.id)} title="Remove">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 2: Amount & Items */}
                  <AccordionItem value="step2">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600">2</Badge>
                        <span className="font-medium">Bill Amount</span>
                        <span className="text-xs text-muted-foreground">(optional line items)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1 align-middle cursor-help"><HelpCircle className="inline h-4 w-4"/></span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">Use line items when different people ordered different things and should pay their exact items. If you're splitting equally, you can keep this off.</TooltipContent>
                          </Tooltip>
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Label className="min-w-[90px]">Total</Label>
                            <Input
                              type="number"
                              value={total}
                              onChange={(e) => setTotal(Number(e.target.value))}
                              disabled={useLineItems}
                              className="w-48"
                            />
                            <span className="text-sm text-muted-foreground">{currency}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Add Line Items</Label>
                            <Switch checked={useLineItems} onCheckedChange={setUseLineItems} />
                          </div>
                        </div>
                        {useLineItems && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div>Total from items</div>
                              <div className="font-medium">{fmt(totalFromItems, currency)}</div>
                            </div>
                            <div className="rounded-xl border bg-white p-3 text-xs text-muted-foreground">
                              Assign each item to its owner. <b>Assigned</b> amounts are billed exactly; any <b>unassigned</b> remainder is split equally among participants.
                            </div>
                            <div className="space-y-2">
                              {items.map((it) => (
                                <div key={it.id} className="grid grid-cols-12 items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
                                  <Input
                                    className="col-span-5"
                                    placeholder="Label"
                                    value={it.label}
                                    onChange={(e) =>
                                      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)))
                                    }
                                  />
                                  <Input
                                    className="col-span-3"
                                    type="number"
                                    placeholder="Amount"
                                    value={it.amount}
                                    onChange={(e) =>
                                      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, amount: Number(e.target.value) } : x)))
                                    }
                                  />
                                  <Select
                                    value={it.ownerId}
                                    onValueChange={(v) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ownerId: v } : x)))}
                                  >
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue placeholder="Assign to (Exact)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {activePeople.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} className="col-span-1 justify-self-end">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="secondary" onClick={addItem}>
                                <Plus className="mr-2 h-4 w-4" />Add line item
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 3: Paid By */}
                  <AccordionItem value="step3">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600">3</Badge>
                        <span className="font-medium">Who Paid</span>
                        <span className="text-xs text-muted-foreground">
                          (multiple payers supported)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="ml-1 align-middle"><HelpCircle className="inline h-4 w-4"/></button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">Enter how much each person actually paid. This is separate from how the bill should be split.</TooltipContent>
                          </Tooltip>
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {activePeople.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="rounded-lg px-2 py-1">
                                {p.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-44"
                                value={payersMap[p.id] || 0}
                                onChange={(e) => upsertPayer(p.id, Number(e.target.value))}
                              />
                              <span className="text-sm text-muted-foreground">{currency}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Step 4: Split Method */}
                  <AccordionItem value="step4">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600">4</Badge>
                        <span className="font-medium">How to Split</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-1 align-middle"><HelpCircle className="inline h-4 w-4"/></button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">Choose the rule for who owes what: Equal (same for everyone), Exact (per-person amounts or line items), Percent, or Shares.</TooltipContent>
                        </Tooltip>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Tabs value={method} onValueChange={(v) => setMethod(v as SplitMethod)}>
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="EQUAL" className="gap-2"><Scale className="h-4 w-4" />Equal</TabsTrigger>
                          <TabsTrigger value="EXACT" className="gap-2"><Receipt className="h-4 w-4" />Exact</TabsTrigger>
                          <TabsTrigger value="PERCENT" className="gap-2"><Percent className="h-4 w-4" />Percent</TabsTrigger>
                          <TabsTrigger value="SHARES" className="gap-2"><Sigma className="h-4 w-4" />Shares</TabsTrigger>
                        </TabsList>

                        <TabsContent value="EQUAL" className="mt-4 text-sm text-muted-foreground">
                          Everyone pays the same. Toggle participants in Step 1.
                        </TabsContent>

                        <TabsContent value="EXACT" className="mt-4">
                          <div className="mb-2 text-sm text-muted-foreground">
                            {useLineItems ? (
                              <>
                                Assigned total: <span className="font-medium text-foreground">{fmt(assignedSum, currency)}</span> · Unassigned: <span className="font-medium text-foreground">{fmt(unassignedAmount, currency)}</span> ({activeIds.length > 0 ? `${fmt(exactEachUnassigned, currency)} each` : ""})
                              </>
                            ) : (
                              <>Use line items (Step 2) to auto-fill, or type per-person exacts here.</>
                            )}
                          </div>
                          <div className="space-y-2">
                            {activePeople.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-lg px-2 py-1">
                                    {p.name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className="w-44"
                                    value={useLineItems ? (assignedForDisplay[p.id] || 0) + exactEachUnassigned : exactByPerson[p.id] || 0}
                                    onChange={(e) => setExactByPerson((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                                    disabled={useLineItems}
                                  />
                                  <span className="text-sm text-muted-foreground">{currency}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="PERCENT" className="mt-4">
                          <div className="space-y-2">
                            {activePeople.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-lg px-2 py-1">
                                    {p.name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className="w-36"
                                    value={percentByPerson[p.id] || 0}
                                    onChange={(e) => setPercentByPerson((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="SHARES" className="mt-4">
                          <div className="space-y-2">
                            {activePeople.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-lg px-2 py-1">
                                    {p.name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className="w-36"
                                    value={sharesByPerson[p.id] || 0}
                                    onChange={(e) => setSharesByPerson((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                                  />
                                  <span className="text-sm text-muted-foreground">shares</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Overview & Results */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Overview */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg"><Info className="h-5 w-5" /> Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted p-3">
                      <div className="text-muted-foreground">Expense</div>
                      <div className="text-lg font-semibold">{fmt(totalToShow, currency)}</div>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <div className="text-muted-foreground">Paid</div>
                      <div className="text-lg font-semibold">{fmt(paidTotal || 0, currency)}</div>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <div className="text-muted-foreground">Delta</div>
                      <div className={`text-lg font-semibold ${
                        Math.abs(payerDelta) < 0.01 ? "text-emerald-600" : payerDelta > 0 ? "text-amber-600" : "text-rose-600"
                      }`}>
                        {fmt(payerDelta, currency)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {Math.abs(payerDelta) < 0.01
                      ? "Payments match the total."
                      : payerDelta > 0
                      ? "Allocate the remaining amount in Who Paid."
                      : "Too much allocated in Who Paid."}
                  </div>
                </CardContent>
              </Card>

              {/* Per-Person Balances */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Balances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activePeople.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Add people to see balances.</div>
                  ) : (
                    <div className="space-y-2">
                      {activePeople.map((p) => {
                        const paid = payersMap[p.id] || 0;
                        const owes = owedByPerson[p.id] || 0;
                        const net = clamp2(paid - owes);
                        return (
                          <div key={p.id} className="flex items-center justify-between rounded-xl border bg-white p-2 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                {p.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="font-medium">{p.name}</div>
                            </div>
                            <div className={`font-semibold ${
                              net < -0.01 ? "text-rose-600" : net > 0.01 ? "text-emerald-600" : "text-slate-500"
                            }`}>
                              {fmt(net, currency)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Settlements */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg"><ArrowRightLeft className="h-5 w-5" /> Suggested Settlements</CardTitle>
                </CardHeader>
                <CardContent>
                  {transfers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No transfers needed. 🎉</div>
                  ) : (
                    <div className="space-y-2">
                      {transfers.map((t, idx) => {
                        const from = people.find((p) => p.id === t.from)?.name || "";
                        const to = people.find((p) => p.id === t.to)?.name || "";
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-xl border bg-white p-2 shadow-sm">
                            <div className="text-sm">
                              <span className="font-medium">{from}</span> ➜ <span className="font-medium">{to}</span>
                            </div>
                            <div className="font-semibold">{fmt(t.amount, currency)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    We compute net balances (paid − owes), then settle from debtors to creditors for minimal transfers.
                  </div>
                </CardContent>
              </Card>

              {/* Calculations (Audit) */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">Audit / Calculations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {useLineItems && (
                    <div>
                      <div className="mb-1 text-muted-foreground">Line items</div>
                      <div className="overflow-auto rounded-xl border">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2">Item</th>
                              <th className="p-2">Amount</th>
                              <th className="p-2">Assigned To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr><td className="p-2" colSpan={3}>No items</td></tr>
                            ) : (
                              items.map((it) => (
                                <tr key={it.id} className="border-t">
                                  <td className="p-2">{it.label || "—"}</td>
                                  <td className="p-2">{fmt(it.amount || 0, currency)}</td>
                                  <td className="p-2">{it.ownerId ? nameById(it.ownerId) : "Unassigned"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {method === "EXACT" && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Assigned total = <b>{fmt(assignedSum, currency)}</b> · Unassigned remainder = <b>{fmt(unassignedAmount, currency)}</b> → split equally among {activeIds.length} = <b>{fmt(exactEachUnassigned, currency)}</b> each
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="mb-1 text-muted-foreground">Per-person breakdown</div>
                    <div className="overflow-auto rounded-xl border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2">Person</th>
                            <th className="p-2">Assigned</th>
                            <th className="p-2">Unassigned Share</th>
                            <th className="p-2">Owes</th>
                            <th className="p-2">Paid</th>
                            <th className="p-2">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePeople.map((p) => {
                            const assigned = assignedForDisplay[p.id] || 0;
                            const unassigned = unassignedForDisplay[p.id] || 0;
                            const owes = owedByPerson[p.id] || 0;
                            const paid = payersMap[p.id] || 0;
                            const net = clamp2(paid - owes);
                            return (
                              <tr key={p.id} className="border-t">
                                <td className="p-2">{p.name}</td>
                                <td className="p-2">{fmt(assigned, currency)}</td>
                                <td className="p-2">{fmt(unassigned, currency)}</td>
                                <td className="p-2">{fmt(owes, currency)}</td>
                                <td className="p-2">{fmt(paid, currency)}</td>
                                <td className="p-2">{fmt(net, currency)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
