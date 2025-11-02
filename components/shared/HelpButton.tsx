'use client';

import { HelpCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface HelpButtonProps {
  title: string;
  children: React.ReactNode;
  color?: string;
  ariaLabel?: string;
}

export default function HelpButton({ title, children, color = 'text-muted-foreground', ariaLabel }: HelpButtonProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: Use Dialog (tap to open modal)
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="flex-shrink-0 inline-flex items-center justify-center rounded-full hover:bg-accent active:bg-accent transition-colors touch-manipulation"
          style={{ minWidth: '36px', minHeight: '36px' }}
          aria-label={ariaLabel || `Help: ${title}`}
        >
          <HelpCircle className={`h-5 w-5 ${color}`} />
        </button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm">
                  {children}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Use Tooltip (hover to show)
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex-shrink-0 inline-flex items-center justify-center rounded-full hover:bg-accent transition-colors"
          style={{ minWidth: '36px', minHeight: '36px' }}
          aria-label={ariaLabel || `Help: ${title}`}
        >
          <HelpCircle className={`h-5 w-5 ${color}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold mb-1">{title}</p>
        <div className="text-sm">
          {children}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
