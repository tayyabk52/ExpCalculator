'use client';

import { useState } from 'react';
import { List, Loader2, Copy, Check, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getAllGroups, formatGroupCode } from '@/lib/utils/group-utils';
import type { Group } from '@/lib/types/group';
import { format } from 'date-fns';

export default function AllGroupsList() {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadGroups = async () => {
    setIsLoading(true);
    const data = await getAllGroups();
    setGroups(data);
    setIsLoading(false);
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadGroups();
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-col sm:flex-row gap-1 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-background/50 data-[state=open]:bg-background data-[state=open]:shadow-md transition-all"
        >
          <List className="h-4 w-4" />
          <span className="text-[10px] sm:text-sm font-medium">All</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">All Groups</DialogTitle>
          <DialogDescription>
            Browse all available groups. Click the copy button to copy the group code.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No groups found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first group to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Group Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg leading-tight break-words">
                          {group.name || 'Unnamed Group'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Created {format(new Date(group.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Code Display */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="font-mono text-base px-3 py-1"
                        >
                          {formatGroupCode(group.code)}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={copiedCode === group.code ? 'default' : 'outline'}
                        onClick={() => copyToClipboard(group.code)}
                        className="gap-2 min-w-[100px]"
                      >
                        {copiedCode === group.code ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.location.href = `/groups/${group.code}`}
                        className="min-w-[100px]"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Found {groups.length} group{groups.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
