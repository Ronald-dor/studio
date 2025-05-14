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
import { TieSchema, tieCategories } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImageUp } from 'lucide-react';

interface TieFormProps {
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  onCancel?: () => void;
}

export function TieForm({ onSubmit, initialData, onCancel }: TieFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<TieFormData>({
    resolver: zodResolver(TieSchema),
    defaultValues: initialData || {
      name: '',
      quantity: 0,
      unitPrice: 0,
      category: tieCategories[0],
      imageUrl: `https://placehold.co/300x400.png`,
      imageFile: null,
    },
  });

  useEffect(() => {
    if (initialData?.imageUrl) {
      setPreviewUrl(initialData.imageUrl);
    }
    // Reset form if initialData changes
    form.reset(initialData || {
      name: '',
      quantity: 0,
      unitPrice: 0,
      category: tieCategories[0],
      imageUrl: `https://placehold.co/300x400.png`,
      imageFile: null,
    });
  }, [initialData, form]);


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
      imageFile: imageFile, // Pass the file itself
      imageUrl: previewUrl || `https://placehold.co/300x400.png` // Pass the preview URL (data URL or original)
    };
    onSubmit(dataToSubmit);
    form.reset();
    setPreviewUrl(null);
    setImageFile(null);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{initialData?.id ? 'Edit Tie' : 'Add New Tie'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Classic Silk Blue" {...field} />
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
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} />
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
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 25.00" {...field} />
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
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tieCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" onChange={handleImageChange} className="dark:file:text-primary-foreground"/>
                </FormControl>
                {previewUrl && (
                  <div className="mt-4 relative w-full aspect-[3/4] max-w-xs mx-auto rounded-md overflow-hidden border border-muted">
                    <Image src={previewUrl} alt="Tie preview" layout="fill" objectFit="cover" data-ai-hint="tie fashion" />
                  </div>
                )}
                {!previewUrl && (
                    <div className="mt-4 flex flex-col items-center justify-center w-full aspect-[3/4] max-w-xs mx-auto rounded-md border-2 border-dashed border-muted text-muted-foreground">
                        <ImageUp size={48} />
                        <p className="mt-2 text-sm">Upload an image</p>
                    </div>
                )}
                <FormMessage />
              </FormItem>
            </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" variant="default">{initialData?.id ? 'Save Changes' : 'Add Tie'}</Button>
        </div>
      </form>
    </Form>
  );
}
