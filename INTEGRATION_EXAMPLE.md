# AI Feature Integration Example

This document provides a complete example of how to integrate the AI Natural Language Input feature into your group calculator page.

---

## Integration into Group Calculator

### File: `app/groups/[code]/page.tsx`

Here's how to add the AI component to your existing group calculator:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AIExpenseInput from '@/components/expense/AIExpenseInput';
import type { CalculatorState } from '@/lib/types/ai-expense';
import type { Person, Currency, LineItem, Payer, SplitMethod } from '@/lib/types/expense';
import { getGroupMembers } from '@/lib/utils/group-utils';

// ... your existing imports

export default function GroupCalculatorPage() {
  const params = useParams();
  const groupCode = params.code as string;

  // ============================================
  // Existing State (your calculator state)
  // ============================================

  const [people, setPeople] = useState<Person[]>([]);
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [total, setTotal] = useState(0);
  const [useLineItems, setUseLineItems] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [method, setMethod] = useState<SplitMethod>('EQUAL');
  const [exactByPerson, setExactByPerson] = useState<Record<string, number>>({});
  const [percentByPerson, setPercentByPerson] = useState<Record<string, number>>({});
  const [sharesByPerson, setSharesByPerson] = useState<Record<string, number>>({});

  // ============================================
  // NEW: State for AI feature
  // ============================================

  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // ============================================
  // NEW: Fetch group members for AI
  // ============================================

  useEffect(() => {
    async function fetchMembers() {
      try {
        // Fetch members from your database
        // This example uses your existing getGroupMembers function
        const group = await getGroupByCode(groupCode);
        if (group) {
          const members = await getGroupMembers(group.id);
          const memberNames = members.map(m => m.name);
          setGroupMembers(memberNames);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    }

    fetchMembers();
  }, [groupCode]);

  // ============================================
  // NEW: Handler for AI-generated data
  // ============================================

  const handleAIApply = (state: CalculatorState) => {
    console.log('Applying AI-generated state:', state);

    // Apply all the state from AI to your calculator
    setPeople(state.people);
    setCurrency(state.currency);
    setTotal(state.total);
    setUseLineItems(state.useLineItems);
    setItems(state.items);
    setPayers(state.payers);
    setMethod(state.method);
    setExactByPerson(state.exactByPerson);
    setPercentByPerson(state.percentByPerson);
    setSharesByPerson(state.sharesByPerson);

    // Optional: Show success message
    // toast.success('Expense filled from AI!');

    // Optional: Scroll to show the filled calculator
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">

        <h1 className="text-2xl font-bold mb-6">Group Expense Calculator</h1>

        {/* ============================================ */}
        {/* NEW: AI Input Component                       */}
        {/* Place this at the top, before calculator      */}
        {/* ============================================ */}

        {!isLoadingMembers && groupMembers.length > 0 && (
          <div className="mb-6">
            <AIExpenseInput
              mode="group"
              groupMembers={groupMembers}
              onApply={handleAIApply}
            />
          </div>
        )}

        {/* ============================================ */}
        {/* Your existing calculator components           */}
        {/* ============================================ */}

        <div className="space-y-4">
          <PeopleManager people={people} setPeople={setPeople} />

          <BillAmountSection
            total={total}
            setTotal={setTotal}
            useLineItems={useLineItems}
            setUseLineItems={setUseLineItems}
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            people={people}
            currency={currency}
            calculations={calculations}
          />

          {/* ... rest of your calculator */}
        </div>
      </div>
    </div>
  );
}
```

---

## Alternative: Conditional Rendering

If you only want to show AI input after members are added:

```typescript
{people.length > 0 ? (
  <AIExpenseInput
    mode="group"
    groupMembers={people.map(p => p.name)}
    onApply={handleAIApply}
  />
) : (
  <div className="p-4 border rounded-lg bg-muted/20 text-sm text-muted-foreground">
    Add members first to use AI Quick Setup
  </div>
)}
```

---

## Integration into Standalone Calculator

### File: `app/expense-calculator/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import AIExpenseInput from '@/components/expense/AIExpenseInput';
import type { CalculatorState } from '@/lib/types/ai-expense';

export default function ExpenseCalculatorPage() {
  // Your existing state
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  // ... etc

  const handleAIApply = (state: CalculatorState) => {
    // Apply state from AI
    setPeople(state.people);
    setTotal(state.total);
    setCurrency(state.currency);
    // ... etc
  };

  return (
    <div className="container mx-auto p-4">
      {/* AI Input - No groupMembers needed for standalone */}
      <AIExpenseInput
        mode="standalone"
        onApply={handleAIApply}
      />

      {/* Your calculator */}
      <div className="mt-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

---

## UI Placement Options

### Option 1: Top of Page (Recommended)
Place AI input prominently at the top, above all calculator sections.

**Pros**: Most visible, encourages usage
**Cons**: Takes space even if not used

```tsx
<div className="space-y-6">
  <AIExpenseInput ... />
  <PeopleManager ... />
  <BillAmountSection ... />
</div>
```

### Option 2: Floating Button
Add a floating action button in the corner.

```tsx
<div className="fixed bottom-6 right-6 z-50">
  <AIExpenseInput ... />
</div>
```

### Option 3: Collapsible Section
Start collapsed, expand on click.

```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="ai">
    <AccordionTrigger>
      <Sparkles className="mr-2" /> Try AI Quick Setup
    </AccordionTrigger>
    <AccordionContent>
      <AIExpenseInput ... />
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## Custom Styling

### Make it Stand Out

```tsx
<div className="relative">
  {/* Highlight effect */}
  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-lg blur-lg animate-pulse" />

  {/* AI Input */}
  <div className="relative">
    <AIExpenseInput ... />
  </div>
</div>
```

### Add Animation

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <AIExpenseInput ... />
</motion.div>
```

---

## Error Handling in Parent

### Show Toast Notifications

```typescript
import { toast } from 'sonner'; // or your toast library

const handleAIApply = (state: CalculatorState) => {
  try {
    // Apply state
    setPeople(state.people);
    setTotal(state.total);
    // ... etc

    // Show success
    toast.success('Calculator filled from AI!', {
      description: `${state.people.length} people, ${state.currency} ${state.total}`,
    });
  } catch (error) {
    console.error('Error applying AI state:', error);
    toast.error('Failed to apply AI data. Please try manually.');
  }
};
```

### Validate Before Applying

```typescript
const handleAIApply = (state: CalculatorState) => {
  // Validate people
  if (state.people.length === 0) {
    toast.error('No people in AI result');
    return;
  }

  // Validate total
  if (state.total <= 0) {
    toast.error('Invalid total amount');
    return;
  }

  // Validate payers match people
  const peopleIds = new Set(state.people.map(p => p.id));
  const validPayers = state.payers.filter(p => peopleIds.has(p.id));

  if (validPayers.length !== state.payers.length) {
    console.warn('Some payers were invalid and removed');
  }

  // Apply state
  setPeople(state.people);
  setPayers(validPayers);
  // ... etc
};
```

---

## Advanced: Track AI Usage

### Analytics

```typescript
const handleAIApply = (state: CalculatorState) => {
  // Track usage (Google Analytics, Mixpanel, etc.)
  gtag('event', 'ai_expense_applied', {
    event_category: 'AI Feature',
    event_label: 'Group Mode',
    value: state.people.length,
  });

  // Apply state
  setPeople(state.people);
  // ... etc
};
```

### Local Storage

```typescript
const handleAIApply = (state: CalculatorState) => {
  // Save usage count
  const usageCount = parseInt(localStorage.getItem('ai_usage_count') || '0');
  localStorage.setItem('ai_usage_count', String(usageCount + 1));

  // Show milestone
  if (usageCount + 1 === 10) {
    toast.success('You've used AI 10 times! 🎉');
  }

  // Apply state
  setPeople(state.people);
  // ... etc
};
```

---

## Testing Your Integration

### Checklist

After integration, test the following:

- [ ] Component renders at correct location
- [ ] Group members are fetched and displayed
- [ ] Context selection works (group mode)
- [ ] Natural language input is processed
- [ ] Preview shows correct data
- [ ] Apply button populates calculator
- [ ] All calculator fields are filled correctly
- [ ] Error messages display properly
- [ ] Mobile layout works
- [ ] Can cancel and reopen
- [ ] Multiple uses work correctly

### Test Cases

**Test Case 1: Simple Equal Split**
```
Input: "I paid 500, split equally"
Expected:
- All selected members added
- Total: 500 PKR
- Payer: Selected user (500)
- Method: EQUAL
```

**Test Case 2: Multiple Payers**
```
Input: "I paid 800, Ali paid 200, split evenly"
Expected:
- All selected members added
- Total: 1000 PKR
- Payers: User (800), Ali (200)
- Method: EQUAL
```

**Test Case 3: Line Items**
```
Input: "Pizza 300 for me, drinks 200 for everyone"
Expected:
- useLineItems: true
- Items: Pizza (300, assigned to user), Drinks (200, unassigned)
- Total: 500 PKR
```

---

## Troubleshooting Integration

### Issue: Component not showing

**Fix**:
```typescript
// Add console log to check
useEffect(() => {
  console.log('Group members:', groupMembers);
}, [groupMembers]);
```

### Issue: Members not loading

**Fix**:
```typescript
// Check if getGroupMembers is async
const members = await getGroupMembers(group.id);
console.log('Fetched members:', members);
```

### Issue: onApply not working

**Fix**:
```typescript
const handleAIApply = (state: CalculatorState) => {
  console.log('AI Apply called with:', state);

  // Verify state has data
  if (!state.people || state.people.length === 0) {
    console.error('Invalid state from AI');
    return;
  }

  // Apply state
  setPeople(state.people);
  // ... etc
};
```

---

## Next Steps

1. **Add AI component to your page** using the examples above
2. **Test with different inputs** to ensure parsing works
3. **Customize styling** to match your design
4. **Add error handling** for edge cases
5. **Track usage** with analytics
6. **Gather user feedback** to improve prompts

---

**Need help? Check the main [AI_FEATURE_README.md](./AI_FEATURE_README.md) for detailed documentation.**
