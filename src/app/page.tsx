
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
import { getAuth, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';

const defaultCategoriesForSeed: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false); // Para saber se a verificação inicial do auth terminou
  
  const [ties, setTies] = useState<Tie[]>([]); 
  const [categories, setCategories] = useState<TieCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<TieCategory | null>(null);
  const [isConfirmDeleteCategoryOpen, setIsConfirmDeleteCategoryOpen] = useState(false);

  const auth = getAuth(app);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        router.push('/login');
      }
      setAuthChecked(true); // Indica que a verificação de auth terminou
    });
    return () => unsubscribe();
  }, [router, auth]);

  // Carregar dados do Firestore APÓS o usuário ser autenticado
  useEffect(() => {
    if (!authChecked || !currentUser) {
      // Se auth não foi checado ou não há usuário, não faz nada ou limpa dados.
      // Se currentUser se torna null (logout), podemos querer limpar os dados.
      if (!currentUser) {
        setTies([]);
        setCategories([]);
        setIsLoadingData(false); // Parar de carregar se não houver usuário
      }
      return;
    }
    
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const userUid = currentUser.uid;
        const [loadedTies, loadedCategories] = await Promise.all([
          getTiesFromFirestore(userUid),
          getCategoriesFromFirestore(userUid, defaultCategoriesForSeed)
        ]);
        
        setTies(loadedTies);

        const tiesUseUncategorized = loadedTies.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
        let finalCategories = [...loadedCategories];
        if (tiesUseUncategorized && !finalCategories.includes(UNCATEGORIZED_LABEL)) {
          finalCategories.push(UNCATEGORIZED_LABEL);
        }
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
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [authChecked, currentUser, toast]); // Depende de authChecked e currentUser

  // Efeito para gerenciar UNCATEGORIZED_LABEL
  useEffect(() => {
    if (isLoadingData || !authChecked || !currentUser) return;

    const tiesUseUncategorized = ties.some(tie => !tie.category || tie.category === UNCATEGORIZED_LABEL);
    const hasUncategorizedInCategories = categories.includes(UNCATEGORIZED_LABEL);

    if (tiesUseUncategorized && !hasUncategorizedInCategories) {
      setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    }
    else if (categories.length === 0 && !hasUncategorizedInCategories) {
       setCategories([UNCATEGORIZED_LABEL]);
    }
    else if (!hasUncategorizedInCategories && tiesUseUncategorized) {
        setCategories(prev => Array.from(new Set([...prev, UNCATEGORIZED_LABEL])).sort());
    }
  }, [ties, categories, isLoadingData, authChecked, currentUser]);


  const processImageAndGetUrl = async (imageFile: File | null | undefined, currentImageUrl?: string): Promise<string> => {
    // TODO: Implementar upload para Firebase Storage e retornar a URL de lá.
    // Por enquanto, Data URIs.
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
    if (!authChecked || !currentUser) return false;
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
      return true;
    } catch (error) {
      console.error("Erro ao adicionar categoria no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível adicionar a categoria.", variant: "destructive" });
      return false;
    }
  }, [categories, toast, authChecked, currentUser]);

  const handleDeleteCategoryRequest = (category: TieCategory) => {
    setCategoryToDelete(category);
    setIsConfirmDeleteCategoryOpen(true);
  };

  const handleDeleteCategory = useCallback(async () => {
    if (!authChecked || !currentUser || !categoryToDelete) return;

    const categoryBeingDeleted = categoryToDelete;
    setCategoryToDelete(null);
    setIsConfirmDeleteCategoryOpen(false);

    try {
      let toastMessage = "";
      if (categoryBeingDeleted !== UNCATEGORIZED_LABEL) {
        await batchUpdateTieCategoriesInFirestore(currentUser.uid, categoryBeingDeleted, UNCATEGORIZED_LABEL);
        setTies(prevTies => 
            prevTies.map(tie => 
                tie.category === categoryBeingDeleted ? { ...tie, category: UNCATEGORIZED_LABEL } : tie
            )
        );
        toastMessage = `A categoria "${categoryBeingDeleted}" foi removida. Gravatas movidas para "${UNCATEGORIZED_LABEL}".`;
      } else {
         toastMessage = `A categoria "${UNCATEGORIZED_LABEL}" foi removida dos filtros. Gravatas existentes nesta categoria manterão essa designação até serem editadas.`;
      }
      
      await deleteCategoryFromFirestore(currentUser.uid, categoryBeingDeleted);
      
      setCategories(prevCategories => {
          const updated = prevCategories.filter(cat => cat !== categoryBeingDeleted).sort();
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
  }, [activeTab, toast, authChecked, currentUser, categoryToDelete]);


  const handleFormSubmit = useCallback(async (data: TieFormData) => {
    if (!authChecked || !currentUser) return;
    
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
        await updateTieInFirestore(currentUser.uid, editingTie.id, tieDataForSave);
        setTies(prevTies => prevTies.map(t => t.id === editingTie.id ? { ...tieDataForSave, id: editingTie.id } : t));
        toast({ title: "Gravata Atualizada", description: `${data.name} foi atualizada.` });
      } else {
        const newTie = await addTieToFirestore(currentUser.uid, tieDataForSave);
        setTies(prevTies => [newTie, ...prevTies]);
        toast({ title: "Gravata Adicionada", description: `${data.name} foi adicionada ao seu inventário.` });
      }

      if (tieCategory !== UNCATEGORIZED_LABEL && !categories.includes(tieCategory)) { 
        await addCategoryToFirestore(currentUser.uid, tieCategory);
        setCategories(prevCategories => Array.from(new Set([...prevCategories, tieCategory])).sort());
      } else if (tieCategory === UNCATEGORIZED_LABEL && !categories.includes(UNCATEGORIZED_LABEL)) {
        setCategories(prevCategories => Array.from(new Set([...prevCategories, UNCATEGORIZED_LABEL])).sort());
      }

    } catch (error) {
      console.error("Erro ao salvar gravata no Firestore:", error);
      toast({ title: "Erro no Servidor", description: "Não foi possível salvar a gravata.", variant: "destructive" });
    }

    setEditingTie(undefined);
    setIsDialogOpen(false);
  }, [categories, editingTie, toast, authChecked, currentUser]);

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null });
    setIsDialogOpen(true);
  };

  const handleDeleteTie = async (id: string) => {
    if (!authChecked || !currentUser) return;
    const tieToDelete = ties.find(t => t.id === id);
    
    try {
      await deleteTieFromFirestore(currentUser.uid, id);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setTies([]);
      setCategories([]);
      // router.push('/login'); // onAuthStateChanged já cuida disso
      toast({ title: "Logout Realizado", description: "Você foi desconectado." });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({ title: "Erro", description: "Não foi possível fazer logout.", variant: "destructive"});
    }
  };


  if (!authChecked) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Carregando aplicação...</p>
      </div>
    );
  }

  if (!currentUser) { 
    // Normalmente não chega aqui porque onAuthStateChanged já redireciona, mas é uma guarda.
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando para o login...</p>
      </div>
    );
  }
  
  const filteredTies = ties.filter(tie => {
    const matchesSearchTerm = tie.name.toLowerCase().includes(searchTerm.toLowerCase());
    const currentCategory = tie.category || UNCATEGORIZED_LABEL;
    const matchesCategory = activeTab === "Todas" || currentCategory === activeTab;
    return matchesSearchTerm && matchesCategory;
  });

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
