import { useMemo } from 'react';
import type { Person, SplitMethod, LineItem, Payer } from '@/lib/types/expense';
import { clamp2, settleDebts } from '@/lib/utils/expense-utils';

export function useExpenseCalculations(
  people: Person[],
  method: SplitMethod,
  useLineItems: boolean,
  items: LineItem[],
  total: number,
  payers: Payer[],
  exactByPerson: Record<string, number>,
  percentByPerson: Record<string, number>,
  sharesByPerson: Record<string, number>
) {
  const activePeople = people.filter((p) => p.active !== false);
  const activeIds = activePeople.map((p) => p.id);

  const nameById = (id?: string) =>
    id ? people.find((p) => p.id === id)?.name ?? "—" : "—";

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
      if (it.ownerId) {
        map[it.ownerId] = clamp2(
          (map[it.ownerId] || 0) + (isFinite(it.amount) ? it.amount : 0)
        );
      }
    });
    return map;
  }, [items]);

  const totalToUse = useLineItems ? totalFromItems : total;

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
    const result: Record<string, number> = Object.fromEntries(
      ids.map((id) => [id, 0])
    );

    if (totalToUse <= 0 || ids.length === 0) return result;

    switch (method) {
      case "EQUAL": {
        const each = clamp2(totalToUse / ids.length);
        ids.forEach((id) => (result[id] = each));
        return result;
      }
      case "EXACT": {
        if (useLineItems) {
          const eachUnassigned = clamp2(unassignedAmount / ids.length);
          ids.forEach((id) => {
            const assigned = lineItemExactByPerson[id] || 0;
            result[id] = clamp2(assigned + eachUnassigned);
          });
          return result;
        }
        const sum = clamp2(ids.reduce((s, id) => s + (exactByPerson[id] || 0), 0));
        if (sum === 0) return result;
        const factor = totalToUse > 0 ? totalToUse / sum : 1;
        ids.forEach((id) => (result[id] = clamp2((exactByPerson[id] || 0) * factor)));
        return result;
      }
      case "PERCENT": {
        const pctSum = ids.reduce((s, id) => s + (percentByPerson[id] || 0), 0);
        if (pctSum <= 0) return result;
        ids.forEach(
          (id) =>
            (result[id] = clamp2(totalToUse * ((percentByPerson[id] || 0) / pctSum)))
        );
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
  }, [
    activePeople,
    method,
    exactByPerson,
    percentByPerson,
    sharesByPerson,
    lineItemExactByPerson,
    totalToUse,
    useLineItems,
    unassignedAmount,
  ]);

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

  const exactEachUnassigned = useMemo(
    () =>
      method === "EXACT" && useLineItems && activeIds.length
        ? clamp2(unassignedAmount / activeIds.length)
        : 0,
    [method, useLineItems, unassignedAmount, activeIds.length]
  );

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
      else if (method === "EQUAL") result[id] = owedByPerson[id] || 0;
      else result[id] = 0;
    });
    return result;
  }, [activeIds, method, useLineItems, exactEachUnassigned, owedByPerson]);

  return {
    activePeople,
    activeIds,
    nameById,
    totalFromItems,
    totalToUse,
    payersMap,
    paidTotal,
    assignedSum,
    unassignedAmount,
    owedByPerson,
    balances,
    transfers,
    exactEachUnassigned,
    assignedForDisplay,
    unassignedForDisplay,
    lineItemExactByPerson,
  };
}
