
import { db } from '@/lib/firebase';
import type { Tie, TieFormData, TieCategory } from '@/lib/types';
import { UNCATEGORIZED_LABEL } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  where,
  Timestamp // Import Timestamp if you plan to use server timestamps
} from 'firebase/firestore';

const tiesCollectionRef = collection(db, 'ties');

// NOTA: Para imagens, salvar Data URIs diretamente no Firestore não é ideal para produção.
// Considere usar o Firebase Storage para fazer upload das imagens e armazenar apenas a URL da imagem no Firestore.

export const getTiesFromFirestore = async (): Promise<Tie[]> => {
  try {
    const querySnapshot = await getDocs(tiesCollectionRef);
    const ties = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tie));
    return ties.map(tie => ({
        ...tie,
        category: tie.category || UNCATEGORIZED_LABEL, // Garante que categoria nula/vazia seja tratada
    }));
  } catch (error) {
    console.error("Error fetching ties from Firestore: ", error);
    throw error; // Re-throw para que o chamador possa lidar com isso
  }
};

export const addTieToFirestore = async (tieData: Omit<TieFormData, 'id' | 'imageFile'> & { imageUrl: string }): Promise<Tie> => {
  try {
    const docRef = await addDoc(tiesCollectionRef, {
        ...tieData,
        // createdAt: Timestamp.now() // Opcional: para rastrear quando foi criado
    });
    return { ...tieData, id: docRef.id };
  } catch (error) {
    console.error("Error adding tie to Firestore: ", error);
    throw error;
  }
};

export const updateTieInFirestore = async (id: string, tieData: Omit<TieFormData, 'id' | 'imageFile'> & { imageUrl: string }): Promise<void> => {
  try {
    const tieDoc = doc(db, 'ties', id);
    await updateDoc(tieDoc, tieData);
  } catch (error) {
    console.error("Error updating tie in Firestore: ", error);
    throw error;
  }
};

export const deleteTieFromFirestore = async (id: string): Promise<void> => {
  try {
    const tieDoc = doc(db, 'ties', id);
    await deleteDoc(tieDoc);
  } catch (error) {
    console.error("Error deleting tie from Firestore: ", error);
    throw error;
  }
};

export const batchUpdateTieCategoriesInFirestore = async (oldCategory: TieCategory, newCategory: TieCategory): Promise<void> => {
  try {
    const q = query(tiesCollectionRef, where("category", "==", oldCategory));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return; // Nenhuma gravata para atualizar
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(documentSnapshot => {
      batch.update(documentSnapshot.ref, { category: newCategory });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error batch updating tie categories in Firestore: ", error);
    throw error;
  }
};
