
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

// TODO: Firebase Integration: Import your Firebase services
// import * as tieService from '@/services/tieService';
// import * as categoryService from '@/services/categoryService';

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Seda Azul Clássica', quantity: 10, unitPrice: 25, valueInQuantity: 250, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Listrada Vermelha', quantity: 5, unitPrice: 30, valueInQuantity: 150, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Borgonha Pontilhada', quantity: 8, unitPrice: 22, valueInQuantity: 176, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];

export default function HomePage() {
  const router = useRouter();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('tieTrackAuth') === 'true';
    setIsAuthenticated(authStatus);
    setIsClientLoaded(true); 
    setCurrentYear(new Date().getFullYear());

    if (!authStatus) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return; 

    let activeTies: Tie[] = [];
    // TODO: Firebase Integration: Replace localStorage with Firebase service calls
    // Example: 
    // const fetchInitialData = async () => {
    //   try {
    //     const fetchedTies = await tieService.getTies();
    //     setTies(fetchedTies.length > 0 ? fetchedTies : initialTiesData.map(t => ({...t, id: crypto.randomUUID()})));
    //     
    //     const fetchedCategories = await categoryService.getCategories();
    //     // Logic to derive categories from fetchedTies or use fetchedCategories
    //     // For now, we continue with localStorage logic below as placeholder
    //   } catch (error) {
    //      console.error("Failed to fetch data from Firebase:", error);
    //      // Fallback to initial or localStorage
    //   }
    // }
    // fetchInitialData();
    
    const storedTiesData = localStorage.getItem('tieTrackTies');
    if (storedTiesData) {
      try {
        activeTies = JSON.parse(storedTiesData);
        setTies(activeTies);
      } catch (error) {
        console.error("Falha ao analisar gravatas do localStorage:", error);
        const tiesWithIds = initialTiesData.map(tie => ({ ...tie, id: crypto.randomUUID(), valueInQuantity: tie.valueInQuantity || (tie.quantity * tie.unitPrice) }));
        setTies(tiesWithIds);
        activeTies = tiesWithIds;
        localStorage.removeItem('tieTrackTies'); 
      }
    } else {
      const tiesWithIds = initialTiesData.map(tie => ({ ...tie, id: crypto.randomUUID(), valueInQuantity: tie.valueInQuantity || (tie.quantity * tie.unitPrice) }));
      setTies(tiesWithIds);
      activeTies = tiesWithIds;
    }

    const storedCategoriesData = localStorage.getItem('tieTrackCategories');
    if (storedCategoriesData) {
      try {
        const parsedCategories = JSON.parse(storedCategoriesData) as TieCategory[];
        setCategories(Array.from(new Set(parsedCategories)).sort());
      } catch (error) {
        console.error("Falha ao analisar categorias do localStorage:", error);
        const catsFromInitialActiveTies = activeTies.map(tie => tie.category);
        const initialSetupCategoriesSet = new Set([...defaultCategories, ...catsFromInitialActiveTies]);
        const hasUncategorizedInActiveTies = activeTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
        if (hasUncategorizedInActiveTies || initialSetupCategoriesSet.size === 0 ) {
          initialSetupCategoriesSet.add(UNCATEGORIZED_LABEL);
        }
        setCategories(Array.from(initialSetupCategoriesSet).sort());
        localStorage.removeItem('tieTrackCategories'); 
      }
    } else {
      const catsFromInitialActiveTies = activeTies.map(tie => tie.category);
      const initialSetupCategoriesSet = new Set([...defaultCategories, ...catsFromInitialActiveTies]);
      const hasUncategorizedInActiveTies = activeTies.some(tie => tie.category === UNCATEGORIZED_LABEL);

      if (hasUncategorizedInActiveTies || initialSetupCategoriesSet.size === 0 ) {
        initialSetupCategoriesSet.add(UNCATEGORIZED_LABEL);
      }
      
      setCategories(Array.from(initialSetupCategoriesSet).sort());
    }
  }, [isClientLoaded, isAuthenticated]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    // TODO: Firebase Integration: This useEffect would be replaced by direct calls to Firebase service on each action (add, update, delete).
    // Or, if using real-time listeners, this might not be needed or would be simpler.
    localStorage.setItem('tieTrackTies', JSON.stringify(ties));
  }, [ties, isClientLoaded, isAuthenticated]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    // TODO: Firebase Integration: This useEffect would be replaced by direct calls to Firebase service on each action.
    localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
  }, [categories, isClientLoaded, isAuthenticated]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    const hasActualUncategorizedTies = ties.some(tie => tie.category === UNCATEGORIZED_LABEL);
    const uncategorizedLabelExistsInState = categories.includes(UNCATEGORIZED_LABEL);
  
    if (hasActualUncategorizedTies && !uncategorizedLabelExistsInState) {
      setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
    }
  }, [ties, categories, isClientLoaded, isAuthenticated]);


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
    // TODO: Firebase Integration: If using Firebase Storage, this function would upload the image
    // to Storage and return the public URL.
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

    // TODO: Firebase Integration: Call categoryService.addCategory(trimmedName)
    // await categoryService.addCategory(trimmedName);

    const newCategories = [...categories, trimmedName].sort();
    setCategories(newCategories);
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  }, [categories, toast, isClientLoaded, isAuthenticated]);

  const handleDeleteCategory = useCallback(async (categoryToDelete: TieCategory) => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    // TODO: Firebase Integration: Call categoryService.deleteCategory(categoryToDelete)
    // This would also involve backend logic to update ties belonging to this category.
    // await categoryService.deleteCategory(categoryToDelete);

    let updatedTies = [...ties];
    let toastMessage = "";

    if (categoryToDelete !== UNCATEGORIZED_LABEL) {
        updatedTies = ties.map(tie => {
            if (tie.category === categoryToDelete) {
                return { ...tie, category: UNCATEGORIZED_LABEL };
            }
            return tie;
        });
        // TODO: Firebase Integration: Update these ties in Firebase as well.
        // For each updated tie: await tieService.updateTie(tie.id, { category: UNCATEGORIZED_LABEL });
        toastMessage = `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
    } else {
        toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação.`;
    }
    
    setTies(updatedTies); 

    const updatedCategories = categories.filter(cat => cat !== categoryToDelete).sort();
    setCategories(updatedCategories); 
    
    if (activeTab === categoryToDelete) {
        setActiveTab("Todas");
    }

    toast({ title: "Categoria Removida", description: toastMessage });
  }, [ties, categories, activeTab, toast, isClientLoaded, isAuthenticated]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
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

    if (editingTie?.id) {
      // TODO: Firebase Integration: Replace with call to tieService.updateTie
      // const updatedTie = await tieService.updateTie(editingTie.id, {...tieDataForSave, id: editingTie.id});
      // if (updatedTie) { setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? updatedTie : t)); }
      setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...tieDataForSave, id: editingTie.id } : t));
      toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
    } else {
      // TODO: Firebase Integration: Replace with call to tieService.addTie
      // const newTieFromBackend = await tieService.addTie(tieDataForSave);
      // setTies(prevTies => [...prevTies, newTieFromBackend]);
      const newTie: Tie = { ...tieDataForSave, id: crypto.randomUUID() };
      setTies(prevTies => [...prevTies, newTie]);
      toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
    }

    if (!categories.includes(tieCategory)) { 
      // TODO: Firebase Integration: This might be handled by categoryService or derived from ties.
      // If categories are explicitly managed: await categoryService.addCategory(tieCategory);
      const newCategories = [...categories, tieCategory].sort();
      setCategories(newCategories);
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast, isClientLoaded, isAuthenticated]);

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const tieToDelete = ties.find(t => t.id === id);
    
    // TODO: Firebase Integration: Replace with call to tieService.deleteTie
    // await tieService.deleteTie(id);

    setTies(prevTies => prevTies.filter(t => t.id !== id));
    if (tieToDelete) {
      toast({ title: "Gravata Removida", description: `${tieToDelete.name} foi removida.`, variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingTie(undefined);
    setIsDialogOpen(true);
  };

  const handleLogout = () => {
    // TODO: Firebase Integration: If using Firebase Auth, call auth.signOut()
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

  const filteredTies = ties.filter(tie =>
    tie.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCategoriesState = Array.from(new Set(categories)).sort();
  const tabsToDisplay: TieCategory[] = ["Todas"];

  if (sortedCategoriesState.includes(UNCATEGORIZED_LABEL)) {
      tabsToDisplay.push(UNCATEGORIZED_LABEL);
  }
  sortedCategoriesState.forEach(cat => {
      if (cat !== UNCATEGORIZED_LABEL && !tabsToDisplay.includes(cat)) { 
          tabsToDisplay.push(cat);
      }
  });

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
              : filteredTies.filter(tie => tie.category === category);
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
      </main>
      
      <AddTieDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={editingTie}
          allCategories={categories} 
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
      />
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}

