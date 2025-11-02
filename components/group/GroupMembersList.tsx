'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { GroupMember } from '@/lib/types/group';

type GroupMembersListProps = {
  members: GroupMember[];
  className?: string;
};

export default function GroupMembersList({ members, className = '' }: GroupMembersListProps) {
  if (members.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">No members yet</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Members ({members.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <Badge
              key={member.id}
              variant="secondary"
              className="px-3 py-1.5 text-sm"
            >
              {member.name}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
