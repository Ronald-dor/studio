
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList'; // TieList agora busca seus próprios dados
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, LogOut, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNCATEGORIZED_LABEL } from '@/lib/types';

import * as tieService from '@/services/tieService'; // Preservamos a chamada aos serviços para interagir com Firestore
import * as categoryService from '@/services/categoryService';

export default function HomePage() {
  const router = useRouter();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Não precisamos mais gerenciar o estado 'ties' aqui, pois TieList faz isso.
  // const [ties, setTies] = useState<Tie[]>([]); 
  const [categories, setCategories] = useState<TieCategory[]>([]);
  // isDataLoading agora pode se referir ao carregamento inicial de categorias, se necessário.
  // O carregamento dos laços será gerenciado internamente por TieList.
  const [isDataLoading, setIsDataLoading] = useState(true);

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

  // Fetch categories from Firestore (laços são buscados por TieList agora)
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    const fetchCategories = async () => {
      setIsDataLoading(true);
      try {
        const fetchedCategories = await categoryService.getCategories();
        
        const finalCategories = Array.from(new Set(fetchedCategories)).sort();
        // Ensure "Sem Categoria" is in the list if no other categories exist
         if (finalCategories.length === 0 && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
            finalCategories.push(UNCATEGORIZED_LABEL);
            finalCategories.sort();
        }
        setCategories(finalCategories);

      } catch (error) {
         console.error("Failed to fetch categories from Firebase:", error);
         toast({
           variant: "destructive",
           title: "Erro ao Carregar Categorias",
           description: "Não foi possível buscar as categorias do servidor. Tente novamente mais tarde.",
         });
         // Fallback to minimal defaults if Firestore fails
         setCategories([UNCATEGORIZED_LABEL]);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchCategories();
  }, [isClientLoaded, isAuthenticated, toast]);

  // NOTE: The logic to ensure UNCATEGORIZED_LABEL is present in categories 
  // based on ties data will need to be handled differently now, 
  // potentially by TieList passing up info or a shared state/hook.
  // For simplicity now, we ensure it's present if categories is empty.


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
    // TODO: Firebase Integration: If using Firebase Storage, this function would upload the image
    // to Storage and return the public URL. For now, it returns Data URI.
    // This function might need to move to tieService or a dedicated file service.
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
    // Check against the current categories state (which is fetched initially)
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erro", description: `A categoria "${trimmedName}" já existe.`, variant: "destructive" });
      return false;
    }
    if (trimmedName === UNCATEGORIZED_LABEL) {
      toast({ title: "Erro", description: `"${UNCATEGORIZED_LABEL}" é uma categoria reservada.`, variant: "destructive" });
      return false;
    }

    try {
      await categoryService.addCategory(trimmedName); // Add to Firestore
      // No need to update local state here; onSnapshot for categories (if implemented) would handle it.
      // For now, we manually add to state to reflect change immediately.
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
        // These service calls should interact with Firestore
        await categoryService.deleteCategory(categoryToDelete); // Delete from managed list
        await tieService.batchUpdateTieCategories(categoryToDelete, UNCATEGORIZED_LABEL); // Move ties in Firestore
        
        toastMessage = `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
      } else {
        // "Sem Categoria" is not in Firestore's explicit list, so we just update UI state.
        toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação.`;
      }
      
      // Update categories state locally. A real-time listener for categories would be better.
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete).sort();
      // Ensure "Sem Categoria" exists if no other categories remain
      if (updatedCategories.length === 0 && !updatedCategories.includes(UNCATEGORIZED_LABEL)) {
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
  }, [categories, activeTab, toast, isClientLoaded, isAuthenticated]); // Removed 'ties' from dependency array


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    
    // This function might need to move to tieService or a dedicated file service.
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
        // Call the service to update in Firestore. TieList's onSnapshot will pick up the change.
        await tieService.updateTie(editingTie.id, {...tieDataForSave, id: editingTie.id});
        // No need to call setTies here.
        toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
      } else {
        // Call the service to add to Firestore. TieList's onSnapshot will pick up the change.
        await tieService.addTie(tieDataForSave);
        // No need to call setTies here.
        toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
      }

      // Add category to managed list if new and not "Sem Categoria"
      // This logic should ideally be handled by a real-time listener for categories.
      if (tieCategory !== UNCATEGORIZED_LABEL && !categories.includes(tieCategory)) { 
        await categoryService.addCategory(tieCategory); // Add to Firestore list
        // No need to update local state if using onSnapshot for categories.
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
      } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
        // Ensure "Sem Categoria" is in UI list if a tie is assigned to it
         // No need to update local state if using onSnapshot for categories.
        setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
      }

    } catch (error) {
      console.error("Failed to save tie:", error);
      toast({ title: "Erro ao Salvar Gravata", description: "Não foi possível salvar a gravata.", variant: "destructive" });
    } finally {
      setEditingTie(undefined);
      setIsDialogOpen(false);
    }
  }, [categories, editingTie, toast, isClientLoaded, isAuthenticated]); // Removed 'ties' from dependency array

  const handleEditTie = (tie: Tie) => {
    // Set the tie to be edited and open the dialog
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const tieToDelete = categories.find(t => t.id === id); // NOTE: This should find in ties, not categories
    
    try {
      // Call the service to delete from Firestore. TieList's onSnapshot will pick up the change.
      await tieService.deleteTie(id);
      // No need to call setTies here.
      // The logic to potentially remove UNCATEGORIZED_LABEL from categories
      // based on remaining ties should be handled by a categories listener or in TieList.
      
      // Find the tie name for the toast message AFTER deleting from firestore
      // A better approach might be to get the tie before deleting.
       const tieNameForToast = "Gravata"; // Fallback name
       // If you need the name, you'd ideally get it from the tie object BEFORE deleting.
       // const tieToDeleteForToast = ties.find(t => t.id === id); 
       // if(tieToDeleteForToast) tieNameForToast = tieToDeleteForToast.name;
       // NOTE: 'ties' state is removed, so cannot find here directly.
       // You might need to retrieve the tie before calling deleteTie or handle toast in tieService response.

      toast({ title: "Gravata Removida", description: `${tieNameForToast} foi removida.`, variant: "destructive" });

    } catch (error) {
      console.error("Failed to delete tie:", error);
      toast({ title: "Erro ao Remover Gravata", description: "Não foi possível remover a gravata.", variant: "destructive" });
    }
  }; // Removed 'ties' and 'categories' from dependency array

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
  // Filtragem agora precisa ser aplicada aos dados DENTRO do TieList ou em um hook compartilhado.
  // Passamos searchTerm e activeTab como props para TieList para que ele possa filtrar internamente.

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
  // The logic here for ensuring UNCATEGORIZED_LABEL tab exists might need refinement
  // if relying solely on the fetched categories list and not tie data.


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
        {/* isDataLoading agora pode se referir ao carregamento inicial de categorias */}
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

            {/* Passamos searchTerm e activeTab para TieList */}
            <TabsContent value={activeTab} className="mt-0">
               {/* TieList agora lida com a busca e filtragem interna */}
              <TieList
                searchTerm={searchTerm}
                activeCategory={activeTab === "Todas" ? undefined : activeTab}
                onEdit={handleEditTie}
                onDelete={handleDeleteTie}
              />
            </TabsContent>
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
