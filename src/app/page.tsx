
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Seda Azul Clássica', quantity: 10, unitPrice: 25, valueInQuantity: 250, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Listrada Vermelha', quantity: 5, unitPrice: 30, valueInQuantity: 150, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Borgonha Pontilhada', quantity: 8, unitPrice: 22, valueInQuantity: 176, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];
const UNCATEGORIZED_LABEL = 'Sem Categoria';

export default function HomePage() {
  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");

  // Load ties and categories from localStorage on initial mount
  useEffect(() => {
    let activeTies: Tie[] = [];
    const storedTiesData = localStorage.getItem('tieTrackTies');
    if (storedTiesData) {
      activeTies = JSON.parse(storedTiesData);
      setTies(activeTies);
    } else {
      const tiesWithIds = initialTiesData.map(tie => ({ ...tie, id: crypto.randomUUID(), valueInQuantity: tie.valueInQuantity || (tie.quantity * tie.unitPrice) }));
      setTies(tiesWithIds);
      activeTies = tiesWithIds;
    }

    const storedCategoriesData = localStorage.getItem('tieTrackCategories');
    if (storedCategoriesData) {
      const parsedCategories = JSON.parse(storedCategoriesData) as TieCategory[];
      const hasUncategorizedTies = activeTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
      
      let finalCategoriesSet = new Set(parsedCategories);
      if (hasUncategorizedTies && !parsedCategories.includes(UNCATEGORIZED_LABEL)) {
        finalCategoriesSet.add(UNCATEGORIZED_LABEL);
      }
      
      const noTiesInUncategorized = !activeTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
      const canRemoveUncategorized = noTiesInUncategorized && 
                                   parsedCategories.includes(UNCATEGORIZED_LABEL) &&
                                   !defaultCategories.includes(UNCATEGORIZED_LABEL) &&
                                   parsedCategories.filter(c => c !== UNCATEGORIZED_LABEL).length > 0;

      if (canRemoveUncategorized) {
        finalCategoriesSet.delete(UNCATEGORIZED_LABEL);
      }
      setCategories(Array.from(finalCategoriesSet).sort());
    } else {
      const catsFromInitialActiveTies = activeTies.map(tie => tie.category);
      const initialSetupCategoriesSet = new Set([...defaultCategories, ...catsFromInitialActiveTies]);
      const hasUncategorizedInActiveTies = activeTies.some(tie => tie.category === UNCATEGORIZED_LABEL);

      if (hasUncategorizedInActiveTies || initialSetupCategoriesSet.size === 0 ) {
        initialSetupCategoriesSet.add(UNCATEGORIZED_LABEL);
      }
      
      setCategories(Array.from(initialSetupCategoriesSet).sort());
    }
  }, []);

  // Save ties to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tieTrackTies', JSON.stringify(ties));
  }, [ties]);

  // Save categories to localStorage whenever they change (centralized)
  useEffect(() => {
    localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
  }, [categories]);

  // Manage UNCATEGORIZED_LABEL based on ties and categories
  useEffect(() => {
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
      }
    }

    if (categoriesStateChanged) {
      const sortedNewCategories = newCategoriesSnapshot.sort();
      const sortedCurrentCategories = [...categories].sort();
      if (JSON.stringify(sortedNewCategories) !== JSON.stringify(sortedCurrentCategories)) {
        setCategories(sortedNewCategories);
      }
    }
  }, [ties, categories]);


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
    // localStorage.setItem('tieTrackCategories', JSON.stringify(newCategories)); // Re-added explicit save
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  }, [categories, toast]);

  const handleDeleteCategory = useCallback((categoryToDelete: TieCategory) => {
    if (!categoryToDelete || categoryToDelete === UNCATEGORIZED_LABEL) {
        toast({ title: "Ação não permitida", description: `A categoria "${categoryToDelete}" não pode ser removida.`, variant: "destructive" });
        return;
    }

    const updatedTies = ties.map(tie => {
      if (tie.category === categoryToDelete) {
        return { ...tie, category: UNCATEGORIZED_LABEL };
      }
      return tie;
    });
    setTies(updatedTies);

    let updatedCategories = categories.filter(cat => cat !== categoryToDelete);
    const hasRemainingUncategorizedTies = updatedTies.some(tie => tie.category === UNCATEGORIZED_LABEL);

    if (hasRemainingUncategorizedTies && !updatedCategories.includes(UNCATEGORIZED_LABEL)) {
      updatedCategories.push(UNCATEGORIZED_LABEL);
    }
    
    const noTiesInUncategorized = !updatedTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
    if (noTiesInUncategorized && 
        updatedCategories.includes(UNCATEGORIZED_LABEL) && 
        !defaultCategories.includes(UNCATEGORIZED_LABEL) && 
        updatedCategories.filter(c => c !== UNCATEGORIZED_LABEL).length > 0
    ) {
        updatedCategories = updatedCategories.filter(cat => cat !== UNCATEGORIZED_LABEL);
    }
    
    const finalUpdatedCategories = updatedCategories.sort();
    setCategories(finalUpdatedCategories);
    // localStorage.setItem('tieTrackCategories', JSON.stringify(finalUpdatedCategories)); // Re-added explicit save
    
    if (activeTab === categoryToDelete) {
        setActiveTab("Todas");
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

    if (!categories.includes(tieCategory)) {
      const newCategories = [...categories, tieCategory].sort();
      setCategories(newCategories);
      // localStorage.setItem('tieTrackCategories', JSON.stringify(newCategories)); // Re-added explicit save
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

  const filteredTies = ties.filter(tie =>
    tie.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const TABS_ORDER: string[] = ["Todas", ...categories.filter(c => c.toLowerCase() !== 'todas' && c !== UNCATEGORIZED_LABEL).sort()];
  if (categories.includes(UNCATEGORIZED_LABEL)) {
      const todasIndex = TABS_ORDER.indexOf("Todas");
      if (todasIndex !== -1 && !TABS_ORDER.includes(UNCATEGORIZED_LABEL)) {
          TABS_ORDER.splice(todasIndex + 1, 0, UNCATEGORIZED_LABEL);
      } else if (!TABS_ORDER.includes(UNCATEGORIZED_LABEL)) {
          TABS_ORDER.unshift(UNCATEGORIZED_LABEL); 
      }
  }
  
  let finalTabsOrder: string[] = [];
  if (categories.includes("Todas") || TABS_ORDER.includes("Todas")) finalTabsOrder.push("Todas"); 
  
  const uniqueSortedCategories = Array.from(new Set(categories)).sort();
  
  if (uniqueSortedCategories.includes(UNCATEGORIZED_LABEL) && UNCATEGORIZED_LABEL !== "Todas") {
    finalTabsOrder.push(UNCATEGORIZED_LABEL);
  }
  uniqueSortedCategories.forEach(cat => {
    if (cat !== "Todas" && cat !== UNCATEGORIZED_LABEL && !finalTabsOrder.includes(cat)) {
      finalTabsOrder.push(cat);
    }
  });
   
  if (!finalTabsOrder.includes("Todas") && TABS_ORDER.includes("Todas")) {
    finalTabsOrder.unshift("Todas");
  }
  
   if (finalTabsOrder.length === 0 && (ties.length > 0 || initialTiesData.length > 0)) {
     finalTabsOrder.push("Todas");
     if (ties.some(t => t.category === UNCATEGORIZED_LABEL) || initialTiesData.some(t => t.category === UNCATEGORIZED_LABEL) || categories.includes(UNCATEGORIZED_LABEL)) {
        if(!finalTabsOrder.includes(UNCATEGORIZED_LABEL)) finalTabsOrder.push(UNCATEGORIZED_LABEL);
     }
   } else if (finalTabsOrder.length === 0) { 
      finalTabsOrder.push("Todas");
      finalTabsOrder.push(UNCATEGORIZED_LABEL); 
   }
   
   const tabsToDisplay = Array.from(new Set(finalTabsOrder));
   if (!tabsToDisplay.includes("Todas")) {
    tabsToDisplay.unshift("Todas");
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
        © {new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}
    
