
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
import { TieSchema, UNCATEGORIZED_LABEL, PLACEHOLDER_IMAGE_URL } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ImageUp, Plus, Trash2, Coins, Camera, Check, RefreshCcw, VideoOff, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const TARGET_COMPRESSION_QUALITY = 0.7;
const MAX_DIMENSION = 1200; // Max width or height for resizing

async function dataURItoBlobInForm(dataURI: string): Promise<Blob> {
  const response = await fetch(dataURI);
  const blob = await response.blob();
  return blob;
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= MAX_IMAGE_SIZE_BYTES) {
    console.log(`TieForm: Image "${file.name}" is small enough or not an image, using original. Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    return file;
  }

  console.log(`TieForm: Original image "${file.name}" size: ${(file.size / 1024 / 1024).toFixed(2)} MB. Compressing...`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || typeof event.target.result !== 'string') {
        console.error('TieForm: Failed to read image file for compression.');
        return reject(new Error('Failed to read image file for compression.'));
      }
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            width = MAX_DIMENSION;
            height = Math.round(width / aspectRatio);
          } else {
            height = MAX_DIMENSION;
            width = Math.round(height * aspectRatio);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('TieForm: Failed to get canvas context for compression.');
          return reject(new Error('Failed to get canvas context for compression.'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFileName = file.name.replace(/\.[^/.]+$/, ".jpg"); 
              const compressedFile = new File([blob], compressedFileName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`TieForm: Compressed image "${compressedFile.name}" size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
              
              if (compressedFile.size < file.size || file.size > MAX_IMAGE_SIZE_BYTES) {
                 if(compressedFile.size > MAX_IMAGE_SIZE_BYTES) {
                    console.warn(`TieForm: Compressed image is still > 1MB but smaller than original. Using compressed version.`);
                 }
                resolve(compressedFile);
              } else {
                console.warn('TieForm: Compression did not significantly reduce size or made it larger. Using original.');
                resolve(file);
              }
            } else {
              console.error('TieForm: Canvas toBlob returned null, using original file.');
              resolve(file); 
            }
          },
          'image/jpeg',
          TARGET_COMPRESSION_QUALITY
        );
      };
      img.onerror = (err) => {
        console.error('TieForm: Image load error during compression, using original file:', err);
        resolve(file); 
      };
      img.src = event.target.result;
    };
    reader.onerror = (err) => {
      console.error('TieForm: File read error during compression, using original file:', err);
      resolve(file); 
    };
    reader.readAsDataURL(file);
  });
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || PLACEHOLDER_IMAGE_URL);
  const [, setImageFileLocal] = useState<File | null>(null); 
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

  const defaultPlaceholderImage = PLACEHOLDER_IMAGE_URL;

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
      imageUrl: initialData?.imageUrl || defaultPlaceholderImage, 
      imageFile: null, 
    },
  });

 useEffect(() => {
    console.log("TieForm: useEffect - Resetting form with initialData:", initialData, "Current formCategories:", formCategories);
    const defaultCat = formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL;
    const initialDisplayImageUrl = initialData?.imageUrl || defaultPlaceholderImage;
    
    form.reset({
        name: initialData?.name || '',
        quantity: initialData?.quantity || 0,
        unitPrice: initialData?.unitPrice || 0,
        valueInQuantity: initialData?.valueInQuantity || 0,
        category: initialData?.category 
                    ? (formCategories.includes(initialData.category) || initialData.category === UNCATEGORIZED_LABEL ? initialData.category : defaultCat)
                    : defaultCat,
        imageUrl: initialDisplayImageUrl, 
        imageFile: null, 
    });
    setPreviewUrl(initialDisplayImageUrl);
    setImageFileLocal(null);
    setCapturedImageDataUrl(null);
    console.log("TieForm: Form reset complete. PreviewURL:", initialDisplayImageUrl);
  }, [initialData, form, formCategories, defaultPlaceholderImage]);


  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    console.log("TieForm: handleImageChange triggered.");
    const file = event.target.files?.[0];
    if (file) {
      console.log("TieForm: File selected:", file.name, file.type);
      if (!file.type.startsWith('image/')) {
        toast({ title: "Formato Inválido", description: "Por favor, selecione um arquivo de imagem.", variant: "destructive" });
        form.setValue('imageFile', null);
        form.setValue('imageUrl', initialData?.imageUrl || defaultPlaceholderImage);
        setPreviewUrl(initialData?.imageUrl || defaultPlaceholderImage);
        console.log("TieForm: Invalid file type. Resetting image fields.");
        return;
      }
      try {
        const processedFile = await compressImageIfNeeded(file);
        console.log("TieForm: Image processed by compressImageIfNeeded. Result:", processedFile);
        setImageFileLocal(processedFile);
        form.setValue('imageFile', processedFile, { shouldValidate: true }); 
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
          console.log("TieForm: Preview URL set to:", reader.result as string);
        };
        reader.readAsDataURL(processedFile);
        setCapturedImageDataUrl(null); 
        form.setValue('imageUrl', undefined, { shouldValidate: true }); 
        console.log("TieForm: imageFile set, imageUrl cleared (set to undefined for Zod default).");
      } catch (error) {
        console.error("TieForm: Error processing image:", error);
        toast({ title: "Erro ao Processar Imagem", description: "Não foi possível processar a imagem. Tente outra.", variant: "destructive" });
        setImageFileLocal(file); 
        form.setValue('imageFile', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
        setCapturedImageDataUrl(null);
        form.setValue('imageUrl', undefined, { shouldValidate: true });
      }
    } else {
      console.log("TieForm: No file selected from input. Resetting imageFile.");
      setImageFileLocal(null);
      form.setValue('imageFile', null, { shouldValidate: true });
      if (!capturedImageDataUrl) { 
        const fallbackImageUrl = initialData?.imageUrl || defaultPlaceholderImage;
        setPreviewUrl(fallbackImageUrl);
        form.setValue('imageUrl', fallbackImageUrl, { shouldValidate: true });
        console.log("TieForm: No webcam image active, restored imageUrl to:", fallbackImageUrl);
      } else {
        console.log("TieForm: Webcam image is active, not changing imageUrl from file input reset.");
      }
    }
  };

  const handleSubmitFromHookForm = (values: TieFormData) => {
    console.log("TieForm: handleSubmitFromHookForm (react-hook-form wrapper) called with values:", JSON.stringify(values, (k, v) => k === 'imageFile' && v ? '[File Object]' : v, 2));
    console.log("TieForm: Calling props.onSubmit...");
    onSubmit(values);

    const defaultCat = formCategories.length > 0 ? formCategories[0] : UNCATEGORIZED_LABEL;
    form.reset({
        name: '',
        quantity: 0,
        unitPrice: 0,
        valueInQuantity: 0,
        category: defaultCat,
        imageUrl: defaultPlaceholderImage,
        imageFile: null,
    });
    setPreviewUrl(defaultPlaceholderImage);
    setImageFileLocal(null);
    setCapturedImageDataUrl(null);
    console.log("TieForm: Form submitted and reset.");
  };
  
  const handleAddNewCategoryInDialog = async () => {
    const trimmedName = newCategoryInput.trim();
    if (!trimmedName) {
        toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
        return;
    }
    const success = await onAddCategory(trimmedName);
    if (success) {
        form.setValue('category', trimmedName, { shouldValidate: true });
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
        form.setValue('category', newDefaultCat, { shouldValidate: true });
      }
      setCategoryToDelete(null);
    }
    setIsConfirmDeleteCategoryOpen(false);
  };

  const stopWebcam = () => {
    if (webcamStream) {
      console.log("TieForm: Stopping webcam stream.");
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const handleOpenWebcamDialog = async () => {
    console.log("TieForm: handleOpenWebcamDialog called.");
    setCapturedImageDataUrl(null); 
    setHasCameraPermission(null);
    setIsSwitchingCamera(true);
    setVideoDevices([]); 

    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop()); 

      const devices = await navigator.mediaDevices.enumerateDevices();
      const availableVideoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log("TieForm: Available video devices:", availableVideoDevices);

      if (availableVideoDevices.length > 0) {
        setVideoDevices(availableVideoDevices);
        const userFacingIndex = availableVideoDevices.findIndex(
            d => d.label.toLowerCase().includes('front') || 
                 d.label.toLowerCase().includes('frontal') ||
                 d.label.toLowerCase().includes('face') || 
                 d.label.toLowerCase().includes('webcam')
        );
        setCurrentVideoDeviceIndex(userFacingIndex !== -1 ? userFacingIndex : 0);
        console.log("TieForm: Selected video device index:", userFacingIndex !== -1 ? userFacingIndex : 0);
      } else {
        toast({ variant: "destructive", title: "Nenhuma câmera encontrada", description: "Nenhum dispositivo de vídeo foi detectado." });
        setHasCameraPermission(false);
      }
    } catch (error: any) {
      console.error("TieForm: Error initializing camera devices:", error);
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
      setIsWebcamDialogOpen(true); 
      console.log("TieForm: Webcam dialog opening. SwitchingCamera:", false);
    }
  };

  useEffect(() => {
    const manageWebcamStream = async () => {
      console.log("TieForm: manageWebcamStream useEffect triggered. DialogOpen:", isWebcamDialogOpen, "CapturedDataUrl:", !!capturedImageDataUrl);
      if (!isWebcamDialogOpen || capturedImageDataUrl) { 
        if (webcamStream) {
          stopWebcam();
        }
        return;
      }

      if (webcamStream) { 
        stopWebcam();
      }
      setIsSwitchingCamera(true);
      console.log("TieForm: manageWebcamStream - attempting to start new stream. SwitchingCamera: true");

      try {
        let devicesToUse = videoDevices;
        if (devicesToUse.length === 0 && hasCameraPermission !== false) {
          console.log("TieForm: manageWebcamStream - no devices in state, trying to enumerate again.");
          const tempStreamForPerm = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStreamForPerm.getTracks().forEach(track => track.stop());
          const enumeratedDevices = await navigator.mediaDevices.enumerateDevices();
          const availableVideoDevices = enumeratedDevices.filter(d => d.kind === 'videoinput');
          console.log("TieForm: manageWebcamStream - re-enumerated devices:", availableVideoDevices);
          if (availableVideoDevices.length === 0) {
            toast({ variant: "destructive", title: "Nenhuma câmera encontrada" });
            setHasCameraPermission(false); setIsSwitchingCamera(false); return;
          }
          setVideoDevices(availableVideoDevices);
          devicesToUse = availableVideoDevices;
          if (currentVideoDeviceIndex >= availableVideoDevices.length && availableVideoDevices.length > 0) {
            setCurrentVideoDeviceIndex(0);
            console.log("TieForm: manageWebcamStream - reset currentVideoDeviceIndex to 0.");
          }
        }
        
        if (devicesToUse.length === 0) {
             toast({ variant: "destructive", title: "Câmeras não carregadas"});
             setHasCameraPermission(false); setIsSwitchingCamera(false); 
             console.log("TieForm: manageWebcamStream - no devices to use after checks.");
             return;
        }

        const deviceIdToUse = devicesToUse[currentVideoDeviceIndex]?.deviceId;
        console.log("TieForm: manageWebcamStream - attempting to use deviceId:", deviceIdToUse, "at index:", currentVideoDeviceIndex);

        if (!deviceIdToUse) {
            console.warn("TieForm: manageWebcamStream - Target deviceId not found. Current index:", currentVideoDeviceIndex, "Devices:", devicesToUse);
            if (devicesToUse.length > 0) {
                setCurrentVideoDeviceIndex(0); 
                setIsSwitchingCamera(false); 
                return; 
            } else {
                toast({ variant: "destructive", title: "Nenhuma câmera disponível"});
                setHasCameraPermission(false); setIsSwitchingCamera(false); return;
            }
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: { exact: deviceIdToUse },
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
          }
        });
        console.log("TieForm: manageWebcamStream - camera stream acquired.");
        setHasCameraPermission(true);
        setWebcamStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

      } catch (error: any) {
        console.error('TieForm: manageWebcamStream - Error accessing camera:', error);
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
        console.log("TieForm: manageWebcamStream - finished. SwitchingCamera: false");
      }
    };

    if (isWebcamDialogOpen) {
      manageWebcamStream();
    }

    return () => { 
      if (webcamStream) {
        stopWebcam();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebcamDialogOpen, capturedImageDataUrl, currentVideoDeviceIndex, videoDevices]); // Added videoDevices to dependencies as it's now managed more dynamically


  const handleSwitchCamera = () => {
    if (videoDevices.length > 1 && !isSwitchingCamera) {
      console.log("TieForm: handleSwitchCamera called.");
      setCapturedImageDataUrl(null); 
      const nextIndex = (currentVideoDeviceIndex + 1) % videoDevices.length;
      setCurrentVideoDeviceIndex(nextIndex); 
      console.log("TieForm: Switched camera to index:", nextIndex);
    }
  };

  const handleCaptureImage = () => {
    console.log("TieForm: handleCaptureImage called.");
    if (videoRef.current && canvasRef.current && webcamStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); 
        setCapturedImageDataUrl(dataUrl); 
        console.log("TieForm: Image captured from webcam.");
      }
    } else {
      toast({ variant: "destructive", title: "Erro ao capturar", description: "Não foi possível acessar a stream de vídeo."});
      console.error("TieForm: Failed to capture image, videoRef, canvasRef or webcamStream not available.");
    }
  };

  const handleRetakePhoto = () => {
    console.log("TieForm: handleRetakePhoto called.");
    setCapturedImageDataUrl(null); 
  };

  const handleUseCapturedImage = async () => {
    console.log("TieForm: handleUseCapturedImage called.");
    if (capturedImageDataUrl) {
      try {
        const blob = await dataURItoBlobInForm(capturedImageDataUrl);
        const filename = `webcam_capture_${Date.now()}.jpg`;
        const tempFile = new File([blob], filename, { type: 'image/jpeg' });
        console.log("TieForm: Webcam image converted to File:", tempFile);
        
        const processedFile = await compressImageIfNeeded(tempFile);
        console.log("TieForm: Webcam image processed by compressImageIfNeeded. Result:", processedFile);
        setImageFileLocal(processedFile);
        form.setValue('imageFile', processedFile, { shouldValidate: true });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
          console.log("TieForm: Preview URL set from captured webcam image:", reader.result as string);
        };
        reader.readAsDataURL(processedFile);

        setCapturedImageDataUrl(null); 
        form.setValue('imageUrl', undefined, { shouldValidate: true }); // Clear imageUrl if using imageFile
        console.log("TieForm: imageFile set from webcam, imageUrl cleared (set to undefined for Zod default).");
        
        setIsWebcamDialogOpen(false);
        stopWebcam();

      } catch (error) {
        console.error("TieForm: Error processing webcam image:", error);
        toast({ title: "Erro ao Processar Foto", description: "Não foi possível processar a foto da webcam. Tente novamente.", variant: "destructive" });
        // Fallback logic
        const blob = await dataURItoBlobInForm(capturedImageDataUrl); // Ensure this doesn't fail if first one did
        const tempFile = new File([blob], `webcam_capture_fallback_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFileLocal(tempFile);
        form.setValue('imageFile', tempFile, { shouldValidate: true });
        setPreviewUrl(capturedImageDataUrl);
        form.setValue('imageUrl', undefined, { shouldValidate: true });
        
        setIsWebcamDialogOpen(false);
        stopWebcam();
      }
    }
  };
  
  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitFromHookForm)} className="space-y-6">
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
                <FormLabel htmlFor="imageFile">Imagem</FormLabel>
                <div className="flex items-center gap-2">
                    <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="dark:file:text-primary-foreground"
                        id="imageFile" 
                    />
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
                <FormField
                    control={form.control}
                    name="imageFile" // This field is for the File object
                    render={({ fieldState }) => <FormMessage>{fieldState.error?.message}</FormMessage>} 
                />
                 <FormField
                    control={form.control}
                    name="imageUrl" // This field is for the URL string
                    render={({ fieldState }) => <FormMessage>{fieldState.error?.message}</FormMessage>}
                />
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

    <AlertDialog open={isWebcamDialogOpen} onOpenChange={(open) => { setIsWebcamDialogOpen(open); if (!open) stopWebcam(); }}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar Foto com Webcam</AlertDialogTitle>
          <AlertDialogDescription>
            Posicione a gravata e capture a imagem. Você pode trocar de câmera se houver mais de uma disponível.
          </AlertDialogDescription>
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
          
          <div className={`bg-muted rounded-md overflow-hidden border ${hasCameraPermission && !capturedImageDataUrl ? 'block' : 'hidden'}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-contain bg-black" />
          </div>

          {capturedImageDataUrl && (
            <div className="bg-muted rounded-md overflow-hidden border">
              <Image src={capturedImageDataUrl} alt="Foto Capturada" width={480} height={360} className="w-full aspect-video object-contain bg-black" data-ai-hint="gravata moda"/>
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
                <AlertDialogCancel onClick={() => { setIsWebcamDialogOpen(false); stopWebcam(); setCapturedImageDataUrl(null); }} className="w-full sm:w-auto">Fechar</AlertDialogCancel>
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
                Adicione uma nova categoria ou remova categorias existentes da sua lista pessoal.
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
                ? `Tem certeza que deseja remover a categoria "${UNCATEGORIZED_LABEL}" dos filtros? Gravatas nesta categoria manterão esta designação até serem editadas ou a categoria ser recriada.`
                : `Tem certeza que deseja remover a categoria "${categoryToDelete}"? As gravatas atualmente nesta categoria serão movidas para "${UNCATEGORIZED_LABEL}".`}
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
