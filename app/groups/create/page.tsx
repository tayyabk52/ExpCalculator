'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GroupCreator from '@/components/group/GroupCreator';
import type { Group } from '@/lib/types/group';

export default function CreateGroupPage() {
  const router = useRouter();

  const handleGroupCreated = (group: Group) => {
    // Redirect to the group calculator
    router.push(`/groups/${group.code}`);
  };

  const handleCancel = () => {
    router.push('/groups');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Main Content */}
        <GroupCreator
          onGroupCreated={handleGroupCreated}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
