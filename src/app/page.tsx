
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

// Helper to convert File to Data URI for storing in Firestore (reintroduces 1MB limit issue)
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

const loggableFirestoreData = (data: any) => {
  return JSON.stringify(data, (key, value) => {
    if (key === 'imageUrl' && typeof value === 'string' && value.startsWith('data:')) {
      return value.substring(0, 100) + '... [Data URI Truncated]';
    }
    if (key === 'imageFile' && value && typeof value === 'object' && value.name) {
        return `[File: ${value.name}, Size: ${value.size}]`;
    }
    if (key === 'imageFile' && value && typeof value === 'object' && Object.keys(value).length === 0) {
        return '[Empty File Object (likely null or not selected)]';
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
  handleIncrementStock,
  handleDecrementStock,
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
  handleIncrementStock: (id: string) => void;
  handleDecrementStock: (id: string) => void;
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
                    <TieCard 
                        key={tie.id} 
                        tie={tie} 
                        onEdit={handleEditTie} 
                        onDelete={() => handleDeleteTie(tie.id, tie.imageUrl)}
                        onIncrementStock={handleIncrementStock}
                        onDecrementStock={handleDecrementStock}
                    />
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
      console.log("HomePage: onAuthStateChanged triggered. User:", user ? user.uid : 'null');
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        router.push('/login');
      }
      setAuthChecked(true);
      console.log("HomePage: authChecked set to true.");
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
         console.error("HomePage: Erro ao buscar dados do Firestore:", error);
         toast({
           variant: "destructive",
           title: "Erro ao Carregar Dados",
           description: `Não foi possível carregar os dados. Detalhe: ${error.message || 'Erro desconhecido no servidor.'}`,
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
    console.log("HomePage: handleAddCategory called for category:", categoryName);
    if (!isClientLoaded || !authChecked || !currentUser?.uid) {
        console.warn("HomePage: handleAddCategory - Aborted due to guard conditions.");
        return false;
    }
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
      console.log("HomePage: Category added successfully.");
      return true;
    } catch (error) {
      console.error("HomePage: Erro ao adicionar categoria no Firestore:", error);
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
    console.log("HomePage: handleDeleteCategory called for category:", categoryBeingDeleted);

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
      console.log("HomePage: Category deleted successfully.");
    } catch (error) {
      console.error("HomePage: Erro ao remover categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a categoria.", variant: "destructive" });
    } finally {
      setCategoryToDelete(null);
      setIsConfirmDeleteCategoryOpen(false);
    }
  }, [activeCategory, toast, isClientLoaded, authChecked, currentUser, categoryToDelete, categories, ties]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    console.log("HomePage: handleFormSubmit called. Data from form:", loggableFirestoreData(data));
    if (!isClientLoaded || !authChecked || !currentUser?.uid) {
      console.warn("HomePage: handleFormSubmit - Aborted due to guard conditions not met.");
      toast({ title: "Erro", description: "Usuário não autenticado ou cliente não carregado.", variant: "destructive" });
      return;
    }

    const userUid = currentUser.uid;
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;
    
    let finalImageUrl = PLACEHOLDER_IMAGE_URL;

    if (data.imageFile && data.imageFile.size > 0) { // Prioritize new file
      console.log("HomePage: handleFormSubmit - imageFile present. Converting to Data URI...");
      try {
          finalImageUrl = await fileToDataURL(data.imageFile);
          console.log("HomePage: handleFormSubmit - Converted imageFile to Data URI (truncated):", finalImageUrl.substring(0,100) + "...");
      } catch (fileError) {
          console.error("HomePage: Error converting imageFile to Data URI:", fileError);
          toast({ title: "Erro na Imagem", description: "Não foi possível processar o arquivo de imagem. Usando imagem padrão.", variant: "destructive" });
          finalImageUrl = PLACEHOLDER_IMAGE_URL;
      }
    } else if (data.imageUrl && data.imageUrl.startsWith('data:')) { // Webcam image or existing Data URI from edit
        console.log("HomePage: handleFormSubmit - data.imageUrl is a Data URI.");
        finalImageUrl = data.imageUrl;
    } else if (editingTie?.id && data.imageUrl && !data.imageUrl.startsWith('data:')) { // Editing, imageUrl is a URL (not data URI), no new file/webcam
        console.log("HomePage: handleFormSubmit - Editing, using existing URL from data.imageUrl:", data.imageUrl);
        finalImageUrl = data.imageUrl;
    } else if (editingTie?.id && editingTie.imageUrl && !editingTie.imageUrl.startsWith('data:')) { // Editing, using existing URL from editingTie.imageUrl
        console.log("HomePage: handleFormSubmit - Editing, using existing URL from editingTie.imageUrl:", editingTie.imageUrl);
        finalImageUrl = editingTie.imageUrl;
    }
    // If somehow it's still not a valid URL (e.g. empty string from form data if not handled above), default to placeholder.
    if (!finalImageUrl || (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('data:'))) {
        console.warn("HomePage: handleFormSubmit - finalImageUrl was invalid, defaulting to placeholder. Was:", finalImageUrl);
        finalImageUrl = PLACEHOLDER_IMAGE_URL;
    }


    const firestoreObject: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      valueInQuantity: data.valueInQuantity!, // User sets this independently
      category: tieCategory,
      imageUrl: finalImageUrl,
    };
    console.log("HomePage: handleFormSubmit - Final object for Firestore (imageUrl possibly truncated in log):", loggableFirestoreData(firestoreObject));

    try {
      if (editingTie?.id) {
        console.log(`HomePage: handleFormSubmit (Edit) - Attempting to update tie ID ${editingTie.id} for user ${userUid}. Data:`, loggableFirestoreData(firestoreObject));
        await updateTieInFirestore(userUid, editingTie.id, firestoreObject);
        setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...firestoreObject, id: editingTie.id! } : t));
        toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
      } else {
        console.log(`HomePage: handleFormSubmit (Add) - Attempting to add new tie for user ${userUid}. Data:`, loggableFirestoreData(firestoreObject));
        const newTie = await addTieToFirestore(userUid, firestoreObject);
        setTies(prevTies => [{ ...newTie, imageUrl: finalImageUrl }, ...prevTies]);
        toast({ title: "Gravata Adicionada", description: `${newTie.name} foi adicionada.` });
      }

      if (!categories.includes(tieCategory) && tieCategory !== UNCATEGORIZED_LABEL) {
        console.log(`HomePage: handleFormSubmit - Adding new category "${tieCategory}" to Firestore and local state.`);
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
        if(tieCategory !== UNCATEGORIZED_LABEL && !(await getCategoriesFromFirestore(userUid, [])).includes(tieCategory)) {
            await addCategoryToFirestore(userUid, tieCategory);
        }
      } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
         setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
      }

    } catch (error: any) {
      console.error("HomePage: Erro ao salvar gravata no Firestore:", error);
      console.error("HomePage: Data submitted that caused error:", loggableFirestoreData(data));
      console.error("HomePage: Firestore object that caused error:", loggableFirestoreData(firestoreObject));
      let description = "Não foi possível salvar a gravata.";
      
      if (error.message) {
        description = error.message;
         if (error.message.includes("longer than 1048487 bytes")) {
            description = "A imagem é muito grande (maior que 1MB) e não pôde ser salva. Tente uma imagem menor ou use uma imagem padrão.";
            
            // Attempt to save/update with placeholder
            const fallbackObject = { ...firestoreObject, imageUrl: PLACEHOLDER_IMAGE_URL };
            try {
                if (editingTie?.id) {
                    await updateTieInFirestore(userUid, editingTie.id, fallbackObject);
                    setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...fallbackObject, id: editingTie.id! } : t));
                    toast({ title: "Gravata Atualizada (com Imagem Padrão)", description: `${data.name} foi atualizada, mas a imagem era muito grande e foi substituída por uma padrão.` });
                } else {
                    // For new ties, we can't simply re-add as it might duplicate.
                    // The initial add might have failed completely.
                    // Or, if we created a doc shell, update that.
                    // For simplicity now, just inform user, they might need to re-add.
                    toast({ title: "Gravata Não Adicionada", description: `A imagem para ${data.name} era muito grande. A gravata não foi adicionada. Tente novamente com uma imagem menor ou sem imagem.` });
                }
                description = ""; // Clear original error message as we handled it
            } catch (fallbackError: any) {
                console.error("HomePage: Error saving/updating tie with fallback image:", fallbackError);
                description = `Não foi possível salvar a gravata. A imagem original era muito grande e a tentativa de salvar com imagem padrão também falhou: ${fallbackError.message}`;
            }
        } else if (error.message.includes("An unexpected response was received from the server")) {
             description = "O servidor retornou uma resposta inesperada. Verifique os logs do servidor ou tente novamente mais tarde.";
        }
      }
      if(description) {
        toast({ title: "Erro ao Salvar", description, variant: "destructive" });
      }
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
    console.log("HomePage: handleFormSubmit finished. Dialog closed.");
  }, [categories, editingTie, toast, isClientLoaded, authChecked, currentUser]);


  const handleEditTie = (tie: Tie) => {
    console.log("HomePage: handleEditTie called for tie:", tie.id, loggableFirestoreData(tie));
    setEditingTie({ 
        ...tie, 
        imageFile: null, // Reset imageFile when opening for edit
        imageUrl: tie.imageUrl || PLACEHOLDER_IMAGE_URL // Ensure imageUrl is a valid URL string
    }); 
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string, imageUrl?: string) => {
    console.log("HomePage: handleDeleteTie called for tie ID:", id, "ImageUrl:", imageUrl);
    if (!isClientLoaded || !authChecked || !currentUser?.uid) return;
    const tieToDelete = ties.find(t => t.id === id);
    const userUid = currentUser.uid;

    try {
      console.log("HomePage: Deleting tie from Firestore, ID:", id);
      await deleteTieFromFirestore(userUid, id);
      setTies(prevTies => prevTies.filter(tie => tie.id !== id));
      toast({ title: "Gravata Removida", description: `${tieToDelete?.name || "Gravata"} foi removida.`, variant: "destructive" });
      console.log("HomePage: Tie deleted successfully.");
    } catch (error) {
      console.error("HomePage: Erro ao remover gravata:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a gravata.", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    console.log("HomePage: openAddDialog called.");
    setEditingTie(undefined); // Clear any editing state
    setIsDialogOpen(true);
  };

  const handleLogout = async () => {
    console.log("HomePage: handleLogout called.");
    try {
      await signOut(auth);
      console.log("HomePage: User signed out.");
    } catch (error) {
      console.error("HomePage: Erro ao fazer logout:", error);
      toast({ title: "Erro", description: "Não foi possível fazer logout.", variant: "destructive"});
    }
  };


  const handleIncrementStock = async (tieId: string) => {
    if (!currentUser?.uid) return;
    const userUid = currentUser.uid;
    const tieToUpdate = ties.find(t => t.id === tieId);

    if (tieToUpdate) {
      const newQuantity = (tieToUpdate.quantity || 0) + 1;
      const updatedTiePartialData = { quantity: newQuantity };

      try {
        await updateTieInFirestore(userUid, tieId, updatedTiePartialData as Partial<Omit<Tie, 'id'>>);
        setTies(prevTies => prevTies.map(t => t.id === tieId ? { ...t, quantity: newQuantity } : t));
      } catch (error: any) {
        console.error("Error incrementing stock:", error);
        toast({ variant: "destructive", title: "Erro ao Atualizar Estoque", description: error.message });
      }
    }
  };

  const handleDecrementStock = async (tieId: string) => {
    if (!currentUser?.uid) return;
    const userUid = currentUser.uid;
    const tieToUpdate = ties.find(t => t.id === tieId);

    if (tieToUpdate && (tieToUpdate.quantity || 0) > 0) {
      const newQuantity = (tieToUpdate.quantity || 0) - 1;
      const updatedTiePartialData = { quantity: newQuantity };
      
      try {
        await updateTieInFirestore(userUid, tieId, updatedTiePartialData as Partial<Omit<Tie, 'id'>>);
        setTies(prevTies => prevTies.map(t => t.id === tieId ? { ...t, quantity: newQuantity } : t));
      } catch (error: any) {
        console.error("Error decrementing stock:", error);
        toast({ variant: "destructive", title: "Erro ao Atualizar Estoque", description: error.message });
      }
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
        handleIncrementStock={handleIncrementStock}
        handleDecrementStock={handleDecrementStock}
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

    