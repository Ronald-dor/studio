
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt, LogOut, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNCATEGORIZED_LABEL } from '@/lib/types';
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

// Dados iniciais (serão usados apenas se o Firestore estiver vazio na primeira carga das categorias)
const defaultCategoriesForSeed: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];

export default function HomePage() {
  const router = useRouter();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const [ties, setTies] = useState<Tie[]>([]); 
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // Estado de carregamento para Firestore

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);

  // Autenticação
  useEffect(() => {
    const authStatus = localStorage.getItem('tieTrackAuth') === 'true';
    setIsAuthenticated(authStatus);
    setCurrentYear(new Date().getFullYear()); // Pode ser definido aqui, pois não depende de mais nada
    setIsClientLoaded(true);

    if (!authStatus) {
      router.push('/login');
    }
  }, [router]);

  // Carregar dados do Firestore
  useEffect(() => {
    if (!isClientLoaded || isAuthenticated !== true) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [loadedTies, loadedCategories] = await Promise.all([
          getTiesFromFirestore(),
          getCategoriesFromFirestore(defaultCategoriesForSeed) // Passa as categorias padrão para semear se necessário
        ]);
        
        setTies(loadedTies);

        // Garante que UNCATEGORIZED_LABEL esteja presente se alguma gravata a usa mas não está na lista de categorias
        const tiesUseUncategorized = loadedTies.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
        let finalCategories = [...loadedCategories];
        if (tiesUseUncategorized && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
          finalCategories.push(UNCATEGORIZED_LABEL);
        }
        // Garante que UNCATEGORIZED_LABEL esteja sempre presente se for a única opção
        if (finalCategories.length === 0 && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
          finalCategories.push(UNCATEGORIZED_LABEL);
        }
        setCategories(Array.from(new Set(finalCategories)).sort());

      } catch (error) {
         console.error("Erro ao buscar dados do Firestore:", error);
         toast({
           variant: "destructive",
           title: "Erro ao Carregar Dados",
           description: "Não foi possível carregar os dados do servidor.",
         });
         // Pode definir um estado de erro aqui se necessário
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [isClientLoaded, isAuthenticated, toast]);

  // Efeito para gerenciar UNCATEGORIZED_LABEL na lista de categorias dinamicamente com base nas gravatas
  // Este useEffect ajuda a manter a lista de categorias consistente com as gravatas existentes
  useEffect(() => {
    if (isLoadingData || !isClientLoaded || isAuthenticated !== true) return;

    const tiesUseUncategorized = ties.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
    const hasUncategorizedInCategories = categories.includes(UNCATEGORIZED_LABEL);

    if (tiesUseUncategorized && !hasUncategorizedInCategories) {
      setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    }
    // Se todas as categorias (incluindo as definidas pelo usuário) forem removidas, 
    // e UNCATEGORIZED_LABEL não estiver lá, adicione-a de volta.
    else if (categories.length === 0 && !hasUncategorizedInCategories) {
       setCategories([UNCATEGORIZED_LABEL]);
    }
    // Se UNCATEGORIZED_LABEL foi explicitamente removida (não está em categories)
    // mas ainda existem gravatas que são UNCATEGORIZED_LABEL, adicione-a de volta.
    // Isso pode acontecer se a remoção da categoria falhou ou se os dados ficaram dessincronizados.
    else if (!hasUncategorizedInCategories && tiesUseUncategorized) {
        setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    }

  }, [ties, categories, isLoadingData, isClientLoaded, isAuthenticated]);


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
    // NOTA: Para Firebase, o ideal seria fazer upload da imageFile para o Firebase Storage aqui
    // e retornar a URL do Firebase Storage.
    // Por enquanto, continuaremos usando Data URIs como placeholder.
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
    
    try {
      await addCategoryToFirestore(trimmedName);
      setCategories(prevCategories => Array.from(new Set([...prevCategories, trimmedName])).sort());
      toast({ title: "Categoria Adicionada", description: `A categoria "${trimmedName}" foi adicionada.` });
      return true;
    } catch (error) {
      console.error("Erro ao adicionar categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível adicionar a categoria.", variant: "destructive" });
      return false;
    }
  }, [categories, toast, isClientLoaded, isAuthenticated]);

  const handleDeleteCategoryRequest = (category: TieCategory) => {
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const handleDeleteCategory = useCallback(async () => {
    if (!isClientLoaded || isAuthenticated !== true || !categoryToDelete) return;

    const categoryBeingDeleted = categoryToDelete; // Salva antes de setCategoryToDelete(null)
    setCategoryToDelete(null); // Fecha o diálogo de confirmação imediatamente
    setIsConfirmDeleteCategoryOpen(false);

    try {
      let toastMessage = "";
      if (categoryBeingDeleted !== UNCATEGORIZED_LABEL) {
        // Mover gravatas para UNCATEGORIZED_LABEL no Firestore
        await batchUpdateTieCategoriesInFirestore(categoryBeingDeleted, UNCATEGORIZED_LABEL);
        // Atualizar estado local das gravatas
        setTies(prevTies => 
            prevTies.map(tie => 
                tie.category === categoryBeingDeleted ? { ...tie, category: UNCATEGORIZED_LABEL } : tie
            )
        );
        toastMessage = `A categoria "${categoryBeingDeleted}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
      } else {
         toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação até serem editadas.`;
      }
      
      await deleteCategoryFromFirestore(categoryBeingDeleted);
      
      setCategories(prevCategories => {
          const updated = prevCategories.filter(cat => cat !== categoryBeingDeleted).sort();
          // Lógica para garantir UNCATEGORIZED_LABEL se necessário (já coberta por outro useEffect)
          return updated;
      }); 
      
      if (activeTab === categoryBeingDeleted) {
          setActiveTab(UNCATEGORIZED_LABEL); 
      }
      toast({ title: "Categoria Removida", description: toastMessage });
    } catch (error) {
      console.error("Erro ao remover categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a categoria.", variant: "destructive" });
    }
  }, [activeTab, toast, isClientLoaded, isAuthenticated, categoryToDelete]); // Adicionado categoryToDelete aqui


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    
    // TODO: Implementar upload para Firebase Storage se imageFile existir
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

    try {
      if (editingTie?.id) {
        await updateTieInFirestore(editingTie.id, tieDataForSave);
        setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...tieDataForSave, id: editingTie.id } : t));
        toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
      } else {
        const newTie = await addTieToFirestore(tieDataForSave);
        setTies(prevTies => [newTie, ...prevTies]);
        toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
      }

      // Adicionar nova categoria ao Firestore se ela não existir E não for UNCATEGORIZED_LABEL
      // UNCATEGORIZED_LABEL é implícita ou gerenciada pelo seu useEffect dedicado
      if (tieCategory !== UNCATEGORIZED_LABEL && !categories.includes(tieCategory)) { 
        await addCategoryToFirestore(tieCategory);
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
      } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
        // Se for UNCATEGORIZED_LABEL e ela foi removida, este fluxo a adiciona de volta à lista de categorias visíveis
        // se uma gravata for atribuída a ela.
        // O `addCategoryToFirestore` não é chamado para UNCATEGORIZED_LABEL, pois ela não deve ser "adicionável" explicitamente.
        // Se ela foi deletada do Firestore, o useEffect que gerencia UNCATEGORIZED_LABEL deve lidar com sua recriação.
        setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
      }

    } catch (error) {
      console.error("Erro ao salvar gravata no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível salvar a gravata.", variant: "destructive" });
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast, isClientLoaded, isAuthenticated, ties]); // Adicionado ties

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!isClientLoaded || isAuthenticated !== true) return;
    const tieToDelete = ties.find(t => t.id === id);
    
    try {
      await deleteTieFromFirestore(id);
      setTies(prevTies => prevTies.filter(tie => tie.id !== id));
      toast({ title: "Gravata Removida", description: `${tieToDelete?.name || "Gravata"} foi removida.`, variant: "destructive" });
    } catch (error) {
      console.error("Erro ao remover gravata no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível remover a gravata.", variant: "destructive" });
    }
  }; 

  const openAddDialog = () => {
    setEditingTie(undefined);
    setIsDialogOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tieTrackAuth');
    setIsAuthenticated(false); 
    setTies([]); // Limpa os dados ao sair
    setCategories([]);
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
    // O useEffect já trata do redirecionamento, mas esta é uma guarda adicional
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando para o login...</p>
      </div>
    );
  }
  
  const filteredTies = ties.filter(tie => {
    const matchesSearchTerm = tie.name.toLowerCase().includes(searchTerm.toLowerCase());
    const currentCategory = tie.category || UNCATEGORIZED_LABEL; // Trata categoria nula/vazia como UNCATEGORIZED_LABEL para filtro
    const matchesCategory = activeTab === "Todas" || currentCategory === activeTab;
    return matchesSearchTerm && matchesCategory;
  });

  // Ordena as categorias para exibição nas abas
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
   // Se categories (o estado) estiver vazio e UNCATEGORIZED_LABEL não estiver lá,
   // o useEffect que gerencia UNCATEGORIZED_LABEL deve ter cuidado disso se default/gravatas a usarem.
   // Se, mesmo assim, estiver vazio, tabsToDisplay será só ["Todas"].

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
        {isLoadingData ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando dados do servidor...</p>
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
          // Filtra UNCATEGORIZED_LABEL para não ser uma opção de deleção/adição explícita no dropdown,
          // mas ela ainda pode ser usada/atribuída.
          allCategories={categories.filter(cat => cat !== UNCATEGORIZED_LABEL)}
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
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}
