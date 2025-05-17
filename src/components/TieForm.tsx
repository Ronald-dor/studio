
"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ImageUp, Plus, Trash2, Coins, Camera, Check, RefreshCcw, VideoOff, RefreshCw } from 'lucide-react';
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamDialogOpen, setIsWebcamDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentVideoDeviceIndex, setCurrentVideoDeviceIndex] = useState<number>(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);


  const selectDropdownCategories = formCategories; 
  const categoriesForManagementDialog = allCategoriesForManagement;

  const form = useForm<TieFormData>({ 
    resolver: zodResolver(TieSchema),
    defaultValues: {
      name: initialData?.name || '',
      quantity: initialData?.quantity || 0,
      unitPrice: initialData?.unitPrice || 0,
      valueInQuantity: initialData?.valueInQuantity || 0,
      category: initialData?.category || (selectDropdownCategories.length > 0 ? selectDropdownCategories[0] : UNCATEGORIZED_LABEL), 
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
            category: formCategories.includes(initialData.category) 
                        ? initialData.category 
                        : (initialData.category === UNCATEGORIZED_LABEL ? UNCATEGORIZED_LABEL : defaultCat),
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
      setCapturedImageDataUrl(null); 
    } else {
      setImageFile(null);
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
    const defaultCat = formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL;
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
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const executeDeleteCategory = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
      if (form.getValues('category') === categoryToDelete) {
        const remainingCats = allCategoriesForManagement.filter(cat => cat !== categoryToDelete);
        const newDefaultCat = remainingCats.length > 0 
                                ? remainingCats[0] 
                                : UNCATEGORIZED_LABEL;
        form.setValue('category', newDefaultCat);
      }
      setCategoryToDelete(null);
    }
    setIsConfirmDeleteCategoryOpen(false);
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const handleOpenWebcamDialog = async () => {
    setCapturedImageDataUrl(null);
    setHasCameraPermission(null);
    setIsSwitchingCamera(true);
    setVideoDevices([]); // Clear previous device list

    try {
      // Request permission first. This helps ensure labels are available for enumerateDevices.
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop()); // We don't need this stream, just the permission.

      const devices = await navigator.mediaDevices.enumerateDevices();
      const availableVideoDevices = devices.filter(d => d.kind === 'videoinput');

      if (availableVideoDevices.length > 0) {
        setVideoDevices(availableVideoDevices);
        // Prefer user-facing (front) camera as default
        const userFacingIndex = availableVideoDevices.findIndex(
            d => d.label.toLowerCase().includes('front') || 
                 d.label.toLowerCase().includes('frontal') ||
                 d.label.toLowerCase().includes('face') || // common labels
                 d.label.toLowerCase().includes('webcam')
        );
        setCurrentVideoDeviceIndex(userFacingIndex !== -1 ? userFacingIndex : 0);
        // hasCameraPermission will be set to true by the useEffect when stream starts
      } else {
        toast({ variant: "destructive", title: "Nenhuma câmera encontrada", description: "Nenhum dispositivo de vídeo foi detectado." });
        setHasCameraPermission(false);
      }
    } catch (error: any) {
      console.error("Error initializing camera devices:", error);
      setHasCameraPermission(false);
       if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
             toast({
                variant: 'destructive',
                title: 'Acesso à câmera negado',
                description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
             });
        } else {
             toast({
                variant: 'destructive',
                title: 'Erro ao Inicializar Câmera',
                description: 'Não foi possível listar os dispositivos de câmera.',
             });
        }
    } finally {
      setIsSwitchingCamera(false);
      setIsWebcamDialogOpen(true); // Open dialog, useEffect will attempt to start stream
    }
  };

  useEffect(() => {
    const manageWebcamStream = async () => {
      if (!isWebcamDialogOpen || capturedImageDataUrl) {
        if (webcamStream) {
          stopWebcam();
        }
        return;
      }

      if (webcamStream) { // Stop previous stream before starting/switching
        stopWebcam();
      }
      setIsSwitchingCamera(true);

      try {
        let devicesToUse = videoDevices;
        if (devicesToUse.length === 0 && hasCameraPermission !== false) {
          // Attempt to enumerate if not done (e.g., direct dialog open without pre-enumeration)
          // This path is less likely if handleOpenWebcamDialog runs first.
          const tempStreamForPerm = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStreamForPerm.getTracks().forEach(track => track.stop());
          const enumeratedDevices = await navigator.mediaDevices.enumerateDevices();
          const availableVideoDevices = enumeratedDevices.filter(d => d.kind === 'videoinput');
          if (availableVideoDevices.length === 0) {
            toast({ variant: "destructive", title: "Nenhuma câmera encontrada" });
            setHasCameraPermission(false); setIsSwitchingCamera(false); return;
          }
          setVideoDevices(availableVideoDevices);
          devicesToUse = availableVideoDevices;
           // Reset index if it was out of bounds for a previously empty list
          if (currentVideoDeviceIndex >= availableVideoDevices.length && availableVideoDevices.length > 0) {
            setCurrentVideoDeviceIndex(0);
          }
        }
        
        if (devicesToUse.length === 0) {
             toast({ variant: "destructive", title: "Câmeras não carregadas"});
             setHasCameraPermission(false); setIsSwitchingCamera(false); return;
        }

        const deviceIdToUse = devicesToUse[currentVideoDeviceIndex]?.deviceId;

        if (!deviceIdToUse) {
            console.warn("Target deviceId not found. Current index:", currentVideoDeviceIndex, "Devices:", devicesToUse);
            if (devicesToUse.length > 0) {
                setCurrentVideoDeviceIndex(0); // Attempt to fallback to the first device
                setIsSwitchingCamera(false); // Allow effect to re-run
                return; 
            } else {
                toast({ variant: "destructive", title: "Nenhuma câmera disponível"});
                setHasCameraPermission(false); setIsSwitchingCamera(false); return;
            }
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceIdToUse } }
        });
        setHasCameraPermission(true);
        setWebcamStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

      } catch (error: any) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        const errName = error.name || '';
        const errMessage = error.message || 'Erro desconhecido.';
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
             toast({ variant: 'destructive', title: 'Acesso à câmera negado', description: 'Habilite a permissão da câmera no seu navegador.'});
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError" || errName === "OverconstrainedError"){
             toast({ variant: 'destructive', title: 'Câmera não encontrada', description: 'A câmera selecionada não foi encontrada ou não suporta as restrições. Tente outra.'});
        } else {
             toast({ variant: 'destructive', title: 'Erro na Câmera', description: `Erro: ${errMessage}` });
        }
      } finally {
        setIsSwitchingCamera(false);
      }
    };

    manageWebcamStream();

    return () => { // Cleanup function
      if (webcamStream) {
        stopWebcam();
      }
    };
  }, [isWebcamDialogOpen, capturedImageDataUrl, currentVideoDeviceIndex]); 
  // videoDevices is intentionally not a direct dependency to avoid re-running enumeration loop, 
  // it's managed inside or by handleOpenWebcamDialog.

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1 && !isSwitchingCamera) {
      setCapturedImageDataUrl(null); // Clear any captured image
      const nextIndex = (currentVideoDeviceIndex + 1) % videoDevices.length;
      setCurrentVideoDeviceIndex(nextIndex); // This will trigger the useEffect
    }
  };

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && webcamStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp'); 
        setCapturedImageDataUrl(dataUrl);
        // stopWebcam(); // Stop stream after capture
      }
    } else {
      toast({ variant: "destructive", title: "Erro ao capturar", description: "Não foi possível acessar a stream de vídeo."});
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImageDataUrl(null); 
    // The useEffect will restart the stream for the currentVideoDeviceIndex
  };

  const handleUseCapturedImage = () => {
    if (capturedImageDataUrl) {
      setPreviewUrl(capturedImageDataUrl);
      setImageFile(null); 
      form.setValue('imageUrl', capturedImageDataUrl);
      form.setValue('imageFile', null);
      setIsWebcamDialogOpen(false); // This will also trigger cleanup in useEffect
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
                        <Select onValueChange={field.onChange} value={field.value} >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectDropdownCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                             {selectDropdownCategories.length === 0 && (
                                <SelectItem value={UNCATEGORIZED_LABEL}>{UNCATEGORIZED_LABEL}</SelectItem>
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

    <canvas ref={canvasRef} style={{ display: 'none' }} />

    <AlertDialog open={isWebcamDialogOpen} onOpenChange={setIsWebcamDialogOpen}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar Foto com Webcam</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Acesso à Câmera Negado ou Erro</AlertTitle>
              <AlertDescription>
                Verifique as permissões da câmera no seu navegador ou tente selecionar outra câmera se disponível.
              </AlertDescription>
            </Alert>
          )}

          {(hasCameraPermission === null || isSwitchingCamera) && !capturedImageDataUrl && (
            <div className="text-center text-muted-foreground">
              {isSwitchingCamera ? "Trocando câmera..." : "Solicitando permissão da câmera..."}
            </div>
          )}
          
          {/* Video display area */}
          <div className={`bg-muted rounded-md overflow-hidden border ${hasCameraPermission && !capturedImageDataUrl ? 'block' : 'hidden'}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
          </div>

          {/* Captured image display area */}
          {capturedImageDataUrl && (
            <div className="bg-muted rounded-md overflow-hidden border">
              <Image src={capturedImageDataUrl} alt="Foto Capturada" width={600} height={400} className="w-full aspect-video object-cover" data-ai-hint="gravata moda"/>
            </div>
          )}
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-grow flex gap-2">
                {hasCameraPermission && !capturedImageDataUrl && videoDevices.length > 1 && (
                    <Button variant="outline" onClick={handleSwitchCamera} disabled={isSwitchingCamera} className="w-full sm:w-auto">
                        <RefreshCw size={16} className="mr-2" /> {isSwitchingCamera ? "Trocando..." : "Trocar Câmera"}
                    </Button>
                )}
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
                <AlertDialogCancel onClick={() => setIsWebcamDialogOpen(false)} className="w-full sm:w-auto">Fechar</AlertDialogCancel>
                {hasCameraPermission && !capturedImageDataUrl && (
                    <Button onClick={handleCaptureImage} disabled={isSwitchingCamera} className="w-full sm:w-auto">
                    <Camera size={16} className="mr-2" /> Capturar Imagem
                    </Button>
                )}
                {hasCameraPermission && capturedImageDataUrl && (
                    <>
                    <Button variant="outline" onClick={handleRetakePhoto} className="w-full sm:w-auto">
                        <RefreshCcw size={16} className="mr-2" /> Tirar Outra
                    </Button>
                    <Button onClick={handleUseCapturedImage} className="w-full sm:w-auto">
                        <Check size={16} className="mr-2" /> Usar esta Foto
                    </Button>
                    </>
                )}
            </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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
                {categoriesForManagementDialog.length > 0 ? (
                  <ScrollArea className="h-40 rounded-md border p-2">
                    <ul className="space-y-1">
                        {categoriesForManagementDialog.map((category) => (
                            <li key={category} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted/50">
                                <span>{category}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-destructive hover:text-destructive/80" 
                                    onClick={() => confirmDeleteCategory(category)}
                                    aria-label={`Remover categoria ${category}`}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </li>
                        ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria definida.</p>
                )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setNewCategoryInput(''); setIsManageCategoryDialogOpen(false); }}>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmDeleteCategoryOpen} onOpenChange={setIsConfirmDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete === UNCATEGORIZED_LABEL
                ? `Tem certeza que deseja remover a categoria "${UNCATEGORIZED_LABEL}"? Gravatas nesta categoria manterão esta designação em seus dados, mas a categoria não será uma opção de filtro até ser recriada.`
                : `Tem certeza que deseja remover a categoria "${categoryToDelete}"? As gravatas nesta categoria serão movidas para "${UNCATEGORIZED_LABEL}".`}
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

