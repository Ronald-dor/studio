"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { TieFormData, TieCategory } from '@/lib/types';
import { TieSchema } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImageUp, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const UNCATEGORIZED_LABEL = 'Sem Categoria';

interface TieFormProps {
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  onCancel?: () => void;
  categories: TieCategory[];
  onAddCategory: (categoryName: string) => Promise<boolean>;
}

export function TieForm({ onSubmit, initialData, onCancel, categories, onAddCategory }: TieFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const { toast } = useToast();

  const form = useForm<TieFormData>({
    resolver: zodResolver(TieSchema),
    defaultValues: initialData || {
      name: '',
      quantity: 0,
      unitPrice: 0,
      category: categories.length > 0 ? categories[0] : UNCATEGORIZED_LABEL, 
      imageUrl: `https://placehold.co/300x400.png`,
      imageFile: null,
    },
  });

  useEffect(() => {
    const defaultCat = categories.length > 0 ? categories[0] : UNCATEGORIZED_LABEL;
    if (initialData) {
        form.reset({
            ...initialData,
            category: categories.includes(initialData.category) ? initialData.category : (initialData.category || defaultCat),
        });
        setPreviewUrl(initialData.imageUrl || null);
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
    }
  }, [initialData, form, categories]);


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
  };
  
  const handleAddNewCategory = async () => {
    const trimmedName = newCategoryInput.trim();
    if (!trimmedName) {
        toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
        return;
    }
    const success = await onAddCategory(trimmedName);
    if (success) {
        form.setValue('category', trimmedName);
        setNewCategoryInput('');
        setIsAddingCategory(false);
    }
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
                        <Input type="number" placeholder="Ex: 10" {...field} />
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
                      <FormLabel>Preço Unitário (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 25.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value || (categories.length > 0 ? categories[0] : '')} >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                             {categories.length === 0 && (
                                <SelectItem value="" disabled>Nenhuma categoria disponível</SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingCategory(true)} aria-label="Adicionar nova categoria">
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
      <AlertDialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Nova Categoria</AlertDialogTitle>
            <AlertDialogDescription>
                Digite o nome para a nova categoria.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            placeholder="Nome da categoria"
            className="my-2"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCategory();}}}
            />
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCategoryInput('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddNewCategory}>Adicionar Categoria</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
