'use client';

import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pinGroup, unpinGroup, isGroupPinned, getMaxPinnedLimit } from '@/lib/utils/pinned-groups';
import { Button } from '@/components/ui/button';

type PinGroupButtonProps = {
  groupCode: string;
  groupName: string;
  variant?: 'icon' | 'button';
  onPinChange?: (isPinned: boolean) => void;
};

export default function PinGroupButton({ 
  groupCode, 
  groupName,
  variant = 'icon',
  onPinChange,
}: PinGroupButtonProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setIsPinned(isGroupPinned(groupCode));
  }, [groupCode]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    
    try {
      if (isPinned) {
        const success = unpinGroup(groupCode);
        if (success) {
          setIsPinned(false);
          showNotification('Removed from Quick Access', 'success');
          onPinChange?.(false);
        } else {
          showNotification('Failed to unpin group', 'error');
        }
      } else {
        const success = pinGroup({ code: groupCode, name: groupName });
        if (success) {
          setIsPinned(true);
          showNotification('Added to Quick Access', 'success');
          onPinChange?.(true);
        } else {
          showNotification(`Maximum ${getMaxPinnedLimit()} groups can be pinned`, 'error');
        }
      }
    } catch (error) {
      showNotification('Failed to update pin status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={handleTogglePin}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={`
            flex items-center gap-2 transition-all
            ${isPinned 
              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }
          `}
        >
          <Star 
            className={`h-4 w-4 transition-all ${
              isPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
            }`}
          />
          <span className="text-xs sm:text-sm font-medium">
            {isPinned ? 'Pinned' : 'Pin to Quick Access'}
          </span>
        </Button>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className={`
              px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-medium
              ${toastType === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-red-50 border-red-200 text-red-700'
              }
            `}>
              {toastType === 'success' ? '✓' : '✕'} {toastMessage}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleTogglePin}
        disabled={isLoading}
        aria-label={isPinned ? 'Unpin group' : 'Pin to Quick Access'}
        className="rounded-full p-2 hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        <Star 
          className={`h-5 w-5 transition-all ${
            isPinned 
              ? 'fill-amber-500 text-amber-500' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        />
      </button>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`
            px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-medium
            ${toastType === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-700'
            }
          `}>
            {toastType === 'success' ? '✓' : '✕'} {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}
