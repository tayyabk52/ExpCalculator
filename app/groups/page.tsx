'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupCreator from '@/components/group/GroupCreator';
import GroupSelector from '@/components/group/GroupSelector';
import GroupHistorySelector from '@/components/group/GroupHistorySelector';
import AllGroupsList from '@/components/group/AllGroupsList';
import type { Group } from '@/lib/types/group';

export default function GroupsPage() {
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  const handleGroupCreated = (group: Group) => {
    setCreatedGroup(group);
    setTimeout(() => {
      window.location.href = `/groups/${group.code}`;
    }, 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-emerald-500/5">
      <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {createdGroup ? (
          /* Success State */
          <div className="max-w-lg mx-auto">
            <Card className="overflow-hidden border-2 border-green-500/20 shadow-xl">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 sm:p-8">
                <div className="text-center space-y-5">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-green-500/10 p-4 ring-4 ring-green-500/20">
                      <Users className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Group Created!</h2>
                    {createdGroup.name && (
                      <p className="text-lg font-medium text-muted-foreground mb-3">{createdGroup.name}</p>
                    )}
                  </div>

                  <div className="inline-block px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-2 border-green-500 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your Group Code</p>
                    <p className="text-4xl sm:text-5xl font-bold font-mono tracking-wider text-green-600 dark:text-green-400">
                      {createdGroup.code}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Share this code with your group members</p>
                    <p className="text-xs text-muted-foreground animate-pulse">Redirecting to calculator...</p>
                  </div>

                  <Link href={`/groups/${createdGroup.code}`}>
                    <Button size="lg" className="w-full gap-2 shadow-lg hover:shadow-xl transition-all">
                      Go to Group Calculator
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/30 shadow-lg">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  Group Expenses
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Manage shared expenses with your groups
                </p>
              </div>
            </div>

            {/* Main Tabs */}
            <Card className="overflow-hidden shadow-lg border-2">
              <Tabs defaultValue="create" className="w-full">
                {/* Mobile-optimized Tab Navigation */}
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 border-b">
                  <div className="overflow-x-auto scrollbar-hide">
                    <TabsList className="w-full inline-flex h-auto p-1 sm:p-1.5 gap-1 sm:gap-2 bg-transparent">
                      <TabsTrigger
                        id="create-tab"
                        value="create"
                        className="flex-1 min-w-[80px] sm:min-w-[100px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=inactive]:hover:bg-background/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                          <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
                          <span className="text-[10px] sm:text-sm font-medium">Create</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        id="join-tab"
                        value="join"
                        className="flex-1 min-w-[80px] sm:min-w-[100px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=inactive]:hover:bg-background/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                          <Search className="h-4 w-4 sm:h-4 sm:w-4" />
                          <span className="text-[10px] sm:text-sm font-medium">Join</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        id="history-tab"
                        value="history"
                        className="flex-1 min-w-[80px] sm:min-w-[100px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=inactive]:hover:bg-background/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                          <History className="h-4 w-4 sm:h-4 sm:w-4" />
                          <span className="text-[10px] sm:text-sm font-medium">History</span>
                        </div>
                      </TabsTrigger>
                      <div className="flex items-center pl-1 sm:pl-2">
                        <AllGroupsList />
                      </div>
                    </TabsList>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <TabsContent value="create" className="mt-0">
                    <GroupCreator onGroupCreated={handleGroupCreated} />
                  </TabsContent>

                  <TabsContent value="join" className="mt-0">
                    <GroupSelector autoNavigate />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <GroupHistorySelector />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>

            {/* Helper Text */}
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Groups let you track shared expenses with auto-netting settlements
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
