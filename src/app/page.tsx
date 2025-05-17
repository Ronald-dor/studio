
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, LogOut, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNCATEGORIZED_LABEL } from '@/lib/types';

import * as tieService from '@/services/tieService';
import * as categoryService from '@/services/categoryService';

// initialTiesData and defaultCategories are no longer primary source of truth if Firestore is used.
// They could be used for a first-time seeding mechanism if desired, but that's out of scope here.

export default function HomePage() {
  const router = useRouter();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true); // For Firestore data

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  // Authentication and Client Load Check
  useEffect(() => {
    const authStatus = localStorage.getItem('tieTrackAuth') === 'true';
    setIsAuthenticated(authStatus);
    setIsClientLoaded(true); 
    setCurrentYear(new Date().getFullYear());

    if (!authStatus) {
      router.push('/login');
    }
  }, [router]);

  // Fetch initial data from Firestore
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    const fetchInitialData = async () => {
      setIsDataLoading(true);
      try {
        const [fetchedTies, fetchedCategories] = await Promise.all([
          tieService.getTies(),
          categoryService.getCategories()
        ]);
        
        setTies(fetchedTies);
        // Ensure UNCATEGORIZED_LABEL is present if some ties use it and it's not in fetchedCategories
        const uniqueCategoriesFromTies = Array.from(new Set(fetchedTies.map(t => t.category || UNCATEGORIZED_LABEL)));
        let allCats = new Set(fetchedCategories);
        uniqueCategoriesFromTies.forEach(cat => allCats.add(cat));
        
        const finalCategories = Array.from(allCats).sort();
        // Ensure "Sem Categoria" is in the list if ties use it or no other categories exist
        const hasUncategorizedTies = fetchedTies.some(t => t.category === UNCATEGORIZED_LABEL || !t.category);
        if ( (hasUncategorizedTies || finalCategories.length === 0) && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
            finalCategories.push(UNCATEGORIZED_LABEL);
            finalCategories.sort();
        }
        setCategories(finalCategories);

      } catch (error) {
         console.error("Failed to fetch data from Firebase:", error);
         toast({
           variant: "destructive",
           title: "Erro ao Carregar Dados",
           description: "Não foi possível buscar os dados do servidor. Tente novamente mais tarde.",
         });
         // Fallback to empty arrays or minimal defaults if Firestore fails
         setTies([]);
         setCategories([UNCATEGORIZED_LABEL]);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchInitialData();
  }, [isClientLoaded, isAuthenticated, toast]);


  // Ensure UNCATEGORIZED_LABEL logic (UI concern for tabs/filters)
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true || isDataLoading) return;

    const hasActualUncategorizedTies = ties.some(tie => tie.category === UNCATEGORIZED_LABEL || !tie.category);
    const uncategorizedLabelExistsInState = categories.includes(UNCATEGORIZED_LABEL);
  
    if (hasActualUncategorizedTies && !uncategorizedLabelExistsInState) {
      setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
    } else if (!hasActualUncategorizedTies && uncategorizedLabelExistsInState && categories.length > 1) {
      // Optional: remove UNCATEGORIZED_LABEL if no ties use it and other categories exist
      // setCategories(prevCategories => prevCategories.filter(cat => cat !== UNCATEGORIZED_LABEL).sort());
    } else if (categories.length === 0 && !uncategorizedLabelExistsInState) {
        // If all categories were deleted and no ties, ensure "Sem Categoria" is an option
        setCategories([UNCATEGORIZED_LABEL]);
    }
  }, [ties, categories, isClientLoaded, isAuthenticated, isDataLoading]);


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
    // TODO: Firebase Integration: If using Firebase Storage, this function would upload the image
    // to Storage and return the public URL. For now, it returns Data URI.
    if (imageFile) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(imageFile);
      });
    }
    return currentImageUrl || `https://placehold.co/300x400.png`;
  };

  const handleAddCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    if (!isClientLoaded || isAuthenticated !== true) return false;
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
      return false;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erro", description: `A categoria "${trimmedName}" já existe.`, variant: "destructive" });
      return false;
    }
    if (trimmedName === UNCATEGORIZED_LABEL) {
      toast({ title: "Erro", description: `"${UNCATEGORIZED_LABEL}" é uma categoria reservada.`, variant: "destructive" });
      return false;
    }

    try {
      await categoryService.addCategory(trimmedName);
      setCategories(prevCategories => Array.from(new Set([...prevCategories, trimmedName])).sort());
      toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
      return true;
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({ title: "Erro ao Adicionar Categoria", description: "Não foi possível salvar a nova categoria.", variant: "destructive" });
      return false;
    }
  }, [categories, toast, isClientLoaded, isAuthenticated]);

  const handleDeleteCategory = useCallback(async (categoryToDelete: TieCategory) => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    let toastMessage = "";
    try {
      if (categoryToDelete !== UNCATEGORIZED_LABEL) {
        await categoryService.deleteCategory(categoryToDelete); // Delete from managed list
        await tieService.batchUpdateTieCategories(categoryToDelete, UNCATEGORIZED_LABEL); // Move ties
        
        setTies(prevTies => prevTies.map(tie => {
            if (tie.category === categoryToDelete) {
                return { ...tie, category: UNCATEGORIZED_LABEL };
            }
            return tie;
        }));
        toastMessage = `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
      } else {
        // "Sem Categoria" is not in Firestore's explicit list, so we just update UI state.
        // Ties will retain "Sem Categoria", but it won't be an active filter unless ties still use it.
        toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação.`;
      }
      
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete).sort();
       // Ensure "Sem Categoria" exists if there are ties using it or if no other categories remain
      const hasUncategorizedTiesNow = ties.some(tie => (tie.category === UNCATEGORIZED_LABEL || !tie.category) && tie.category !== categoryToDelete);
      if ((hasUncategorizedTiesNow || updatedCategories.length === 0) && !updatedCategories.includes(UNCATEGORIZED_LABEL)) {
          updatedCategories.push(UNCATEGORIZED_LABEL);
          updatedCategories.sort();
      }
      setCategories(updatedCategories); 
      
      if (activeTab === categoryToDelete) {
          setActiveTab("Todas");
      }
      toast({ title: "Categoria Removida", description: toastMessage });

    } catch (error) {
      console.error("Failed to delete category or update ties:", error);
      toast({ title: "Erro ao Remover Categoria", description: "Não foi possível remover a categoria ou atualizar as gravatas.", variant: "destructive" });
    }
  }, [ties, categories, activeTab, toast, isClientLoaded, isAuthenticated]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    
    // TODO: Firebase Storage integration for imageFile
    // For now, processImageAndGetUrl generates a Data URI which will be saved to Firestore.
    // This is not ideal for production due to Firestore document size limits.
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;

    const tieDataForSave: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      valueInQuantity: data.valueInQuantity || 0,
      category: tieCategory,
      imageUrl: finalImageUrl,
    };

    try {
      if (editingTie?.id) {
        const updatedTie = await tieService.updateTie(editingTie.id, {...tieDataForSave, id: editingTie.id});
        if (updatedTie) { 
          setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? updatedTie : t));
          toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
        } else {
          throw new Error("Update operation did not return a tie.");
        }
      } else {
        const newTieFromBackend = await tieService.addTie(tieDataForSave);
        setTies(prevTies => [...prevTies, newTieFromBackend]);
        toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
      }

      // Add category to managed list if new and not "Sem Categoria"
      if (tieCategory !== UNCATEGORIZED_LABEL && !categories.includes(tieCategory)) { 
        await categoryService.addCategory(tieCategory); // Add to Firestore list
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
      } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
        // Ensure "Sem Categoria" is in UI list if a tie is assigned to it
        setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
      }


    } catch (error) {
      console.error("Failed to save tie:", error);
      toast({ title: "Erro ao Salvar Gravata", description: "Não foi possível salvar a gravata.", variant: "destructive" });
    } finally {
      setEditingTie(undefined);
      setIsDialogOpen(false);
    }
  }, [categories, editingTie, toast, isClientLoaded, isAuthenticated]);

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const tieToDelete = ties.find(t => t.id === id);
    
    try {
      await tieService.deleteTie(id);
      setTies(prevTies => prevTies.filter(t => t.id !== id));
      if (tieToDelete) {
        toast({ title: "Gravata Removida", description: `${tieToDelete.name} foi removida.`, variant: "destructive" });
      }
       // Check if UNCATEGORIZED_LABEL needs to be removed from categories list if no ties use it anymore
      const remainingTies = ties.filter(t => t.id !== id);
      const stillHasUncategorized = remainingTies.some(t => t.category === UNCATEGORIZED_LABEL || !t.category);
      if (!stillHasUncategorized && categories.includes(UNCATEGORIZED_LABEL) && categories.length > 1) {
        // setCategories(prev => prev.filter(c => c !== UNCATEGORIZED_LABEL));
      } else if (remainingTies.length === 0 && categories.length === 1 && categories.includes(UNCATEGORIZED_LABEL)){
        // If all ties are gone, "Sem Categoria" might be the only one left.
      }

    } catch (error) {
      console.error("Failed to delete tie:", error);
      toast({ title: "Erro ao Remover Gravata", description: "Não foi possível remover a gravata.", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingTie(undefined);
    setIsDialogOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tieTrackAuth');
    setIsAuthenticated(false); 
    router.push('/login'); 
    toast({ title: "Logout Realizado", description: "Você foi desconectado." });
  };


  if (!isClientLoaded || isAuthenticated === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Carregando aplicação...</p>
      </div>
    );
  }

  if (isAuthenticated === false) { 
    // This state should be brief as the useEffect hook (handling auth check) redirects.
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando para o login...</p>
      </div>
    );
  }
  
  // Main application content
  const filteredTies = ties.filter(tie =>
    tie.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ensure categories are sorted and "Todas" is first, "Sem Categoria" is second if present.
  const sortedCategoriesState = Array.from(new Set(categories)).sort((a, b) => {
    if (a === UNCATEGORIZED_LABEL) return -1; // Prioritize UNCATEGORIZED_LABEL after "Todas"
    if (b === UNCATEGORIZED_LABEL) return 1;
    return a.localeCompare(b);
  });

  const tabsToDisplay: TieCategory[] = ["Todas"];
  if (sortedCategoriesState.includes(UNCATEGORIZED_LABEL)) {
      tabsToDisplay.push(UNCATEGORIZED_LABEL);
  }
  sortedCategoriesState.forEach(cat => {
      if (cat !== UNCATEGORIZED_LABEL && !tabsToDisplay.includes(cat)) { 
          tabsToDisplay.push(cat);
      }
  });
   if (tabsToDisplay.length === 1 && !categories.includes(UNCATEGORIZED_LABEL) && ties.some(t => t.category === UNCATEGORIZED_LABEL || !t.category)){
    // This edge case might be needed if categories from firestore is empty but ties have "Sem Categoria"
    // tabsToDisplay.push(UNCATEGORIZED_LABEL)
  }


  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning={true}>
      <header className="py-6 px-4 md:px-8 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Shirt size={32} className="text-primary" />
            <h1 className="text-3xl font-bold text-primary">TieTrack</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto md:min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar gravatas por nome..."
                className="pl-10 pr-4 py-2 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={openAddDialog} variant="default" className="w-full sm:w-auto">
              <PlusCircle size={20} className="mr-2" /> Adicionar Nova Gravata
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto">
              <LogOut size={20} className="mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {isDataLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap justify-start gap-2 mb-6 pb-2 border-b border-border">
              {tabsToDisplay.map((category) => (
                <div key={category} className="relative group">
                  <TabsTrigger value={category} className="text-sm px-3 py-1.5 h-auto">
                    {category}
                  </TabsTrigger>
                </div>
              ))}
            </TabsList>

            {tabsToDisplay.map((category) => {
              const tiesForTab = category.toLowerCase() === "todas"
                ? filteredTies
                : filteredTies.filter(tie => (tie.category || UNCATEGORIZED_LABEL) === category);
              return (
                <TabsContent key={category} value={category} className="mt-0">
                  <TieList
                    ties={tiesForTab}
                    onEdit={handleEditTie}
                    onDelete={handleDeleteTie}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
      
      <AddTieDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={editingTie}
          allCategories={categories.filter(cat => cat !== UNCATEGORIZED_LABEL)} // Pass managed categories
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
      />
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}
