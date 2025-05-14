
"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { TieFormData, TieCategory } from '@/lib/types';
import { TieSchema, UNCATEGORIZED_LABEL } from '@/lib/types'; // Importado UNCATEGORIZED_LABEL
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImageUp, Plus, Trash2, Coins } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface TieFormProps {
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  onCancel?: () => void;
  formCategories: TieCategory[]; // Categorias para o dropdown do formulário (sem "Todas")
  allCategoriesForManagement: TieCategory[]; // Todas as categorias para o diálogo de gerenciamento
  onAddCategory: (categoryName: string) => Promise<boolean>;
  onDeleteCategory: (categoryName: TieCategory) => void; // Nova prop
}

export function TieForm({ 
  onSubmit, 
  initialData, 
  onCancel, 
  formCategories, 
  allCategoriesForManagement,
  onAddCategory, 
  onDeleteCategory 
}: TieFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isManageCategoryDialogOpen, setIsManageCategoryDialogOpen] = useState(false); // Renomeado de isAddingCategory
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const { toast } = useToast();

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);
  const [valueInQuantity, setValueInQuantity] = useState<number>(0);


  const form = useForm<TieFormData>({
    resolver: zodResolver(TieSchema),
    defaultValues: initialData || {
      name: '',
      quantity: 0,
      unitPrice: 0,
      category: formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL, 
      imageUrl: `https://placehold.co/300x400.png`,
      imageFile: null,
    },
  });

  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });

  useEffect(() => {
    const quantity = watchedQuantity || 0;
    const unitPrice = watchedUnitPrice || 0;
    setValueInQuantity(quantity * unitPrice);
  }, [watchedQuantity, watchedUnitPrice]);

  useEffect(() => {
    const defaultCat = formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL;
    if (initialData) {
        form.reset({
            ...initialData,
            category: formCategories.includes(initialData.category) ? initialData.category : (initialData.category || defaultCat),
        });
        setPreviewUrl(initialData.imageUrl || null);
        setValueInQuantity((initialData.quantity || 0) * (initialData.unitPrice || 0));
    } else {
        form.reset({
            name: '',
            quantity: 0,
            unitPrice: 0,
            category: defaultCat,
            imageUrl: `https://placehold.co/300x400.png`,
            imageFile: null,
        });
        setPreviewUrl(null);
        setValueInQuantity(0);
    }
  }, [initialData, form, formCategories]);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setPreviewUrl(initialData?.imageUrl || `https://placehold.co/300x400.png`);
    }
  };

  const handleSubmit = (values: TieFormData) => {
    const dataToSubmit: TieFormData = {
      ...values,
      category: values.category || UNCATEGORIZED_LABEL,
      imageFile: imageFile, 
      imageUrl: previewUrl || `https://placehold.co/300x400.png`
    };
    onSubmit(dataToSubmit);
    form.reset();
    setPreviewUrl(null);
    setImageFile(null);
    setValueInQuantity(0);
  };
  
  const handleAddNewCategoryInDialog = async () => {
    const trimmedName = newCategoryInput.trim();
    if (!trimmedName) {
        toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
        return;
    }
    const success = await onAddCategory(trimmedName);
    if (success) {
        form.setValue('category', trimmedName); // Atualiza o select do formulário
        setNewCategoryInput('');
        // Não fecha o diálogo de gerenciamento, permitindo mais ações
    }
  };

  const confirmDeleteCategory = (category: TieCategory) => {
    if (category === UNCATEGORIZED_LABEL) {
      toast({ title: "Ação não permitida", description: `A categoria "${category}" não pode ser removida.`, variant: "destructive" });
      return;
    }
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const executeDeleteCategory = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
      // Se a categoria deletada era a selecionada no formulário, reseta para a primeira disponível ou Sem Categoria
      if (form.getValues('category') === categoryToDelete) {
        const newFormCategories = formCategories.filter(cat => cat !== categoryToDelete);
        form.setValue('category', newFormCategories.length > 0 ? newFormCategories[0] : UNCATEGORIZED_LABEL);
      }
      setCategoryToDelete(null);
    }
    setIsConfirmDeleteCategoryOpen(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="shadow-none border-none"> 
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(90vh-220px)] md:h-[calc(70vh-100px)] pr-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Seda Azul Clássica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} value={field.value || 0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Unitário (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 25.00" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} value={field.value || 0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormItem>
                <FormLabel className="flex items-center">
                  <Coins size={14} className="mr-1 text-muted-foreground" />
                  Valor em Quantidade (R$)
                </FormLabel>
                <Input
                  type="text"
                  value={valueInQuantity.toFixed(2)}
                  readOnly
                  className="bg-muted/50 border-muted text-muted-foreground"
                />
              </FormItem>


              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value || (formCategories.includes(UNCATEGORIZED_LABEL) ? UNCATEGORIZED_LABEL : (formCategories.length > 0 ? formCategories[0] : ''))} >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {formCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                             {formCategories.length === 0 && !formCategories.includes(UNCATEGORIZED_LABEL) && (
                                <SelectItem value={UNCATEGORIZED_LABEL}>{UNCATEGORIZED_LABEL}</SelectItem>
                              )}
                             {formCategories.length === 0 && formCategories.includes(UNCATEGORIZED_LABEL) && (
                                 <SelectItem value={UNCATEGORIZED_LABEL} disabled>Nenhuma outra categoria disponível</SelectItem>
                             )}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsManageCategoryDialogOpen(true)} aria-label="Gerenciar categorias">
                            <Plus size={16}/>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel>Imagem</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" onChange={handleImageChange} className="dark:file:text-primary-foreground"/>
                </FormControl>
                {previewUrl && (
                  <div className="mt-4 relative w-full aspect-[3/4] max-w-xs mx-auto rounded-md overflow-hidden border border-muted">
                    <Image src={previewUrl} alt="Prévia da gravata" layout="fill" objectFit="cover" data-ai-hint="gravata moda" />
                  </div>
                )}
                {!previewUrl && (
                    <div className="mt-4 flex flex-col items-center justify-center w-full aspect-[3/4] max-w-xs mx-auto rounded-md border-2 border-dashed border-muted text-muted-foreground">
                        <ImageUp size={48} />
                        <p className="mt-2 text-sm">Carregar uma imagem</p>
                    </div>
                )}
                <FormMessage />
              </FormItem>
            </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
          <Button type="submit" variant="default">{initialData?.id ? 'Salvar Alterações' : 'Adicionar Gravata'}</Button>
        </div>
      </form>

      {/* Diálogo para Adicionar/Remover Categorias */}
      <AlertDialog open={isManageCategoryDialogOpen} onOpenChange={setIsManageCategoryDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
            <AlertDialogTitle>Gerenciar Categorias</AlertDialogTitle>
            <AlertDialogDescription>
                Adicione uma nova categoria ou remova existentes.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
                <div className="flex items-center space-x-2">
                    <Input
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Nova categoria..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCategoryInDialog();}}}
                    />
                    <Button onClick={handleAddNewCategoryInDialog} variant="outline" size="sm">Adicionar</Button>
                </div>
                
                <Label className="text-sm font-medium">Categorias Existentes:</Label>
                {allCategoriesForManagement.filter(cat => cat.toLowerCase() !== 'todas').length > 0 ? (
                  <ScrollArea className="h-40 rounded-md border p-2">
                    <ul className="space-y-1">
                        {allCategoriesForManagement
                          .filter(cat => cat.toLowerCase() !== 'todas') // Não listar "Todas"
                          .sort() // Ordenar para consistência
                          .map((category) => (
                            <li key={category} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted/50">
                                <span>{category}</span>
                                {category !== UNCATEGORIZED_LABEL && ( // Não permitir remover "Sem Categoria"
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-destructive hover:text-destructive/80" 
                                    onClick={() => confirmDeleteCategory(category)}
                                    aria-label={`Remover categoria ${category}`}
                                >
                                    <Trash2 size={14} />
                                </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria definida (além de "Sem Categoria", se aplicável).</p>
                )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setNewCategoryInput(''); setIsManageCategoryDialogOpen(false); }}>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Confirmação para Remover Categoria */}
      <AlertDialog open={isConfirmDeleteCategoryOpen} onOpenChange={setIsConfirmDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{categoryToDelete}"? As gravatas nesta categoria serão movidas para "{UNCATEGORIZED_LABEL}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setCategoryToDelete(null); setIsConfirmDeleteCategoryOpen(false);}}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteCategory} variant="destructive">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}

