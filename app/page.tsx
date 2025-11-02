'use client';

import Link from 'next/link';
import { Calculator, Receipt, TrendingUp, Sparkles, Users, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import QuickAccessGroups from '@/components/home/QuickAccessGroups';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden">
      {/* Hero Section with Gradient Background */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 md:pt-32 md:pb-36">
        {/* Subtle animated background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.05),transparent_50%)]" />
        
        <div className="container mx-auto max-w-6xl">
          <div className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Floating icon with subtle animation */}
            <div className="mb-6 sm:mb-8 flex justify-center">
              <div className="relative group">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-emerald-500/20 blur-xl group-hover:blur-2xl transition-all duration-500" />
                <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-500/10 p-5 sm:p-6 backdrop-blur-sm border border-primary/10">
                  <Calculator className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                </div>
              </div>
            </div>

            {/* Main heading with better spacing */}
            <h1 className="mb-4 sm:mb-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Split bills
              </span>
              <br />
              <span className="bg-gradient-to-br from-primary via-primary to-emerald-600 bg-clip-text text-transparent">
                the smart way
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground/90 leading-relaxed mb-8 sm:mb-10 px-4">
              No more awkward money conversations. Calculate, split, and settle expenses with friends in seconds.
            </p>

            {/* CTA Button */}
            <Link href="/expense-calculator">
              <Button 
                size="lg" 
                className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Try it free
                <Sparkles className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </Link>

            {/* Social proof */}
            <p className="mt-6 text-sm text-muted-foreground/60">
              No sign-up required • Works offline • 100% free
            </p>
          </div>
        </div>
      </section>

      {/* Main Feature Cards */}
      <section className="px-4 pb-20 sm:pb-28">
        <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8">
          {/* Quick Access Groups */}
          <QuickAccessGroups />

          {/* Expense Splitter Card */}
          <Link href="/expense-calculator" className="block group">
            <div className="relative overflow-hidden rounded-3xl sm:rounded-[2rem] bg-gradient-to-br from-card to-card/80 border border-border/50 hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-xl">
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-emerald-500/5 transition-all duration-500" />

              <div className="relative p-6 sm:p-8 md:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3">
                        <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        Expense Splitter
                      </h2>
                    </div>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                      Split any expense fairly with multiple methods. Perfect for roommates, trips, or dinners out.
                    </p>

                    {/* Quick features */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                        <Zap className="h-3.5 w-3.5" />
                        Instant calculations
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-medium">
                        <Users className="h-3.5 w-3.5" />
                        Group friendly
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs sm:text-sm font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        PDF export
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="sm:flex-shrink-0 flex sm:flex-col items-center justify-end sm:justify-center">
                    <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <svg className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Group Expenses Card */}
          <Link href="/groups" className="block group">
            <div className="relative overflow-hidden rounded-3xl sm:rounded-[2rem] bg-gradient-to-br from-card to-card/80 border border-border/50 hover:border-emerald-500/30 transition-all duration-500 shadow-sm hover:shadow-xl">
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-blue-500/5 transition-all duration-500" />

              <div className="relative p-6 sm:p-8 md:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-500/10 p-3">
                        <Users className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        Group Expenses
                      </h2>
                    </div>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                      Track ongoing expenses with groups. Perfect for trips, roommates, or regular shared costs.
                    </p>

                    {/* Quick features */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-medium">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Auto-netting
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs sm:text-sm font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        Track history
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs sm:text-sm font-medium">
                        <Users className="h-3.5 w-3.5" />
                        Persistent storage
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="sm:flex-shrink-0 flex sm:flex-col items-center justify-end sm:justify-center">
                    <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/10 group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-300">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

