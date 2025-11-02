/**
 * OfflineTooltip Component
 * Wrapper that disables children when offline and shows tooltip
 */

'use client';

import { useOffline } from '@/hooks/use-offline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WifiOff } from 'lucide-react';

interface OfflineTooltipProps {
  children: React.ReactNode;
  message?: string;
  disableWhenOffline?: boolean;
  className?: string;
}

/**
 * Wraps children with offline detection and tooltip
 * Disables and shows tooltip when offline
 */
export function OfflineTooltip({
  children,
  message = 'This feature requires internet connection',
  disableWhenOffline = true,
  className = '',
}: OfflineTooltipProps) {
  const isOffline = useOffline();

  // If online, render children normally
  if (!isOffline) {
    return <>{children}</>;
  }

  // If offline but shouldn't disable, just render children
  if (!disableWhenOffline) {
    return <>{children}</>;
  }

  // If offline and should disable, wrap with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${className} relative`}>
            {/* Overlay to disable interactions */}
            <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[1px] rounded-lg cursor-not-allowed z-10" />
            
            {/* Disabled indicator */}
            <div className="absolute top-2 right-2 z-20">
              <WifiOff className="h-4 w-4 text-gray-400" />
            </div>

            {/* Children (visually disabled) */}
            <div className="opacity-40 pointer-events-none">
              {children}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{message}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simpler version that just disables button when offline
 * Use for buttons where tooltip is not needed
 */
export function OfflineDisabledButton({
  children,
  disabled = false,
  onClick,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const isOffline = useOffline();
  const isDisabled = disabled || isOffline;

  return (
    <button
      {...props}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={className}
      title={isOffline ? 'Offline - feature unavailable' : undefined}
    >
      {children}
      {isOffline && (
        <WifiOff className="h-3 w-3 ml-2 opacity-50" />
      )}
    </button>
  );
}
