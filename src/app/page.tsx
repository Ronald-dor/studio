"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TieList } from '@/components/TieList';
import { AddTieDialog } from '@/components/AddTieDialog';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { PlusCircle, Shirt } from 'lucide-react'; // Shirt can be an icon for ties
import { useToast } from '@/hooks/use-toast';

const initialTiesData: Omit<Tie, 'id'>[] = [
  { name: 'Classic Silk Blue', quantity: 10, unitPrice: 25, category: 'Solid', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Red Striped Power Tie', quantity: 5, unitPrice: 30, category: 'Striped', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Dotted Burgundy Necktie', quantity: 8, unitPrice: 22, category: 'Dotted', imageUrl: 'https://placehold.co/300x400.png' },
  { name: 'Green Plaid Wool Tie', quantity: 3, unitPrice: 35, category: 'Plaid', imageUrl: 'https://placehold.co/300x400.png' },
];


export default function HomePage() {
  const [ties, setTies] = useState<Tie[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTie, setEditingTie] = useState<TieFormData | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // Load ties from localStorage or use initial data
    const storedTies = localStorage.getItem('tieTrackTies');
    if (storedTies) {
      setTies(JSON.parse(storedTies));
    } else {
      // Initialize with UUIDs
      const tiesWithIds = initialTiesData.map(tie => ({ ...tie, id: crypto.randomUUID() }));
      setTies(tiesWithIds);
    }
  }, []);

  useEffect(() => {
    // Save ties to localStorage whenever they change
    if (ties.length > 0 || localStorage.getItem('tieTrackTies')) { // only save if ties initialized or already exist
        localStorage.setItem('tieTrackTies', JSON.stringify(ties));
    }
  }, [ties]);

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

  const handleFormSubmit = async (data: TieFormData) => {
    const finalImageUrl = await processImageAndGetUrl(data.imageFile, data.imageUrl);
    
    const tieData: Omit<Tie, 'id'> = {
      name: data.name!,
      quantity: data.quantity!,
      unitPrice: data.unitPrice!,
      category: data.category!,
      imageUrl: finalImageUrl,
    };

    if (editingTie?.id) {
      // Editing existing tie
      setTies(ties.map(t => t.id === editingTie.id ? { ...tieData, id: editingTie.id } : t));
      toast({ title: "Tie Updated", description: `${data.name} has been updated.` });
    } else {
      // Adding new tie
      const newTie: Tie = { ...tieData, id: crypto.randomUUID() };
      setTies([...ties, newTie]);
      toast({ title: "Tie Added", description: `${data.name} has been added to your inventory.` });
    }
    setEditingTie(undefined);
    setIsDialogOpen(false);
  };

  const handleEditTie = (tie: Tie) => {
    setEditingTie({ ...tie, imageFile: null }); // imageFile is for new uploads
    setIsDialogOpen(true);
  };

  const handleDeleteTie = (id: string) => {
    const tieToDelete = ties.find(t => t.id === id);
    setTies(ties.filter(t => t.id !== id));
    if (tieToDelete) {
      toast({ title: "Tie Deleted", description: `${tieToDelete.name} has been removed.`, variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingTie(undefined);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 md:px-8 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shirt size={32} className="text-primary" />
            <h1 className="text-3xl font-bold text-primary">TieTrack</h1>
          </div>
          <Button onClick={openAddDialog} variant="default">
            <PlusCircle size={20} className="mr-2" /> Add New Tie
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <TieList ties={ties} onEdit={handleEditTie} onDelete={handleDeleteTie} />
      </main>

      <AddTieDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={editingTie}
      />
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-12">
        © {new Date().getFullYear()} TieTrack. Keep your collection organized.
      </footer>
    </div>
  );
}
