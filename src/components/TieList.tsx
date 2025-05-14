
"use client";

import React from 'react';
import type { Tie } from '@/lib/types';
import { TieCard } from './TieCard';

interface TieListProps {
  ties: Tie[];
  onEdit: (tie: Tie) => void;
  onDelete: (id: string) => void;
}

export function TieList({ ties, onEdit, onDelete }: TieListProps) {
  if (ties.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No ties to display for the current selection.</p>
        <p className="text-sm text-muted-foreground">Try a different category or search term, or add a new tie if your inventory is empty.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {ties.map((tie) => (
        <TieCard key={tie.id} tie={tie} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
