
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { TieForm } from './TieForm';
import type { TieFormData, TieCategory } from '@/lib/types';
import { UNCATEGORIZED_LABEL } from '@/lib/types';

interface AddTieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  trigger?: React.ReactNode;
  allCategories: TieCategory[];
  onAddCategory: (categoryName: string) => Promise<boolean>;
  onDeleteCategory: (categoryName: TieCategory) => void;
}

export function AddTieDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  trigger, 
  allCategories,
  onAddCategory,
  onDeleteCategory
}: AddTieDialogProps) {
  const internalSubmit = (data: TieFormData) => {
    onSubmit(data);
    onOpenChange(false); 
  };

  const handleCancel = () => {
    onOpenChange(false);
  }

  const formCategoriesForDropdown = useMemo(() => {
    return allCategories.filter(cat => cat.toLowerCase() !== 'todas');
  }, [allCategories]);

  const categoriesForManagementDialog = useMemo(() => {
    return allCategories.filter(cat => cat.toLowerCase() !== 'todas').sort();
  }, [allCategories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Editar Gravata' : 'Adicionar Nova Gravata'}</DialogTitle>
          <DialogDescription>
            {initialData?.id ? 'Modifique os detalhes da gravata abaixo.' : 'Preencha os detalhes abaixo para adicionar uma nova gravata ao seu inventário.'}
          </DialogDescription>
        </DialogHeader>
        <TieForm 
          onSubmit={internalSubmit} 
          initialData={initialData} 
          onCancel={handleCancel}
          formCategories={formCategoriesForDropdown}
          allCategoriesForManagement={categoriesForManagementDialog}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </DialogContent>
    </Dialog>
  );
}
