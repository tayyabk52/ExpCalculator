'use client';

import { useState } from 'react';
import { Filter, X, Calendar, User, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Currency } from '@/lib/types/expense';

export interface HistoryFiltersState {
  // Date filters
  dateFrom: string;
  dateTo: string;
  
  // Member filter
  selectedMember: string;
  
  // Amount filters
  minAmount: string;
  maxAmount: string;
  
  // Settlement status (for settlements tab)
  settlementStatus: 'all' | 'open' | 'closed';
  
  // Sort options
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

interface HistoryFiltersProps {
  filters: HistoryFiltersState;
  onFiltersChange: (filters: HistoryFiltersState) => void;
  members: string[];
  currency: Currency;
}

export default function HistoryFilters({
  filters,
  onFiltersChange,
  members,
  currency,
}: HistoryFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof HistoryFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      selectedMember: '',
      minAmount: '',
      maxAmount: '',
      settlementStatus: 'all',
      sortBy: 'date-desc',
    });
  };

  const activeFiltersCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.selectedMember,
    filters.minAmount,
    filters.maxAmount,
    filters.settlementStatus !== 'all' ? 'status' : '',
  ].filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter & Sort</DialogTitle>
          <DialogDescription>
            Refine your expense and settlement history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Date Range</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Member Filter */}
          {members.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold">Filter by Member</Label>
              </div>
              <Select
                value={filters.selectedMember || "all"}
                onValueChange={(value) => handleFilterChange('selectedMember', value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Amount Range ({currency})</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground">
                  Min
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  className="h-9"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground">
                  Max
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="Any"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  className="h-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Settlement Status Filter */}
          <div className="space-y-3">
            <Label className="font-semibold">Settlement Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'open', 'closed'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filters.settlementStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('settlementStatus', status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Sort By</Label>
            </div>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange('sortBy', value as HistoryFiltersState['sortBy'])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="flex-1 gap-2"
              disabled={activeFiltersCount === 0}
            >
              <X className="h-4 w-4" />
              Reset All
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
