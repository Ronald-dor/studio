"use client";

import React, { useState, useEffect } from 'react';
import type { Tie } from '@/lib/types';
import { TieCard } from './TieCard';
import { collection, onSnapshot, query, where } from 'firebase/firestore'; // Importe 'where'
import { db } from '@/lib/firebase';
import { UNCATEGORIZED_LABEL } from '@/lib/types'; // Importe o rótulo de uncategorized

interface TieListProps {
  onEdit: (tie: Tie) => void;
  onDelete: (id: string) => void;
  searchTerm: string; // Nova prop para termo de pesquisa
  activeCategory?: string; // Nova prop para categoria ativa (opcional)
}

export function TieList({ onEdit, onDelete, searchTerm, activeCategory }: TieListProps) {
  const [ties, setTies] = useState<Tie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); // Reset loading state on prop change
    setError(null); // Clear previous errors

    // Crie a query base
    let q = query(collection(db, "ties"));

    // Adicione filtro por categoria se uma categoria específica estiver ativa (não "Todas")
    if (activeCategory && activeCategory !== "Todas") {
        if (activeCategory === UNCATEGORIZED_LABEL) {
             // Filtra por laços onde a categoria é explicitamente UNCATEGORIZED_LABEL ou é nula/vazia
            q = query(q, where("category", "in", [UNCATEGORIZED_LABEL, null, ""]));
        } else {
            q = query(q, where("category", "==", activeCategory));
        }
    }
     // Nota: Filtragem por termo de pesquisa será feita no frontend após obter os dados da query.
     // O Firestore tem limitações em consultas de texto completo e múltiplas condições '!=' ou 'not-in'.
     // Filtrar por termo de pesquisa no frontend é mais flexível para o nome.

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tiesData: Tie[] = [];
      snapshot.forEach((doc) => {
        const tie = {
          id: doc.id,
          ...(doc.data() as any)
        } as Tie; // Cast para Tie
        // Garantir que a categoria 'null' ou '' seja tratada como UNCATEGORIZED_LABEL para a UI
         if (tie.category === null || tie.category === "") {
             tie.category = UNCATEGORIZED_LABEL;
         }
        tiesData.push(tie);
      });
      
      // Aplicar filtragem por termo de pesquisa NO FRONTEND
      const filteredBySearchTerm = tiesData.filter(tie =>
        tie.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setTies(filteredBySearchTerm);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar laços: ", error);
      setError("Erro ao carregar laços.");
      setLoading(false);
    });

    // Limpa a inscrição quando as dependências do useEffect mudarem ou o componente desmontar
    return () => unsubscribe();
    // Adicionamos searchTerm e activeCategory como dependências
  }, [activeCategory, searchTerm]); // Adicionado activeCategory e searchTerm como dependências

  if (loading) {
    return <div className="text-center py-10">Carregando laços...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (ties.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Nenhuma gravata para exibir para a seleção atual.</p>
        <p className="text-sm text-muted-foreground">Tente uma categoria ou termo de pesquisa diferente, ou adicione uma nova gravata se seu inventário estiver vazio.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {ties.map((tie) => (
        <TieCard key={tie.id} tie={tie} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
