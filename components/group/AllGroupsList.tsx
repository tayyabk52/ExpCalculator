'use client';

import { useState, useEffect } from 'react';
import { List, Loader2, Copy, Check, Calendar, Users, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllGroups, formatGroupCode } from '@/lib/utils/group-utils';
import type { Group } from '@/lib/types/group';
import { format } from 'date-fns';

export default function AllGroupsList() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation after render
      setTimeout(() => setIsVisible(true), 10);
      loadGroups();
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const loadGroups = async () => {
    setIsLoading(true);
    const data = await getAllGroups();
    setGroups(data);
    setIsLoading(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
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

  // Helper to get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex-col sm:flex-row gap-1 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-background/50 transition-all"
      >
        <List className="h-4 w-4" />
        <span className="text-[10px] sm:text-sm font-medium">All</span>
      </Button>

      {/* Custom Modal */}
      {isOpen && (
        <div
          className={`modal-backdrop fixed inset-0 bg-black/60 flex flex-col justify-end sm:items-center sm:justify-center z-50 ${isVisible ? 'modal-visible' : ''}`}
          onClick={handleBackdropClick}
        >
          <div className="modal-panel bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Drag Handle (mobile only) */}
            <div className="sm:hidden flex justify-center py-2 bg-white">
              <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="animated-content delay-100 flex items-start justify-between p-4 border-b border-slate-200 bg-white">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">All Groups</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Browse and access all available groups
                </p>
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
              <div className="p-4 space-y-3">
                {isLoading ? (
                  <div className="animated-content delay-200 flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="animated-content delay-200 text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                      <List className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No groups found</h3>
                    <p className="text-sm text-slate-600">
                      Create your first group to get started!
                    </p>
                  </div>
                ) : (
                  groups.map((group, index) => (
                    <div
                      key={group.id}
                      className="animated-content bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                      style={{ animationDelay: `${(index + 2) * 0.1}s` }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Group Avatar */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          {getInitials(group.name || 'Group')}
                        </div>

                        {/* Group Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 leading-tight break-words mb-1">
                            {group.name || 'Unnamed Group'}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(group.created_at), 'MMM d, yyyy')}</span>
                          </div>

                          <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
                            <span className="text-xs font-mono font-medium text-slate-700">
                              {formatGroupCode(group.code)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => copyToClipboard(group.code)}
                            className={`p-2 rounded-lg transition-all ${
                              copiedCode === group.code
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title={copiedCode === group.code ? 'Copied!' : 'Copy code'}
                          >
                            {copiedCode === group.code ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => window.location.href = `/groups/${group.code}/history`}
                            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="View history"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            {groups.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                <p className="text-sm text-slate-600 text-center">
                  {groups.length} group{groups.length !== 1 ? 's' : ''} available
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
