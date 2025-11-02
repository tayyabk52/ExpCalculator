'use client';

import { useState } from 'react';
import { Users, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { createGroup } from '@/lib/utils/group-utils';
import type { Group } from '@/lib/types/group';

type GroupCreatorProps = {
  onGroupCreated?: (group: Group) => void;
  onCancel?: () => void;
};

export default function GroupCreator({ onGroupCreated, onCancel }: GroupCreatorProps) {
  const [groupName, setGroupName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;

    // Check for duplicates (case-insensitive)
    const lowerMembers = members.map(m => m.toLowerCase());
    if (lowerMembers.includes(trimmed.toLowerCase())) {
      setError('Member already added');
      return;
    }

    setMembers([...members, trimmed]);
    setMemberInput('');
    setError(null);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMember();
    }
  };

  const handleCreateGroup = async () => {
    if (members.length === 0) {
      setError('Please add at least one member');
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createGroup(
      groupName.trim() || null,
      members
    );

    if ('error' in result) {
      setError(result.error);
      setIsCreating(false);
    } else {
      setIsCreating(false);
      onGroupCreated?.(result.group);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Create New Group</h2>
              <p className="text-sm text-muted-foreground">
                Add members to start tracking shared expenses
              </p>
            </div>
          </div>

          {/* Group Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name (Optional)</Label>
            <Input
              id="group-name"
              placeholder="e.g., Weekend Trip, Roommates, Office Lunch"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {/* Add Members */}
          <div className="space-y-2">
            <Label htmlFor="member-name">Add Members *</Label>
            <div className="flex gap-2">
              <Input
                id="member-name"
                placeholder="Enter member name"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isCreating}
              />
              <Button
                type="button"
                onClick={addMember}
                disabled={!memberInput.trim() || isCreating}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or click + to add a member
            </p>
          </div>

          {/* Members List */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Members ({members.length})</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm"
                  >
                    <span>{member}</span>
                    <button
                      onClick={() => removeMember(index)}
                      disabled={isCreating}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || members.length === 0}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Group...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium">What happens next?</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>A unique 6-digit group code will be generated</li>
              <li>Share the code with group members to access expenses</li>
              <li>You can add more members later when creating expenses</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
