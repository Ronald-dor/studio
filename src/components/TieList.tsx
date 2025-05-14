"use client";

import React from 'react';
import type { Tie, TieCategory } from '@/lib/types';
import { TieCard } from './TieCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TieListProps {
  ties: Tie[];
  onEdit: (tie: Tie) => void;
  onDelete: (id: string) => void;
}

export function TieList({ ties, onEdit, onDelete }: TieListProps) {
  if (ties.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No ties in your inventory yet.</p>
        <p className="text-sm text-muted-foreground">Click "Add New Tie" to get started!</p>
      </div>
    );
  }

  const tiesByCategory = ties.reduce((acc, tie) => {
    const category = tie.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tie);
    return acc;
  }, {} as Record<TieCategory, Tie[]>);

  return (
    <div className="space-y-8">
      {Object.entries(tiesByCategory).map(([category, categoryTies]) => {
        const categoryTotalValue = categoryTies.reduce((sum, tie) => sum + (tie.quantity * tie.unitPrice), 0);
        return (
          <section key={category} aria-labelledby={`category-title-${category}`}>
            <div className="mb-4">
              <h2 id={`category-title-${category}`} className="text-2xl font-semibold text-primary">{category}</h2>
              <p className="text-sm text-muted-foreground">
                {categoryTies.length} item(s) | Total Value: ${categoryTotalValue.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categoryTies.map((tie) => (
                <TieCard key={tie.id} tie={tie} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
            <Separator className="my-8" />
          </section>
        );
      })}
    </div>
  );
}
