'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPinnedGroups, formatRelativeTime, updateLastVisited } from '@/lib/utils/pinned-groups';
import type { PinnedGroup } from '@/lib/types/pinned-groups';
import { Users, ArrowRight, Star, Sparkles } from 'lucide-react';

export default function QuickAccessGroups() {
  const [pinnedGroups, setPinnedGroups] = useState<PinnedGroup[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setPinnedGroups(getPinnedGroups());
  }, []);

  // Don't render anything until mounted (avoid hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Don't show section if no pinned groups
  if (pinnedGroups.length === 0) {
    return null;
  }

  const handleGroupClick = (code: string) => {
    updateLastVisited(code);
    router.push(`/groups/${code}`);
  };

  return (
    <div className="mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <Sparkles className="h-3 w-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quick Access
          </h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Your pinned groups for quick access
      </p>
      
      {/* Pinned Groups Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pinnedGroups.map((group, index) => (
          <button
            key={group.code}
            onClick={() => handleGroupClick(group.code)}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 transition-all hover:shadow-md hover:shadow-emerald-100/50 hover:border-emerald-300 hover:-translate-y-0.5 w-full text-left"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Gradient Background Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-300"></div>
            
            {/* Content */}
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm group-hover:shadow-md transition-shadow">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  
                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate group-hover:text-emerald-700 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {group.code}
                    </p>
                  </div>
                </div>
                
                {/* Arrow Icon */}
                <ArrowRight className="h-5 w-5 text-slate-400 transition-all group-hover:text-emerald-600 group-hover:translate-x-1 flex-shrink-0" />
              </div>
              
              {/* Last Visited */}
              {group.lastVisited && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  <span>Last visited {formatRelativeTime(group.lastVisited)}</span>
                </div>
              )}

              {/* Pin Badge */}
              <div className="absolute top-0 right-0">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Helpful Tip */}
      <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Tip:</span> Pin your favorite groups by clicking the star icon on any group page. Maximum {getPinnedGroups().length === 5 ? 'reached!' : '5 groups.'}
        </p>
      </div>
    </div>
  );
}
