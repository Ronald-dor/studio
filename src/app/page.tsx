
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, LogOut, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UNCATEGORIZED_LABEL, PLACEHOLDER_IMAGE_URL } from '@/lib/types';
import { TieCard } from '@/components/TieCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  getTiesFromFirestore, 
  addTieToFirestore, 
  updateTieInFirestore, 
  deleteTieFromFirestore,
  batchUpdateTieCategoriesInFirestore
} from '@/services/tieService';
import { 
  getCategoriesFromFirestore, 
  addCategoryToFirestore, 
  deleteCategoryFromFirestore 
} from '@/services/categoryService';
import { uploadImageAndGetURL, deleteImageFromStorage } from '@/services/imageService';
import { getAuth, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader as UiSidebarHeader,
  SidebarContent,
  SidebarFooter as UiSidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';

const defaultCategoriesForSeed: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];

async function dataURItoBlob(dataURI: string): Promise<Blob> {
  const response = await fetch(dataURI);
  const blob = await response.blob();
  return blob;
}

// Helper for logging data to be sent to Firestore, truncating Data URIs
const loggableFirestoreData = (data: any) => {
  return JSON.stringify(data, (key, value) => {
    if (key === 'imageUrl' && typeof value === 'string' && value.startsWith('data:')) {
      return value.substring(0, 100) + '... [Data URI Truncated]';
    }
    return value;
  }, 2);
};


function MainContentLayout({
  currentUser,
  ties,
  categories,
  isLoadingData,
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  currentYear,
  handleLogout,
  openAddDialog,
  handleEditTie,
  handleDeleteTie,
}: {
  currentUser: FirebaseUser;
  ties: Tie[];
  categories: TieCategory[];
  isLoadingData: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  currentYear: number | null;
  handleLogout: () => void;
  openAddDialog: () => void;
  handleEditTie: (tie: Tie) => void;
  handleDeleteTie: (id: string, imageUrl?: string) => void;
}) {
  const { toggleSidebar } = useSidebar();

  const filteredTies = ties.filter(tie => {
    const matchesSearchTerm = tie.name.toLowerCase().includes(searchTerm.toLowerCase());
    const currentTieCategory = tie.category || UNCATEGORIZED_LABEL;
    const matchesCategory = activeCategory === "Todas" || currentTieCategory === activeCategory;
    return matchesSearchTerm && matchesCategory;
  });

  const sidebarMenuItems: TieCategory[] = ["Todas"];
  const sortedCategoriesState = Array.from(new Set(categories)).sort();
  if (sortedCategoriesState.includes(UNCATEGORIZED_LABEL)) {
      sidebarMenuItems.push(UNCATEGORIZED_LABEL);
  }
  sortedCategoriesState.forEach(cat => {
      if (cat !== UNCATEGORIZED_LABEL && !sidebarMenuItems.includes(cat)) { 
          sidebarMenuItems.push(cat);
      }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex" suppressHydrationWarning={true}>
      <Sidebar className="border-r" collapsible="offcanvas">
        <UiSidebarHeader className="p-4 flex items-center gap-2">
          <Shirt size={24} className="text-sidebar-primary" />
          <h1 className="text-xl font-semibold text-sidebar-primary">TieTrack</h1>
        </UiSidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {sidebarMenuItems.map((category) => (
              <SidebarMenuItem key={category}>
                <SidebarMenuButton
                  onClick={() => setActiveCategory(category)}
                  isActive={activeCategory === category}
                  className="w-full justify-start"
                >
                  {category}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
         <UiSidebarFooter className="p-2 border-t">
           <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut size={16} className="mr-2" /> Sair
            </Button>
         </UiSidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 flex flex-col">
        <header className="py-4 px-4 md:px-8 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-2">
            <div className="flex items-center space-x-2">
               <Button variant="ghost" onClick={toggleSidebar} className="flex items-center px-2 py-1 h-auto text-base font-semibold md:text-lg">
                <Shirt size={20} className="mr-2" /> 
                <span>TieTrack</span>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto md:flex-1 md:justify-end">
              <div className="relative w-full sm:w-auto md:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Pesquisar por nome..."
                  className="pl-10 pr-4 py-2 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={openAddDialog} variant="default" className="w-full sm:w-auto">
                <PlusCircle size={20} className="mr-2" /> Nova Gravata
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 md:p-8 overflow-y-auto">
          {isLoadingData ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Carregando dados do servidor...</p>
            </div>
          ) : (
             <>
               {filteredTies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTies.map((tie) => (
                    <TieCard key={tie.id} tie={tie} onEdit={handleEditTie} onDelete={() => handleDeleteTie(tie.id, tie.imageUrl)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xl text-muted-foreground">Nenhuma gravata para exibir.</p>
                  <p className="text-sm text-muted-foreground">Tente uma categoria ou termo de pesquisa diferente, ou adicione uma nova gravata.</p>
                </div>
              )}
             </>
          )}
        </main>
        
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
          © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
        </footer>
      </SidebarInset>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);

  const [ties, setTies] = useState<Tie[]>([]); 
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("Todas"); 
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);

  const auth = getAuth(app);

  useEffect(() => {
    setIsClientLoaded(true);
    console.log("HomePage: useEffect for onAuthStateChanged mounting.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("HomePage: onAuthStateChanged triggered. User:", user);
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        router.push('/login');
      }
      setAuthChecked(true); 
    });
    return () => {
      console.log("HomePage: useEffect for onAuthStateChanged unmounting.");
      unsubscribe();
    }
  }, [router, auth]);

  useEffect(() => {
    if (isClientLoaded) {
      setCurrentYear(new Date().getFullYear());
    }
  }, [isClientLoaded]);

  useEffect(() => {
    console.log("HomePage: Data fetching useEffect triggered. Dependencies:", { isClientLoaded, authChecked, currentUserUid: currentUser?.uid });
    if (!isClientLoaded || !authChecked || !currentUser?.uid) {
      console.log("HomePage: Data fetching useEffect - conditions not met to fetch.", { isClientLoaded, authChecked, hasCurrentUser: !!currentUser?.uid });
      if (!currentUser && authChecked && isClientLoaded) { 
        setTies([]);
        setCategories([]);
        setIsLoadingData(false); 
      }
      return;
    }
    
    const fetchData = async () => {
      const userUid = currentUser.uid;
      console.log(`HomePage: fetchData initiated for user UID: ${userUid}`);
      setIsLoadingData(true);

      try {
        const loadedTiesPromise = getTiesFromFirestore(userUid);
        const loadedCategoriesPromise = getCategoriesFromFirestore(userUid, defaultCategoriesForSeed);

        const [loadedTies, loadedCategories] = await Promise.all([
          loadedTiesPromise,
          loadedCategoriesPromise
        ]);
        
        console.log("HomePage: Successfully fetched ties and categories.", { loadedTiesCount: loadedTies.length, loadedCategories });
        setTies(loadedTies);

        let finalCategories = [...loadedCategories];
        const tiesUseUncategorized = loadedTies.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
        
        if (tiesUseUncategorized && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
          finalCategories.push(UNCATEGORIZED_LABEL);
        }
         if (finalCategories.length === 0 && !finalCategories.includes(UNCATEGORIZED_LABEL) && loadedTies.length > 0) {
           finalCategories.push(UNCATEGORIZED_LABEL);
        } else if (finalCategories.length === 0 && !finalCategories.includes(UNCATEGORIZED_LABEL) && loadedTies.length === 0 && defaultCategoriesForSeed.length === 0){
            finalCategories.push(UNCATEGORIZED_LABEL); 
        }
        setCategories(Array.from(new Set(finalCategories)).sort());

      } catch (error: any) {
         console.error("Erro ao buscar dados do Firestore:", error);
         toast({
           variant: "destructive",
           title: "Erro ao Carregar Dados",
           description: `Não foi possível carregar os dados do servidor. Detalhe: ${error.message}`,
         });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [isClientLoaded, authChecked, currentUser, toast]); 

  useEffect(() => {
    if (!isClientLoaded || isLoadingData || !authChecked || !currentUser) return;

    const tiesUseUncategorized = ties.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
    const hasUncategorizedInCategories = categories.includes(UNCATEGORIZED_LABEL);

    if (tiesUseUncategorized && !hasUncategorizedInCategories) {
        setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    } else if (categories.length === 0 && !hasUncategorizedInCategories && (ties.length > 0 || defaultCategoriesForSeed.length === 0 || categories.length === 0 )) {
       setCategories([UNCATEGORIZED_LABEL]);
    } else if (!hasUncategorizedInCategories && tiesUseUncategorized) {
        setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    }

  }, [ties, categories, isLoadingData, isClientLoaded, authChecked, currentUser, categoryToDelete]);


  const handleAddCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    if (!isClientLoaded || !authChecked || !currentUser?.uid) return false;
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
      return false;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erro", description: `A categoria "${trimmedName}" já existe.`, variant: "destructive" });
      return false;
    }
    
    try {
      await addCategoryToFirestore(currentUser.uid, trimmedName);
      setCategories(prevCategories => Array.from(new Set([...prevCategories, trimmedName])).sort());
      toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
      return true;
    } catch (error) {
      console.error("Erro ao adicionar categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível adicionar a categoria.", variant: "destructive" });
      return false;
    }
  }, [categories, toast, isClientLoaded, authChecked, currentUser]);

  const handleDeleteCategoryRequest = (category: TieCategory) => {
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const handleDeleteCategory = useCallback(async () => {
    if (!isClientLoaded || !authChecked || !currentUser?.uid || !categoryToDelete) return;

    const categoryBeingDeleted = categoryToDelete;

    try {
      let toastMessage = "";
      let newActiveCategory = activeCategory;

      if (categoryBeingDeleted !== UNCATEGORIZED_LABEL) {
        await batchUpdateTieCategoriesInFirestore(currentUser.uid, categoryBeingDeleted, UNCATEGORIZED_LABEL);
        setTies(prevTies => 
            prevTies.map(tie => 
                tie.category === categoryBeingDeleted ? { ...tie, category: UNCATEGORIZED_LABEL } : tie
            )
        );
        toastMessage = `A categoria "${categoryBeingDeleted}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
        if (activeCategory === categoryBeingDeleted) {
          newActiveCategory = UNCATEGORIZED_LABEL; 
        }
      } else {
         toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação até serem editadas ou a categoria ser recriada.`;
         if (activeCategory === UNCATEGORIZED_LABEL) {
            const nextCategory = categories.find(cat => cat !== UNCATEGORIZED_LABEL) || "Todas";
            newActiveCategory = nextCategory;
         }
      }
      
      await deleteCategoryFromFirestore(currentUser.uid, categoryBeingDeleted);
      
      setCategories(prevCategories => {
          const updated = prevCategories.filter(cat => cat !== categoryBeingDeleted);
          return updated.sort();
      }); 
      
      setActiveCategory(newActiveCategory);
      toast({ title: "Categoria Removida", description: toastMessage });
    } catch (error) {
      console.error("Erro ao remover categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a categoria.", variant: "destructive" });
    } finally {
      setCategoryToDelete(null);
      setIsConfirmDeleteCategoryOpen(false);
    }
  }, [activeCategory, toast, isClientLoaded, authChecked, currentUser, categoryToDelete, categories]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || !authChecked || !currentUser?.uid) return;

    const userUid = currentUser.uid;
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;
    let tempTieIdForImageUpload = editingTie?.id; // Used for new and existing ties for image path

    console.log("handleFormSubmit: Received data from form:", loggableFirestoreData(data));
    console.log("handleFormSubmit: Editing tie ID:", editingTie?.id);

    try {
      let finalTieObjectForFirestore: Omit<Tie, 'id'>;
      let actualTieIdForStateUpdate: string;

      if (editingTie?.id) { // Editing existing tie
        actualTieIdForStateUpdate = editingTie.id;
        tempTieIdForImageUpload = editingTie.id;
        let imageUrlForFirestore = editingTie.imageUrl || PLACEHOLDER_IMAGE_URL; // Start with existing or placeholder

        if (data.imageFile) {
          console.log("handleFormSubmit (Edit): New imageFile present. Uploading...");
          imageUrlForFirestore = await uploadImageAndGetURL(userUid, data.imageFile, tempTieIdForImageUpload, editingTie.imageUrl);
        } else if (data.imageUrl && data.imageUrl.startsWith('data:')) { // New webcam image
          console.log("handleFormSubmit (Edit): New webcam image (Data URI) present. Uploading...");
          const imageBlob = await dataURItoBlob(data.imageUrl);
          imageUrlForFirestore = await uploadImageAndGetURL(userUid, imageBlob, tempTieIdForImageUpload, editingTie.imageUrl);
        }
        // If no new imageFile or webcam data.imageUrl, imageUrlForFirestore remains editingTie.imageUrl (or placeholder)

        finalTieObjectForFirestore = {
            name: data.name!,
            quantity: data.quantity!,
            unitPrice: data.unitPrice!,
            valueInQuantity: data.valueInQuantity || 0,
            category: tieCategory,
            imageUrl: imageUrlForFirestore, // This should be a Storage URL or placeholder
        };
        
        console.log(`handleFormSubmit (Edit): Attempting to update tie ID ${tempTieIdForImageUpload} for user ${userUid}. Data:`, loggableFirestoreData(finalTieObjectForFirestore));
        await updateTieInFirestore(userUid, tempTieIdForImageUpload, finalTieObjectForFirestore);
        setTies(prevTies => prevTies.map(t => t.id === tempTieIdForImageUpload ? { ...finalTieObjectForFirestore, id: tempTieIdForImageUpload! } : t));
        toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });

      } else { // Adding new tie
        // 1. Create the basic tie data (without final image URL yet)
        const initialTieDataForFirestore: Omit<Tie, 'id'> = {
            name: data.name!,
            quantity: data.quantity!,
            unitPrice: data.unitPrice!,
            valueInQuantity: data.valueInQuantity || 0,
            category: tieCategory,
            imageUrl: PLACEHOLDER_IMAGE_URL, // Start with placeholder
        };
        
        console.log(`handleFormSubmit (Add): Attempting to add new tie for user ${userUid}. Initial data:`, loggableFirestoreData(initialTieDataForFirestore));
        const newTieDoc = await addTieToFirestore(userUid, initialTieDataForFirestore);
        actualTieIdForStateUpdate = newTieDoc.id;
        tempTieIdForImageUpload = newTieDoc.id; // ID for image path
        console.log(`handleFormSubmit (Add): New tie document created with ID: ${tempTieIdForImageUpload}`);

        let finalImageUrlForNewTie = PLACEHOLDER_IMAGE_URL;

        // 2. Upload image if provided
        if (data.imageFile) {
          console.log(`handleFormSubmit (Add): New imageFile present for new tie ${tempTieIdForImageUpload}. Uploading...`);
          finalImageUrlForNewTie = await uploadImageAndGetURL(userUid, data.imageFile, tempTieIdForImageUpload);
        } else if (data.imageUrl && data.imageUrl.startsWith('data:')) { // Webcam image
          console.log(`handleFormSubmit (Add): New webcam image (Data URI) for new tie ${tempTieIdForImageUpload}. Uploading...`);
          const imageBlob = await dataURItoBlob(data.imageUrl);
          finalImageUrlForNewTie = await uploadImageAndGetURL(userUid, imageBlob, tempTieIdForImageUpload);
        }

        // 3. Update Firestore if image was uploaded (and is not the placeholder)
        finalTieObjectForFirestore = { ...initialTieDataForFirestore, imageUrl: finalImageUrlForNewTie };

        if (finalImageUrlForNewTie !== PLACEHOLDER_IMAGE_URL) {
          console.log(`handleFormSubmit (Add): Updating tie ${tempTieIdForImageUpload} with new image URL. Data:`, loggableFirestoreData(finalTieObjectForFirestore));
          await updateTieInFirestore(userUid, tempTieIdForImageUpload, { imageUrl: finalImageUrlForNewTie }); // Only update imageUrl
        }
        
        setTies(prevTies => [{ ...finalTieObjectForFirestore, id: actualTieIdForStateUpdate }, ...prevTies]);
        toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada.` });
      }

      if (!categories.includes(tieCategory)) { 
        await addCategoryToFirestore(userUid, tieCategory); 
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
      }

    } catch (error: any) {
      console.error("Erro ao salvar gravata no Firestore:", error);
      console.error("Data submitted that caused error:", loggableFirestoreData(data));
      
      let description = "Não foi possível salvar a gravata.";
      if (error.message) {
        description = error.message;
      }
      
      // Specific handling if client-side Firestore validation catches oversized imageUrl
      if (error.message && error.message.includes("longer than 1048487 bytes")) {
        description = "A imagem é muito grande. Tente uma imagem menor.";
        // Attempt to save/update with placeholder if it was a new tie or if tempTieIdForImageUpload is set
        if (tempTieIdForImageUpload && userUid) {
            const fallbackData: Partial<Tie> = { imageUrl: PLACEHOLDER_IMAGE_URL };
            if (!editingTie?.id) { // If it was a new tie, ensure essential fields are there
                fallbackData.name = data.name!;
                fallbackData.quantity = data.quantity!;
                fallbackData.unitPrice = data.unitPrice!;
                fallbackData.category = tieCategory;
                fallbackData.valueInQuantity = data.valueInQuantity || 0;
            }
            try {
                console.warn(`handleFormSubmit (Catch): Attempting to save tie ${tempTieIdForImageUpload} with placeholder due to previous error.`);
                await updateTieInFirestore(userUid, tempTieIdForImageUpload, fallbackData as Omit<Tie, 'id'>); // Cast needed
                // Update local state to reflect placeholder
                setTies(prevTies => prevTies.map(t => t.id === tempTieIdForImageUpload ? { ...t, ...fallbackData } : t));
                description += " A gravata foi salva com uma imagem placeholder.";
            } catch (fallbackError: any) {
                console.error("Error saving tie with placeholder after image failure:", fallbackError);
                description += " Falha ao salvar com imagem placeholder.";
            }
        }
      }
      toast({ title: "Erro ao Salvar", description, variant: "destructive" });
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast, isClientLoaded, authChecked, currentUser]);


  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null }); // imageFile is for form only
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string, imageUrl?: string) => {
    if (!isClientLoaded || !authChecked || !currentUser?.uid) return;
    const tieToDelete = ties.find(t => t.id === id);
    const userUid = currentUser.uid;
    
    try {
      if (imageUrl && imageUrl !== PLACEHOLDER_IMAGE_URL && imageUrl.includes('firebasestorage.googleapis.com')) {
        await deleteImageFromStorage(imageUrl);
      }
      await deleteTieFromFirestore(userUid, id);
      setTies(prevTies => prevTies.filter(tie => tie.id !== id));
      toast({ title: "Gravata Removida", description: `${tieToDelete?.name || "Gravata"} foi removida.`, variant: "destructive" });
    } catch (error) {
      console.error("Erro ao remover gravata:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a gravata.", variant: "destructive" });
    }
  }; 

  const openAddDialog = () => {
    setEditingTie(undefined);
    setIsDialogOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle redirect and clearing currentUser
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({ title: "Erro", description: "Não foi possível fazer logout.", variant: "destructive"});
    }
  };

  if (!isClientLoaded || !authChecked || !currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">
          {!isClientLoaded || !authChecked ? "Verificando autenticação..." : "Redirecionando para o login..."}
        </p>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen={false}>
      <MainContentLayout
        currentUser={currentUser}
        ties={ties}
        categories={categories}
        isLoadingData={isLoadingData}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        currentYear={currentYear}
        handleLogout={handleLogout}
        openAddDialog={openAddDialog}
        handleEditTie={handleEditTie}
        handleDeleteTie={handleDeleteTie}
      />
      
      <AddTieDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={editingTie}
          allCategories={categories.filter(cat => cat !== UNCATEGORIZED_LABEL && cat.toLowerCase() !== 'todas')}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategoryRequest}
      />

      <AlertDialog open={isConfirmDeleteCategoryOpen} onOpenChange={setIsConfirmDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete === UNCATEGORIZED_LABEL
                ? `Tem certeza que deseja remover a categoria "${UNCATEGORIZED_LABEL}"? Gravatas nesta categoria manterão esta designação em seus dados, mas a categoria não será uma opção de filtro até ser recriada ou uma nova gravata ser adicionada sem categoria.`
                : `Tem certeza que deseja remover a categoria "${categoryToDelete}"? As gravatas nesta categoria serão movidas para "${UNCATEGORIZED_LABEL}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setCategoryToDelete(null); setIsConfirmDeleteCategoryOpen(false);}}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} variant="destructive">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
    
    