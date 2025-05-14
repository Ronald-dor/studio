"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TieForm } from './TieForm';
import type { TieFormData, Tie, TieCategory } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface AddTieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  trigger?: React.ReactNode; // Optional custom trigger
  categories: TieCategory[];
  onAddCategory: (categoryName: string) => Promise<boolean>;
}

export function AddTieDialog({ open, onOpenChange, onSubmit, initialData, trigger, categories, onAddCategory }: AddTieDialogProps) {
  const internalSubmit = (data: TieFormData) => {
    onSubmit(data);
    onOpenChange(false); // Close dialog on submit
  };

  const handleCancel = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Tie' : 'Add New Tie'}</DialogTitle>
        </DialogHeader>
        <TieForm 
          onSubmit={internalSubmit} 
          initialData={initialData} 
          onCancel={handleCancel}
          categories={categories}
          onAddCategory={onAddCategory}
        />
      </DialogContent>
    </Dialog>
  );
}
