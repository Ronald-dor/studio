
"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { TieFormData, TieCategory } from '@/lib/types';
import { TieSchema, UNCATEGORIZED_LABEL } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImageUp, Plus, Trash2, Coins, Camera, Check, RefreshCcw, VideoOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TieFormProps {
  onSubmit: (data: TieFormData) => void;
  initialData?: TieFormData;
  onCancel?: () => void;
  formCategories: TieCategory[];
  allCategoriesForManagement: TieCategory[];
  onAddCategory: (categoryName: string) => Promise<boolean>;
  onDeleteCategory: (categoryName: TieCategory) => void;
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
  const [isManageCategoryDialogOpen, setIsManageCategoryDialogOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const { toast } = useToast();

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);

  // Webcam states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamDialogOpen, setIsWebcamDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);


  const form = useForm<TieFormData>({ 
    resolver: zodResolver(TieSchema),
    defaultValues: {
      name: initialData?.name || '',
      quantity: initialData?.quantity || 0,
      unitPrice: initialData?.unitPrice || 0,
      valueInQuantity: initialData?.valueInQuantity || 0,
      category: initialData?.category || (formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL), 
      imageUrl: initialData?.imageUrl || `https://placehold.co/300x400.png`,
      imageFile: null,
    },
  });

  useEffect(() => {
    const defaultCat = formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL;
    if (initialData) {
        form.reset({
            ...initialData,
            valueInQuantity: initialData.valueInQuantity || 0,
            category: formCategories.includes(initialData.category) ? initialData.category : (initialData.category || defaultCat),
            imageFile: null, 
        });
        setPreviewUrl(initialData.imageUrl || null);
    } else {
        form.reset({
            name: '',
            quantity: 0,
            unitPrice: 0,
            valueInQuantity: 0,
            category: defaultCat,
            imageUrl: `https://placehold.co/300x400.png`,
            imageFile: null,
        });
        setPreviewUrl(null);
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
      setCapturedImageDataUrl(null); // Clear any webcam capture
    } else {
      setImageFile(null);
      // Do not reset previewUrl if it came from webcam or initial data
      if (!capturedImageDataUrl) {
        setPreviewUrl(initialData?.imageUrl || `https://placehold.co/300x400.png`);
      }
    }
  };

  const handleSubmit = (values: TieFormData) => {
    const dataToSubmit: TieFormData = {
      ...values,
      valueInQuantity: values.valueInQuantity || 0,
      category: values.category || UNCATEGORIZED_LABEL,
      imageFile: imageFile, 
      imageUrl: previewUrl || `https://placehold.co/300x400.png`
    };
    onSubmit(dataToSubmit);
    form.reset({
        name: '',
        quantity: 0,
        unitPrice: 0,
        valueInQuantity: 0,
        category: formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL,
        imageUrl: `https://placehold.co/300x400.png`,
        imageFile: null,
    });
    setPreviewUrl(null);
    setImageFile(null);
    setCapturedImageDataUrl(null);
  };
  
  const handleAddNewCategoryInDialog = async () => {
    const trimmedName = newCategoryInput.trim();
    if (!trimmedName) {
        toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
        return;
    }
    const success = await onAddCategory(trimmedName);
    if (success) {
        form.setValue('category', trimmedName);
        setNewCategoryInput('');
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
      if (form.getValues('category') === categoryToDelete) {
        const newFormCategories = formCategories.filter(cat => cat !== categoryToDelete);
        form.setValue('category', newFormCategories.length > 0 ? newFormCategories[0] : UNCATEGORIZED_LABEL);
      }
      setCategoryToDelete(null);
    }
    setIsConfirmDeleteCategoryOpen(false);
  };

  // Webcam Logic
  const startWebcam = async () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à câmera negado',
        description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
      });
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  useEffect(() => {
    if (isWebcamDialogOpen && !capturedImageDataUrl) {
      startWebcam();
    } else if (!isWebcamDialogOpen || capturedImageDataUrl) {
      stopWebcam();
    }
    return () => {
      stopWebcam(); // Ensure webcam is stopped on component unmount or dialog close
    };
  }, [isWebcamDialogOpen, capturedImageDataUrl]);

  const handleOpenWebcamDialog = () => {
    setCapturedImageDataUrl(null);
    setHasCameraPermission(null); // Reset permission status to re-check
    setIsWebcamDialogOpen(true);
  };

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && webcamStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Ensure canvas dimensions match video's rendered dimensions for accurate capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp'); // Using webp for potentially smaller file sizes
        setCapturedImageDataUrl(dataUrl);
        // Webcam will be stopped by useEffect reacting to capturedImageDataUrl change
      }
    } else {
      toast({ variant: "destructive", title: "Erro ao capturar", description: "Não foi possível acessar a stream de vídeo."});
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImageDataUrl(null); // This will trigger useEffect to restart webcam
  };

  const handleUseCapturedImage = () => {
    if (capturedImageDataUrl) {
      setPreviewUrl(capturedImageDataUrl);
      setImageFile(null); // Clear any selected file
      form.setValue('imageUrl', capturedImageDataUrl);
      form.setValue('imageFile', null);
      setIsWebcamDialogOpen(false);
      // capturedImageDataUrl will be reset by handleOpenWebcamDialog or useEffect cleanup
    }
  };

  return (
    <>
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
                      <FormLabel>Estoque</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 10" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                          value={field.value || 0} 
                        />
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
                      <FormLabel>Valor Unitário</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 25.00" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="valueInQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Coins size={14} className="mr-1 text-muted-foreground" />
                      Valor em Quantidade
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="Ex: 250.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


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
                <div className="flex items-center gap-2">
                    <FormControl className="flex-grow">
                        <Input type="file" accept="image/*" onChange={handleImageChange} className="dark:file:text-primary-foreground"/>
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={handleOpenWebcamDialog} aria-label="Tirar Foto">
                        <Camera size={16} />
                    </Button>
                </div>
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
    </Form>

    {/* Hidden canvas for capturing webcam frame */}
    <canvas ref={canvasRef} style={{ display: 'none' }} />

    {/* Webcam Dialog */}
    <AlertDialog open={isWebcamDialogOpen} onOpenChange={setIsWebcamDialogOpen}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar Foto com Webcam</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Acesso à Câmera Negado</AlertTitle>
              <AlertDescription>
                Para tirar uma foto, por favor, permita o acesso à câmera nas configurações do seu navegador e tente novamente.
              </AlertDescription>
            </Alert>
          )}

          {hasCameraPermission === null && !capturedImageDataUrl && (
            <div className="text-center text-muted-foreground">
              Solicitando permissão da câmera...
            </div>
          )}

          {hasCameraPermission && !capturedImageDataUrl && (
            <div className="bg-muted rounded-md overflow-hidden border">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
            </div>
          )}

          {capturedImageDataUrl && (
            <div className="bg-muted rounded-md overflow-hidden border">
              <Image src={capturedImageDataUrl} alt="Foto Capturada" width={600} height={400} className="w-full aspect-video object-cover" data-ai-hint="gravata moda" />
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsWebcamDialogOpen(false)}>Fechar</AlertDialogCancel>
          {hasCameraPermission && !capturedImageDataUrl && (
            <Button onClick={handleCaptureImage}>
              <Camera size={16} className="mr-2" /> Capturar Imagem
            </Button>
          )}
          {hasCameraPermission && capturedImageDataUrl && (
            <>
              <Button variant="outline" onClick={handleRetakePhoto}>
                <RefreshCcw size={16} className="mr-2" /> Tirar Outra
              </Button>
              <Button onClick={handleUseCapturedImage}>
                <Check size={16} className="mr-2" /> Usar esta Foto
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Manage Categories Dialog */}
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
                          .filter(cat => cat.toLowerCase() !== 'todas') 
                          .sort() 
                          .map((category) => (
                            <li key={category} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted/50">
                                <span>{category}</span>
                                {category !== UNCATEGORIZED_LABEL && ( 
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

    {/* Confirm Delete Category Dialog */}
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
    </>
  );
}

