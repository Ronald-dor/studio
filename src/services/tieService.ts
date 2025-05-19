
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
  Timestamp 
} from 'firebase/firestore';

// Helper para obter a referência da coleção de gravatas de um usuário
const getUserTiesCollectionRef = (userId: string) => {
  return collection(db, 'users', userId, 'ties');
};

// NOTA: Para imagens, salvar Data URIs diretamente no Firestore não é ideal para produção.
// Considere usar o Firebase Storage para fazer upload das imagens e armazenar apenas a URL da imagem no Firestore.

export const getTiesFromFirestore = async (userId: string): Promise<Tie[]> => {
  if (!userId) throw new Error("User ID is required to fetch ties.");
  try {
    const querySnapshot = await getDocs(getUserTiesCollectionRef(userId));
    const ties = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tie));
    return ties.map(tie => ({
        ...tie,
        category: tie.category || UNCATEGORIZED_LABEL, 
    }));
  } catch (error) {
    console.error("Error fetching ties from Firestore: ", error);
    throw error;
  }
};

export const addTieToFirestore = async (userId: string, tieData: Omit<TieFormData, 'id' | 'imageFile'> & { imageUrl: string }): Promise<Tie> => {
  if (!userId) throw new Error("User ID is required to add a tie.");
  try {
    const docRef = await addDoc(getUserTiesCollectionRef(userId), {
        ...tieData,
        // createdAt: Timestamp.now() 
    });
    return { ...tieData, id: docRef.id };
  } catch (error) {
    console.error("Error adding tie to Firestore: ", error);
    throw error;
  }
};

export const updateTieInFirestore = async (userId: string, id: string, tieData: Omit<TieFormData, 'id' | 'imageFile'> & { imageUrl: string }): Promise<void> => {
  if (!userId) throw new Error("User ID is required to update a tie.");
  try {
    const tieDoc = doc(db, 'users', userId, 'ties', id);
    await updateDoc(tieDoc, tieData);
  } catch (error) {
    console.error("Error updating tie in Firestore: ", error);
    throw error;
  }
};

export const deleteTieFromFirestore = async (userId: string, id: string): Promise<void> => {
  if (!userId) throw new Error("User ID is required to delete a tie.");
  try {
    const tieDoc = doc(db, 'users', userId, 'ties', id);
    await deleteDoc(tieDoc);
  } catch (error) {
    console.error("Error deleting tie from Firestore: ", error);
    throw error;
  }
};

export const batchUpdateTieCategoriesInFirestore = async (userId: string, oldCategory: TieCategory, newCategory: TieCategory): Promise<void> => {
  if (!userId) throw new Error("User ID is required to batch update tie categories.");
  try {
    const q = query(getUserTiesCollectionRef(userId), where("category", "==", oldCategory));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return; 
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
