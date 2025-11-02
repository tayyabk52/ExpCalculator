'use client';

import { useState } from 'react';
import { History, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGroupByCode, getGroupMembers, normalizeGroupCode, formatGroupCode } from '@/lib/utils/group-utils';
import type { Group, GroupMember } from '@/lib/types/group';

export default function GroupHistorySelector() {
  const [codeInput, setCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundGroup, setFoundGroup] = useState<{ group: Group; members: GroupMember[] } | null>(null);

  const handleSearch = async () => {
    const code = normalizeGroupCode(codeInput);

    if (code.length !== 6) {
      setError('Group code must be 6 characters');
      return;
    }

    setIsSearching(true);
    setError(null);
    setFoundGroup(null);

    try {
      const group = await getGroupByCode(code);

      if (!group) {
        setError('Group not found. Please check the code and try again.');
        setIsSearching(false);
        return;
      }

      const members = await getGroupMembers(group.id);

      setFoundGroup({ group, members });
      setIsSearching(false);

      // Auto-redirect to history page after a short delay
      setTimeout(() => {
        window.location.href = `/groups/${group.code}/history`;
      }, 1500);
    } catch (err) {
      setError('An error occurred while searching for the group');
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format and limit to 6 characters
    const value = normalizeGroupCode(e.target.value).slice(0, 6);
    setCodeInput(value);
    setError(null);
    setFoundGroup(null);
  };

  const goToHistory = () => {
    if (foundGroup) {
      window.location.href = `/groups/${foundGroup.group.code}/history`;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">View Group History</h2>
              <p className="text-sm text-muted-foreground">
                Enter a group code to view expenses and settlements
              </p>
            </div>
          </div>

          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="history-group-code">Group Code</Label>
            <div className="flex gap-2">
              <Input
                id="history-group-code"
                placeholder="e.g., A3X9K2"
                value={codeInput}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className="text-lg font-mono tracking-wider uppercase"
                maxLength={6}
              />
              <Button
                onClick={handleSearch}
                disabled={codeInput.length !== 6 || isSearching}
                size="lg"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <History className="mr-2 h-4 w-4" />
                    View
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the 6-character code to access group history
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Found Group */}
          {foundGroup && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-lg">Group Found!</span>
                  </div>
                  {foundGroup.group.name && (
                    <p className="text-sm font-medium">{foundGroup.group.name}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-lg font-mono">
                  {formatGroupCode(foundGroup.group.code)}
                </Badge>
              </div>

              {/* Members */}
              {foundGroup.members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Members ({foundGroup.members.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {foundGroup.members.map((member) => (
                      <Badge key={member.id} variant="outline" className="text-sm">
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Redirecting to history page...
              </p>
            </div>
          )}

          {/* Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium">What you'll see:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>All expenses for this group</li>
              <li>Net settlements with auto-netting</li>
              <li>Member balances and summaries</li>
              <li>Mark settlements as paid</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
