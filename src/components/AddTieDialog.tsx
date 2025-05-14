
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TieForm } from './TieForm';
import type { TieFormData, TieCategory } from '@/lib/types';

interface AddTieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  trigger?: React.ReactNode;
  allCategories: TieCategory[]; // Renomeado de categories para allCategories para clareza
  onAddCategory: (categoryName: string) => Promise<boolean>;
  onDeleteCategory: (categoryName: TieCategory) => void; // Nova prop
}

export function AddTieDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  trigger, 
  allCategories, 
  onAddCategory,
  onDeleteCategory // Nova prop
}: AddTieDialogProps) {
  const internalSubmit = (data: TieFormData) => {
    onSubmit(data);
    onOpenChange(false); 
  };

  const handleCancel = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Editar Gravata' : 'Adicionar Nova Gravata'}</DialogTitle>
        </DialogHeader>
        <TieForm 
          onSubmit={internalSubmit} 
          initialData={initialData} 
          onCancel={handleCancel}
          // Passa apenas as categorias filtradas para o Select do formulário
          formCategories={allCategories.filter(c => c.toLowerCase() !== 'todas')} 
          allCategoriesForManagement={allCategories} // Passa todas para gerenciamento
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory} // Passa a função de deletar
        />
      </DialogContent>
    </Dialog>
  );
}
