
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, Search, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNCATEGORIZED_LABEL } from '@/lib/types';

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Seda Azul Clássica', quantity: 10, unitPrice: 25, valueInQuantity: 250, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Listrada Vermelha', quantity: 5, unitPrice: 30, valueInQuantity: 150, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Borgonha Pontilhada', quantity: 8, unitPrice: 22, valueInQuantity: 176, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];


export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false); 

  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('tieTrackAuthenticated') === 'true';
    setIsAuthenticated(auth);
    setIsClientLoaded(true); 
    setCurrentYear(new Date().getFullYear());

    if (!auth) {
      router.replace('/login');
    }
  }, [router]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return; 

    let activeTies: Tie[] = [];
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
        // Let the dedicated useEffect handle UNCATEGORIZED_LABEL logic based on loaded ties
        setCategories(Array.from(new Set(parsedCategories)).sort());
      } catch (error) {
        console.error("Falha ao analisar categorias do localStorage:", error);
        const catsFromInitialActiveTies = activeTies.map(tie => tie.category);
        const initialSetupCategoriesSet = new Set([...defaultCategories, ...catsFromInitialActiveTies]);
        // Ensure UNCATEGORIZED_LABEL is present if there are no other categories initially or if ties use it
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
    localStorage.setItem('tieTrackTies', JSON.stringify(ties));
  }, [ties, isClientLoaded, isAuthenticated]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
  }, [categories, isClientLoaded, isAuthenticated]);


  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const hasUncategorizedTies = ties.some(tie => tie.category === UNCATEGORIZED_LABEL);
    let categoriesStateChanged = false;
    let newCategoriesSnapshot = [...categories];

    if (hasUncategorizedTies && !newCategoriesSnapshot.includes(UNCATEGORIZED_LABEL)) {
      newCategoriesSnapshot.push(UNCATEGORIZED_LABEL);
      categoriesStateChanged = true;
    } else if (!hasUncategorizedTies && newCategoriesSnapshot.includes(UNCATEGORIZED_LABEL)) {
      const isDefaultUncategorized = defaultCategories.includes(UNCATEGORIZED_LABEL);
      const otherCategoriesExist = newCategoriesSnapshot.filter(c => c !== UNCATEGORIZED_LABEL).length > 0;
      
      if (!isDefaultUncategorized && otherCategoriesExist) {
        newCategoriesSnapshot = newCategoriesSnapshot.filter(cat => cat !== UNCATEGORIZED_LABEL);
        categoriesStateChanged = true;
      } else if (!isDefaultUncategorized && !otherCategoriesExist && newCategoriesSnapshot.length === 1 && newCategoriesSnapshot[0] === UNCATEGORIZED_LABEL) {
        // If "Sem Categoria" is the only category, it's not a default, and no ties use it, remove it.
        // This might be too aggressive if the user wants to keep it as an option.
        // For now, let's keep it if it's the last one, unless specifically deleted.
        // The current logic correctly keeps it if it's the only one.
      }
    }
    
    // Ensure `UNCATEGORIZED_LABEL` exists if there are no categories at all.
    // This makes sure there's always at least one category selectable if `defaultCategories` is empty.
    if (newCategoriesSnapshot.length === 0 && !newCategoriesSnapshot.includes(UNCATEGORIZED_LABEL)) {
        newCategoriesSnapshot.push(UNCATEGORIZED_LABEL);
        categoriesStateChanged = true;
    }


    if (categoriesStateChanged) {
      const sortedNewCategories = newCategoriesSnapshot.sort();
      const sortedCurrentCategories = [...categories].sort();
      if (JSON.stringify(sortedNewCategories) !== JSON.stringify(sortedCurrentCategories)) {
        setCategories(sortedNewCategories);
      }
    }
  }, [ties, categories, isClientLoaded, isAuthenticated]);


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
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
      return false;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erro", description: `A categoria "${trimmedName}" já existe.`, variant: "destructive" });
      return false;
    }
    const newCategories = [...categories, trimmedName].sort();
    setCategories(newCategories);
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  }, [categories, toast]);

  const handleDeleteCategory = useCallback((categoryToDelete: TieCategory) => {
    if (!categoryToDelete || categoryToDelete === UNCATEGORIZED_LABEL) {
        toast({ title: "Ação não permitida", description: `A categoria "${UNCATEGORIZED_LABEL}" não pode ser removida diretamente.`, variant: "destructive" });
        return;
    }

    const updatedTies = ties.map(tie => {
      if (tie.category === categoryToDelete) {
        return { ...tie, category: UNCATEGORIZED_LABEL };
      }
      return tie;
    });
    setTies(updatedTies); // This will trigger the useEffect to manage UNCATEGORIZED_LABEL in categories

    const updatedCategories = categories.filter(cat => cat !== categoryToDelete).sort();
    setCategories(updatedCategories); 
    
    if (activeTab === categoryToDelete) {
        setActiveTab("Todas"); // Or UNCATEGORIZED_LABEL if preferred
    }

    toast({ title: "Categoria Removida", description: `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".` });
  }, [ties, categories, activeTab, toast]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;

    const tieData: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      valueInQuantity: data.valueInQuantity || 0,
      category: tieCategory,
      imageUrl: finalImageUrl,
    };

    if (editingTie?.id) {
      setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...tieData, id: editingTie.id } : t));
      toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
    } else {
      const newTie: Tie = { ...tieData, id: crypto.randomUUID() };
      setTies(prevTies => [...prevTies, newTie]);
      toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
    }

    if (!categories.includes(tieCategory) && tieCategory !== UNCATEGORIZED_LABEL) { // Don't add UNCATEGORIZED_LABEL explicitly if it's that
      const newCategories = [...categories, tieCategory].sort();
      setCategories(newCategories);
    } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
        // This case is handled by the useEffect managing UNCATEGORIZED_LABEL
    }


    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast]);

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = (id: string) => {
    const tieToDelete = ties.find(t => t.id === id);
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
    localStorage.removeItem('tieTrackAuthenticated');
    setIsAuthenticated(false);
    toast({ title: 'Logout realizado', description: 'Você saiu da sua conta.' });
    // router.replace('/login') will be handled by useEffect watching isAuthenticated
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
     // This check is mainly for clarity; useEffect above handles the redirect.
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

  // Simplified tabsToDisplay logic
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
  // If categories is empty, useEffect should have added UNCATEGORIZED_LABEL if needed.
  // If tabsToDisplay is just ["Todas"] and categories is empty, it implies no ties and no user categories yet.
  // UNCATEGORIZED_LABEL will be added to categories by useEffect if a tie gets that category or if all categories are removed.


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
            <Button onClick={handleLogout} variant="outline" size="icon" aria-label="Sair">
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      {isClientLoaded && isAuthenticated && (
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
      )}
      
      {isClientLoaded && isAuthenticated && (
        <AddTieDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleFormSubmit}
            initialData={editingTie}
            allCategories={categories} 
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
        />
      )}
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}
    
