
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, Search } from 'lucide-react'; // Removido XIcon
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Removido AlertDialog de page.tsx pois a confirmação será feita em TieForm

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Seda Azul Clássica', quantity: 10, unitPrice: 25, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Listrada Vermelha', quantity: 5, unitPrice: 30, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Borgonha Pontilhada', quantity: 8, unitPrice: 22, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Xadrez Verde Lã', quantity: 3, unitPrice: 35, category: 'Xadrez', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada', 'Xadrez', 'Floral', 'Paisley', 'Geométrica', 'Novidade'];
const UNCATEGORIZED_LABEL = 'Sem Categoria';

export default function HomePage() {
  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  // Estados categoryToDelete e isDeleteCategoryAlertOpen foram removidos daqui


  useEffect(() => {
    const storedTies = localStorage.getItem('tieTrackTies');
    if (storedTies) {
      setTies(JSON.parse(storedTies));
    } else {
      const tiesWithIds = initialTiesData.map(tie => ({ ...tie, id: crypto.randomUUID() }));
      setTies(tiesWithIds);
    }

    const storedCategories = localStorage.getItem('tieTrackCategories');
    if (storedCategories) {
      const parsedCategories = JSON.parse(storedCategories);
      // Garantir que "Sem Categoria" esteja presente se houver laços não categorizados ou se for a única opção
      const hasUncategorizedTies = (JSON.parse(storedTies || '[]') as Tie[]).some(tie => tie.category === UNCATEGORIZED_LABEL);
      const allCategories = new Set([...defaultCategories, ...parsedCategories]);
      if (hasUncategorizedTies || parsedCategories.length === 0) {
        allCategories.add(UNCATEGORIZED_LABEL);
      }
      setCategories(Array.from(allCategories).sort());
    } else {
      const catsFromInitialTies = initialTiesData.map(tie => tie.category);
      const initialSetupCategories = new Set([...defaultCategories, ...catsFromInitialTies, UNCATEGORIZED_LABEL]);
      const sortedInitialCategories = Array.from(initialSetupCategories).sort();
      setCategories(sortedInitialCategories);
      localStorage.setItem('tieTrackCategories', JSON.stringify(sortedInitialCategories));
    }
  }, []);

  useEffect(() => {
    if (ties.length > 0 || localStorage.getItem('tieTrackTies')) {
        localStorage.setItem('tieTrackTies', JSON.stringify(ties));
    }
  }, [ties]);

  useEffect(() => {
    // Garantir que "Sem Categoria" exista se for necessário
    const hasUncategorizedTies = ties.some(tie => tie.category === UNCATEGORIZED_LABEL);
    const categoriesNeedsUpdate = (hasUncategorizedTies && !categories.includes(UNCATEGORIZED_LABEL)) ||
                                 (categories.length === 0 && ties.length > 0);

    if (categoriesNeedsUpdate) {
      setCategories(prev => {
        const newCategories = new Set(prev);
        if (hasUncategorizedTies || prev.length === 0) newCategories.add(UNCATEGORIZED_LABEL);
        const sorted = Array.from(newCategories).sort();
        localStorage.setItem('tieTrackCategories', JSON.stringify(sorted));
        return sorted;
      });
    } else if (categories.length > 0 || localStorage.getItem('tieTrackCategories')) {
        localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
    }
  }, [categories, ties]);

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

  const handleAddCategory = async (categoryName: string): Promise<boolean> => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
      return false;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erro", description: `A categoria "${trimmedName}" já existe.`, variant: "destructive" });
      return false;
    }
    setCategories(prev => {
      const newCategories = [...prev, trimmedName].sort();
      localStorage.setItem('tieTrackCategories', JSON.stringify(newCategories));
      return newCategories;
    });
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  };

  // A função handleDeleteCategory agora é chamada pelo TieForm
  const handleDeleteCategory = (categoryToDelete: TieCategory) => {
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

    const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
    
    const hasRemainingUncategorizedTies = updatedTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
    if (hasRemainingUncategorizedTies && !updatedCategories.includes(UNCATEGORIZED_LABEL)) {
      updatedCategories.push(UNCATEGORIZED_LABEL);
    }
    
    // Se não houver mais laços "Sem Categoria" e "Sem Categoria" não for uma das default, pode ser removida se estiver vazia
    const noTiesInUncategorized = !updatedTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
    if (noTiesInUncategorized && updatedCategories.includes(UNCATEGORIZED_LABEL) && !defaultCategories.includes(UNCATEGORIZED_LABEL) && updatedCategories.length > 1) {
        const finalCategories = updatedCategories.filter(cat => cat !== UNCATEGORIZED_LABEL);
        setCategories(finalCategories.sort());
        localStorage.setItem('tieTrackCategories', JSON.stringify(finalCategories.sort()));
    } else {
        setCategories(updatedCategories.sort());
        localStorage.setItem('tieTrackCategories', JSON.stringify(updatedCategories.sort()));
    }
    
    if (activeTab === categoryToDelete) {
        setActiveTab("Todas");
    }

    toast({ title: "Categoria Removida", description: `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".` });
  };


  const handleFormSubmit = async (data: TieFormData) => {
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    
    const tieCategory = data.category && data.category.trim() !== "" ? data.category : UNCATEGORIZED_LABEL;

    const tieData: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      category: tieCategory,
      imageUrl: finalImageUrl,
    };

    if (editingTie?.id) {
      setTies(ties.map(t => t.id === editingTie.id ? { ...tieData, id: editingTie.id } : t));
      toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
    } else {
      const newTie: Tie = { ...tieData, id: crypto.randomUUID() };
      setTies([...ties, newTie]);
      toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
    }

    // Se a categoria do laço for nova e não for "Sem Categoria", adiciona-a
    if (!categories.includes(tieCategory) && tieCategory !== UNCATEGORIZED_LABEL) {
      setCategories(prev => {
        const newCategories = [...prev, tieCategory].sort();
        localStorage.setItem('tieTrackCategories', JSON.stringify(newCategories));
        return newCategories;
      });
    } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
      // Garante que "Sem Categoria" seja adicionada se for usada e não existir
      setCategories(prev => {
        const newCategories = [...prev, UNCATEGORIZED_LABEL].sort();
        localStorage.setItem('tieTrackCategories', JSON.stringify(newCategories));
        return newCategories;
      });
    }


    setEditingTie(undefined);
    setIsDialogOpen(false);
  };

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = (id: string) => {
    const tieToDelete = ties.find(t => t.id === id);
    setTies(ties.filter(t => t.id !== id));
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

  const TABS_ORDER: string[] = ["Todas", ...categories.filter(c => c.toLowerCase() !== 'todas').sort()];
  // Garante que UNCATEGORIZED_LABEL esteja no TABS_ORDER se existir em categories
  if (categories.includes(UNCATEGORIZED_LABEL) && !TABS_ORDER.includes(UNCATEGORIZED_LABEL)) {
    // Adiciona depois de "Todas" e antes de outras categorias ordenadas
    const todasIndex = TABS_ORDER.indexOf("Todas");
    if (todasIndex !== -1) {
        TABS_ORDER.splice(todasIndex + 1, 0, UNCATEGORIZED_LABEL);
    } else {
        TABS_ORDER.unshift(UNCATEGORIZED_LABEL); // Caso "Todas" não exista por algum motivo
    }
  }
  // Remove duplicatas se houver
  const uniqueTabsOrder = Array.from(new Set(TABS_ORDER));


  return (
    <div className="min-h-screen bg-background text-foreground">
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
            {uniqueTabsOrder.map((category) => (
              <div key={category} className="relative group">
                <TabsTrigger value={category} className="text-sm px-3 py-1.5 h-auto"> {/* Removido pr-8 */}
                  {category}
                </TabsTrigger>
                {/* Botão de remover categoria foi movido para o TieForm */}
              </div>
            ))}
          </TabsList>

          {uniqueTabsOrder.map((category) => {
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
        allCategories={categories} // Passa todas as categorias
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory} // Passa a função de deletar
      />
      
      {/* AlertDialog de confirmação de exclusão foi movido para TieForm */}
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}

