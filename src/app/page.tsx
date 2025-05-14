
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, Search, XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Seda Azul Clássica', quantity: 10, unitPrice: 25, category: 'Lisa', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Listrada Vermelha', quantity: 5, unitPrice: 30, category: 'Listrada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Borgonha Pontilhada', quantity: 8, unitPrice: 22, category: 'Pontilhada', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Gravata Xadrez Verde Lã', quantity: 3, unitPrice: 35, category: 'Xadrez', imageUrl: 'https://placehold.co/300x400.png' },
];

const defaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada', 'Xadrez', 'Floral', 'Paisley', 'Geométrica', 'Novidade', 'Sem Categoria'];
const UNCATEGORIZED_LABEL = 'Sem Categoria';

export default function HomePage() {
  const [ties, setTies] = useState<Tie[]>([]);
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isDeleteCategoryAlertOpen, setIsDeleteCategoryAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Todas");


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
      const uniqueCategories = Array.from(new Set([...defaultCategories, ...parsedCategories]));
      setCategories(uniqueCategories.sort());
    } else {
      const catsFromInitialTies = initialTiesData.map(tie => tie.category);
      const uniqueInitialCategories = Array.from(new Set([...defaultCategories, ...catsFromInitialTies]));
      setCategories(uniqueInitialCategories.sort());
      localStorage.setItem('tieTrackCategories', JSON.stringify(uniqueInitialCategories));
    }
  }, []);

  useEffect(() => {
    if (ties.length > 0 || localStorage.getItem('tieTrackTies')) {
        localStorage.setItem('tieTrackTies', JSON.stringify(ties));
    }
  }, [ties]);

  useEffect(() => {
    if (categories.length > 0 || localStorage.getItem('tieTrackCategories')) {
        localStorage.setItem('tieTrackCategories', JSON.stringify(categories));
    }
  }, [categories]);

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
    setCategories(prev => [...prev, trimmedName].sort());
    toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
    return true;
  };

  const confirmDeleteCategory = (category: TieCategory) => {
    if (category.toLowerCase() === 'todas' || category === UNCATEGORIZED_LABEL) {
      toast({ title: "Ação não permitida", description: `A categoria "${category}" não pode ser removida.`, variant: "destructive" });
      return;
    }
    setCategoryToDelete(category);
    setIsDeleteCategoryAlertOpen(true);
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    const updatedTies = ties.map(tie => {
      if (tie.category === categoryToDelete) {
        return { ...tie, category: UNCATEGORIZED_LABEL };
      }
      return tie;
    });
    setTies(updatedTies);

    const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
    
    // Ensure "Sem Categoria" is present if there are ties in it
    const hasUncategorizedTies = updatedTies.some(tie => tie.category === UNCATEGORIZED_LABEL);
    if (hasUncategorizedTies && !updatedCategories.includes(UNCATEGORIZED_LABEL)) {
      updatedCategories.push(UNCATEGORIZED_LABEL);
      updatedCategories.sort();
    }
    
    setCategories(updatedCategories);
    
    // If the active tab was the one deleted, switch to "Todas"
    if (activeTab === categoryToDelete) {
        setActiveTab("Todas");
    }


    toast({ title: "Categoria Removida", description: `A categoria "${categoryToDelete}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".` });
    setCategoryToDelete(null);
    setIsDeleteCategoryAlertOpen(false);
  };


  const handleFormSubmit = async (data: TieFormData) => {
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    
    const tieData: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      category: data.category! || UNCATEGORIZED_LABEL,
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
            {TABS_ORDER.map((category) => (
              <div key={category} className="relative group">
                <TabsTrigger value={category} className="text-sm px-3 py-1.5 h-auto pr-8">
                  {category}
                </TabsTrigger>
                {category.toLowerCase() !== "todas" && category !== UNCATEGORIZED_LABEL && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 transform -translate-y-1/2 h-6 w-6 p-0 opacity-50 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => confirmDeleteCategory(category)}
                    aria-label={`Remover categoria ${category}`}
                  >
                    <XIcon size={14} />
                  </Button>
                )}
              </div>
            ))}
          </TabsList>

          {TABS_ORDER.map((category) => {
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
        categories={categories.filter(c => c.toLowerCase() !== 'todas' && c !== UNCATEGORIZED_LABEL)}
        onAddCategory={handleAddCategory}
      />

      <AlertDialog open={isDeleteCategoryAlertOpen} onOpenChange={setIsDeleteCategoryAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{categoryToDelete}"? As gravatas nesta categoria serão movidas para "{UNCATEGORIZED_LABEL}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}
