'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type {
  AIExpenseMode,
  ParsedExpenseData,
  CalculatorState,
  GroupAIContext,
} from '@/lib/types/ai-expense';
import { mapAIDataToCalculatorState, formatAIError, isConfidenceSufficient } from '@/lib/utils/ai-parser';
import { formatCurrency } from '@/lib/utils/expense-utils';

// ============================================
// Types
// ============================================

type AIExpenseInputProps = {
  mode: AIExpenseMode;
  groupMembers?: string[]; // Required for group mode
  onApply: (state: CalculatorState) => void;
};

type Step = 'context' | 'input' | 'preview';

// ============================================
// Component
// ============================================

export default function AIExpenseInput({
  mode,
  groupMembers = [],
  onApply,
}: AIExpenseInputProps) {
  // ============================================
  // State
  // ============================================

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<Step>('context');

  // Context setup (group mode)
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Input
  const [userInput, setUserInput] = useState('');

  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExpenseData | null>(null);

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation after render
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // ============================================
  // Handlers
  // ============================================

  const handleOpen = () => {
    setIsOpen(true);
    // For standalone mode, skip context setup
    if (mode === 'standalone') {
      setStep('input');
    } else {
      setStep('context');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsOpen(false);
      // Reset state
      setStep('context');
      setSelectedUser('');
      setSelectedMembers(new Set());
      setUserInput('');
      setError(null);
      setParsedData(null);
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleContextContinue = () => {
    // Validate context
    if (!selectedUser) {
      setError('Please select who you are');
      return;
    }
    if (selectedMembers.size === 0) {
      setError('Please select at least one member involved in this expense');
      return;
    }

    setError(null);
    setStep('input');
  };

  const toggleMember = (member: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(member)) {
      newSelected.delete(member);
    } else {
      newSelected.add(member);
    }
    setSelectedMembers(newSelected);
  };

  const handleGenerate = async () => {
    if (!userInput.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build context for group mode
      const context: GroupAIContext | undefined = mode === 'group' ? {
        userId: selectedUser,
        userName: selectedUser,
        involvedMembers: Array.from(selectedMembers),
      } : undefined;

      // Call API
      const response = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          userInput: userInput.trim(),
          context,
        }),
      });

      const data: ParsedExpenseData = await response.json();

      if (!data.success) {
        // Handle error from AI
        const validMembers = mode === 'group' ? Array.from(selectedMembers) : undefined;
        setError(formatAIError(data, validMembers));
        setIsLoading(false);
        return;
      }

      // Check confidence
      if (!isConfidenceSufficient(data)) {
        setError(`AI confidence is low (${(data.confidence * 100).toFixed(0)}%). Please review the preview carefully.`);
      }

      // Show preview
      setParsedData(data);
      setStep('preview');
    } catch (err: any) {
      console.error('Error calling AI API:', err);
      setError('Failed to connect to AI service. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedData) return;

    try {
      const calculatorState = mapAIDataToCalculatorState(parsedData, mode);
      onApply(calculatorState);
      handleClose();
    } catch (err: any) {
      console.error('Error mapping AI data:', err);
      setError('Failed to apply data. Please try again.');
    }
  };

  const handleTryExample = (example: string) => {
    setUserInput(example);
  };

  // ============================================
  // Render Helpers
  // ============================================

  const renderContextStep = () => (
    <div className="space-y-4">
      <div className="animated-content delay-200 text-sm text-slate-600 mb-4">
        Let's set up some context to help AI understand your expense better.
      </div>

      {/* Who are you? */}
      <div className="animated-content delay-300 space-y-2">
        <Label className="text-base font-semibold">Who are you?</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select yourself" />
          </SelectTrigger>
          <SelectContent>
            {groupMembers.map(member => (
              <SelectItem key={member} value={member}>
                {member}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This helps AI understand when you say "I" or "me"
        </p>
      </div>

      {/* Who's involved? */}
      <div className="animated-content delay-400 space-y-2">
        <Label className="text-base font-semibold">Who's involved in this expense?</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Select all members who are part of this expense
        </p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
          {groupMembers.map(member => (
            <label
              key={member}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedMembers.has(member)}
                onChange={() => toggleMember(member)}
                className="h-4 w-4"
              />
              <span className="text-sm">{member}</span>
              {selectedUser === member && (
                <Badge variant="secondary" className="ml-auto text-xs">You</Badge>
              )}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {selectedMembers.size} of {groupMembers.length}
        </p>
      </div>

      {error && (
        <div className="animated-content delay-500 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="animated-content delay-600">
        <Button onClick={handleContextContinue} className="w-full" size="lg">
          Continue to Describe Expense
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderInputStep = () => (
    <div className="space-y-4">
      {mode === 'group' && (
        <div className="animated-content delay-200 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <div>
            <span className="text-muted-foreground">You: </span>
            <span className="font-semibold">{selectedUser}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="text-muted-foreground">Involved: </span>
            <span className="font-semibold">{Array.from(selectedMembers).join(', ')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('context')}
            className="text-xs"
          >
            Change
          </Button>
        </div>
      )}

      <div className="animated-content delay-300 space-y-2">
        <Label htmlFor="ai-input" className="text-base font-semibold text-slate-900">
          Describe your expense
        </Label>
        <textarea
          id="ai-input"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={
            mode === 'group'
              ? "e.g., I paid 500 for dinner, split equally"
              : "e.g., Alice paid $150 for dinner, split equally between Alice, Bob, and Charlie"
          }
          className="w-full min-h-[120px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary text-base"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          {userInput.length}/500 characters
        </p>
      </div>

      {/* Example prompts */}
      <div className="animated-content delay-400 space-y-2">
        <Label className="text-sm font-semibold text-slate-900">Try these examples:</Label>
        <div className="flex flex-wrap gap-2">
          {mode === 'group' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTryExample('I paid 500, split equally')}
                disabled={isLoading}
                className="text-xs"
              >
                Simple split
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTryExample('I paid 800, Ali paid 200, split evenly')}
                disabled={isLoading}
                className="text-xs"
              >
                Multiple payers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTryExample('Pizza 300 for me, drinks 200 for everyone')}
                disabled={isLoading}
                className="text-xs"
              >
                Line items
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTryExample('Alice paid $150, split equally with Bob and Charlie')}
                disabled={isLoading}
                className="text-xs"
              >
                Equal split
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTryExample('Alice paid $80, Bob paid $70, split among 4 people')}
                disabled={isLoading}
                className="text-xs"
              >
                Multiple payers
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="animated-content delay-500 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="animated-content delay-600 flex gap-2">
        {mode === 'group' && (
          <Button
            variant="outline"
            onClick={() => setStep('context')}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !userInput.trim()}
          className="flex-1"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!parsedData) return null;

    return (
      <div className="space-y-4">
        <div className="animated-content delay-200 flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700">AI parsed your expense successfully</span>
          {parsedData.confidence < 0.9 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {(parsedData.confidence * 100).toFixed(0)}% confident
            </Badge>
          )}
        </div>

        <div className="animated-content delay-300 space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
          {/* People */}
          <div>
            <Label className="text-sm font-semibold text-slate-600">People</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parsedData.people.map((person, idx) => (
                <Badge key={idx} variant={person.active ? "default" : "outline"}>
                  {person.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Total */}
          <div>
            <Label className="text-sm font-semibold text-slate-600">Total Amount</Label>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              {formatCurrency(parsedData.total, parsedData.currency)}
            </div>
          </div>

          {/* Payers */}
          <div>
            <Label className="text-sm font-semibold text-slate-600">Who Paid</Label>
            <div className="space-y-1 mt-1">
              {parsedData.payers
                .filter(p => p.amount > 0)
                .map((payer, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{payer.name}</span>
                    <span className="text-muted-foreground"> paid </span>
                    <span className="font-semibold">
                      {formatCurrency(payer.amount, parsedData.currency)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Split Method */}
          <div>
            <Label className="text-sm font-semibold text-slate-600">Split Method</Label>
            <Badge variant="secondary" className="mt-1">
              {parsedData.splitMethod}
            </Badge>
          </div>

          {/* Line Items if applicable */}
          {parsedData.useLineItems && parsedData.items.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-slate-600">Items</Label>
              <div className="space-y-1 mt-1">
                {parsedData.items.map((item, idx) => (
                  <div key={idx} className="text-sm flex justify-between text-slate-900">
                    <span>
                      {item.label}
                      {item.ownerId && (
                        <span className="text-slate-600 text-xs ml-1">
                          (for {item.ownerId})
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(item.amount, parsedData.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="animated-content delay-400 flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="animated-content delay-500 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep('input');
              setError(null);
              setParsedData(null);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={handleApply} className="flex-1" size="lg">
            Apply to Calculator
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <>
      {/* Trigger Card */}
      <Card
        className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all border-2 border-dashed"
        onClick={handleOpen}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Quick Setup
            <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Describe your expense in plain language and let AI fill the calculator for you
          </p>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start text-primary">
            Try it now →
          </Button>
        </CardContent>
      </Card>

      {/* Custom Modal */}
      {isOpen && (
        <div
          className={`modal-backdrop fixed inset-0 bg-black/60 flex flex-col justify-end sm:items-center sm:justify-center z-50 ${isVisible ? 'modal-visible' : ''}`}
          onClick={handleBackdropClick}
        >
          <div className="modal-panel bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Drag Handle (mobile only) */}
            <div className="sm:hidden flex justify-center py-2 bg-white">
              <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="animated-content delay-100 flex items-start justify-between p-4 border-b border-slate-200 bg-white">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Quick Setup
                  <Badge variant="secondary" className="text-xs">Beta</Badge>
                </h2>
                <div className="text-sm text-slate-600 mt-1">
                  Describe your expense in natural language
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <div className="p-4">
                {step === 'context' && mode === 'group' && renderContextStep()}
                {step === 'input' && renderInputStep()}
                {step === 'preview' && renderPreviewStep()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
