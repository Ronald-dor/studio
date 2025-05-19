
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// TieList is now responsible for its own data fetching if we were to keep Firestore.
// However, reverting to localStorage means page.tsx manages ties again.
// import { TieList } from '@/components/TieList'; 
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, LogOut, Search, Trash2 } from 'lucide-react'; // Added Trash2
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNCATEGORIZED_LABEL } from '@/lib/types';
import { TieCard } from '@/components/TieCard'; // Import TieCard
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


// Initial data (will be loaded from localStorage if available)
const initialTiesData: Tie[] = [
  { id: '1', name: 'Gravata de Seda Azul Clássica', quantity: 10, unitPrice: 25.00, valueInQuantity: 250.00, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { id: '2', name: 'Gravata Listrada Vermelha e Branca', quantity: 5, unitPrice: 30.00, valueInQuantity: 150.00, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { id: '3', name: 'Gravata de Bolinhas Pretas (Slim)', quantity: 8, unitPrice: 22.50, valueInQuantity: 180.00, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
  { id: '4', name: 'Gravata Borboleta Preta', quantity: 12, unitPrice: 18.00, valueInQuantity: 216.00, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];


export default function HomePage() {
  const router = useRouter();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const [ties, setTies] = useState<Tie[]>([]); 
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true); // Combined loading state

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);


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

  // Load data from localStorage or use initial data
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    setIsDataLoading(true);
    try {
      const storedTies = localStorage.getItem('tieTrackTies');
      const storedCategories = localStorage.getItem('tieTrackCategories');

      let loadedTies: Tie[] = initialTiesData;
      if (storedTies) {
        try {
            loadedTies = JSON.parse(storedTies);
        } catch (e) {
            console.error("Failed to parse ties from localStorage", e);
            localStorage.removeItem('tieTrackTies'); // Clear corrupted data
        }
      }
      setTies(loadedTies);

      let loadedCategories: TieCategory[] = defaultCategories;
      if (storedCategories) {
        try {
            const parsedCategories = JSON.parse(storedCategories);
             // Ensure defaultCategories are present if localStorage is empty or doesn't have them
            loadedCategories = Array.from(new Set([...defaultCategories, ...parsedCategories]));
        } catch (e) {
            console.error("Failed to parse categories from localStorage", e);
            localStorage.removeItem('tieTrackCategories'); // Clear corrupted data
        }
      }
      
      // Ensure UNCATEGORIZED_LABEL is present if ties use it and it's not in loadedCategories
      const tiesUseUncategorized = loadedTies.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
      if (tiesUseUncategorized && !loadedCategories.includes(UNCATEGORIZED_LABEL)) {
        loadedCategories.push(UNCATEGORIZED_LABEL);
      }
      // If no categories loaded and no ties use uncategorized, ensure UNCATEGORIZED_LABEL is default
      if (loadedCategories.length === 0) {
          loadedCategories.push(UNCATEGORIZED_LABEL);
      }

      setCategories(Array.from(new Set(loadedCategories)).sort());

    } catch (error) {
       console.error("Failed to load data from localStorage:", error);
       toast({
         variant: "destructive",
         title: "Erro ao Carregar Dados Locais",
         description: "Não foi possível carregar os dados salvos. Usando dados padrão.",
       });
       setTies(initialTiesData);
       setCategories(defaultCategories);
    } finally {
      setIsDataLoading(false);
    }
  }, [isClientLoaded, isAuthenticated, toast]);

  // Save ties to localStorage
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true || isDataLoading) return;
    localStorage.setItem('tieTrackTies', JSON.stringify(ties));
  }, [ties, isClientLoaded, isAuthenticated, isDataLoading]);

  // Save categories to localStorage
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true || isDataLoading) return;
    localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
  }, [categories, isClientLoaded, isAuthenticated, isDataLoading]);
  
  // Effect to manage UNCATEGORIZED_LABEL in categories list
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true || isDataLoading) return;

    const tiesUseUncategorized = ties.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
    const hasUncategorizedInCategories = categories.includes(UNCATEGORIZED_LABEL);

    if (tiesUseUncategorized && !hasUncategorizedInCategories) {
      setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    } 
    // Simplified: If UNCATEGORIZED_LABEL was manually removed but ties still use it, this adds it back.
    // If it was manually removed AND no ties use it, it stays removed, unless all other categories are gone.
    // If all categories (including user-defined) are removed, and UNCATEGORIZED_LABEL was also removed,
    // AND there are still ties (which would now be implicitly uncategorized if their original category was deleted),
    // then UNCATEGORIZED_LABEL should be re-added.
    // This also handles the case where all categories are removed, ensuring at least "Sem Categoria" remains.
    else if (categories.length === 0 && !hasUncategorizedInCategories) {
       setCategories([UNCATEGORIZED_LABEL]);
    }

  }, [ties, categories, isClientLoaded, isAuthenticated, isDataLoading]);


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
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
    
    setCategories(prevCategories => Array.from(new Set([...prevCategories, trimmedName])).sort());
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  }, [categories, toast, isClientLoaded, isAuthenticated]);

  const handleDeleteCategoryRequest = (category: TieCategory) => {
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const handleDeleteCategory = useCallback(async () => {
    if (!isClientLoaded || isAuthenticated !== true || !categoryToDelete) return;

    let toastMessage = "";
    // Logic to move ties if not deleting "Sem Categoria"
    if (categoryToDelete !== UNCATEGORIZED_LABEL) {
        setTies(prevTies => 
            prevTies.map(tie => 
                tie.category === categoryToDelete ? { ...tie, category: UNCATEGORIZED_LABEL } : tie
            )
        );
        toastMessage = `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
    } else {
        // If deleting "Sem Categoria" itself
        toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação até serem editadas.`;
    }
    
    setCategories(prevCategories => {
        const updated = prevCategories.filter(cat => cat !== categoryToDelete).sort();
        // Ensure "Sem Categoria" exists if no other categories remain or if ties still use it
        const tiesStillUseUncategorized = ties.some(tie => tie.category === UNCATEGORIZED_LABEL || (tie.category === categoryToDelete && categoryToDelete !== UNCATEGORIZED_LABEL));
        if (updated.length === 0 || (tiesStillUseUncategorized && !updated.includes(UNCATEGORIZED_LABEL))) {
            if (!updated.includes(UNCATEGORIZED_LABEL)) {
                 updated.push(UNCATEGORIZED_LABEL);
                 updated.sort();
            }
        }
        return updated;
    }); 
    
    if (activeTab === categoryToDelete) {
        setActiveTab(UNCATEGORIZED_LABEL); // Default to "Sem Categoria" or "Todas"
    }
    toast({ title: "Categoria Removida", description: toastMessage });
    setCategoryToDelete(null);
    setIsConfirmDeleteCategoryOpen(false);

  }, [categoryToDelete, ties, activeTab, toast, isClientLoaded, isAuthenticated]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;

    const tieDataForSave = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      valueInQuantity: data.valueInQuantity || 0,
      category: tieCategory,
      imageUrl: finalImageUrl,
    };

    if (editingTie?.id) {
      setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...tieDataForSave, id: editingTie.id } : t));
      toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
    } else {
      const newTie: Tie = { ...tieDataForSave, id: Date.now().toString() }; // Simple ID generation
      setTies(prevTies => [newTie, ...prevTies]);
      toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
    }

    if (tieCategory !== UNCATEGORIZED_LABEL && !categories.includes(tieCategory)) { 
      setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
    } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
      setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast, isClientLoaded, isAuthenticated, ties]); 

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const tieToDelete = ties.find(t => t.id === id);
    
    setTies(prevTies => prevTies.filter(tie => tie.id !== id));
    
    toast({ title: "Gravata Removida", description: `${tieToDelete?.name || "Gravata"} foi removida.`, variant: "destructive" });
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
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando para o login...</p>
      </div>
    );
  }
  
  const filteredTies = ties.filter(tie => {
    const matchesSearchTerm = tie.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeTab === "Todas" || tie.category === activeTab || (activeTab === UNCATEGORIZED_LABEL && (!tie.category || tie.category === UNCATEGORIZED_LABEL));
    return matchesSearchTerm && matchesCategory;
  });

  const sortedCategoriesState = Array.from(new Set(categories)).sort((a, b) => {
    if (a === UNCATEGORIZED_LABEL) return -1;
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
   if (categories.length === 0 && !tabsToDisplay.includes(UNCATEGORIZED_LABEL)) {
      tabsToDisplay.push(UNCATEGORIZED_LABEL);
   }
   if (categories.length > 0 && !tabsToDisplay.includes(UNCATEGORIZED_LABEL) && ties.some(t => !t.category || t.category === UNCATEGORIZED_LABEL)) {
     tabsToDisplay.splice(1,0,UNCATEGORIZED_LABEL); // Insert after "Todas"
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
                   {/* Removed delete button from tabs
                  {category !== "Todas" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                      onClick={() => handleDeleteCategoryRequest(category)}
                      aria-label={`Remover categoria ${category}`}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                  */}
                </div>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
               {filteredTies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredTies.map((tie) => (
                    <TieCard key={tie.id} tie={tie} onEdit={handleEditTie} onDelete={handleDeleteTie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xl text-muted-foreground">Nenhuma gravata para exibir para a seleção atual.</p>
                  <p className="text-sm text-muted-foreground">Tente uma categoria ou termo de pesquisa diferente, ou adicione uma nova gravata.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <AddTieDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={editingTie}
          allCategories={categories.filter(cat => cat !== UNCATEGORIZED_LABEL)}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategoryRequest} // Changed to request, form dialog will handle confirmation
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
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}

    