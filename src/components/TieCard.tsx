"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Tie } from '@/lib/types';
import { Edit3, Trash2, Package, DollarSign, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TieCardProps {
  tie: Tie;
  onEdit: (tie: Tie) => void;
  onDelete: (id: string) => void;
}

export function TieCard({ tie, onEdit, onDelete }: TieCardProps) {
  const totalValue = tie.quantity * tie.unitPrice;

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden mb-4 border border-muted">
          <Image 
            src={tie.imageUrl || `https://placehold.co/300x400.png`} 
            alt={tie.name} 
            layout="fill" 
            objectFit="cover" 
            data-ai-hint="tie fashion"
            className="bg-secondary"
          />
        </div>
        <CardTitle className="text-lg leading-tight">{tie.name}</CardTitle>
        <CardDescription className="flex items-center">
          <Tag size={14} className="mr-1 text-muted-foreground" /> 
          <Badge variant="secondary">{tie.category}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-muted-foreground">
            <Package size={14} className="mr-1" /> Quantity:
          </span>
          <span>{tie.quantity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center text-muted-foreground">
            <DollarSign size={14} className="mr-1" /> Unit Price:
          </span>
          <span>${tie.unitPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold">
          <span className="flex items-center text-muted-foreground">
            <DollarSign size={14} className="mr-1" /> Total Value:
          </span>
          <span>${totalValue.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(tie)} aria-label={`Edit ${tie.name}`}>
          <Edit3 size={16} className="mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(tie.id)} aria-label={`Delete ${tie.name}`}>
          <Trash2 size={16} className="mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
