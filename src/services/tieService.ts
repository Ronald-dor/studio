
import type { Tie, TieFormData } from '@/lib/types';
import { db } from '@/lib/firebase';
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

const tiesCollectionRef = collection(db, 'ties');

export async function getTies(): Promise<Tie[]> {
  try {
    const tieSnapshot = await getDocs(tiesCollectionRef);
    const ties = tieSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Ensure any Firestore Timestamps are converted to strings or numbers if needed by your components
        // For this example, assuming direct mapping is fine or types are already compatible
      } as Tie;
    });
    return ties;
  } catch (error) {
    console.error("Error fetching ties: ", error);
    throw error; // Re-throw to be caught by calling function
  }
}

export async function addTie(tieData: Omit<Tie, 'id'>): Promise<Tie> {
  try {
    // TODO: If tieData.imageUrl is a Data URI, consider uploading to Firebase Storage 
    // and storing the URL instead, especially for production.
    const docRef = await addDoc(tiesCollectionRef, {
      ...tieData,
      createdAt: Timestamp.now(), // Optional: add a timestamp
    });
    return { ...tieData, id: docRef.id };
  } catch (error) {
    console.error("Error adding tie: ", error);
    throw error;
  }
}

export async function updateTie(id: string, tieData: Partial<TieFormData>): Promise<Tie | null> {
  try {
    const tieDoc = doc(db, 'ties', id);
    // TODO: Handle image updates - if tieData.imageUrl changes and it's a new Data URI,
    // consider Firebase Storage.
    await updateDoc(tieDoc, {
      ...tieData,
      updatedAt: Timestamp.now(), // Optional: add an update timestamp
    });
    // To return the full updated tie, we might need to fetch it again or merge,
    // for simplicity, let's assume the partial data is enough for optimistic updates
    // or the caller refetches. For this example, we'll construct it.
    const updatedTieData = { ... (await getDoc(tieDoc)).data(), ...tieData, id } as Tie;
    return updatedTieData;
  } catch (error) {
    console.error("Error updating tie: ", error);
    throw error;
  }
}

export async function deleteTie(id: string): Promise<void> {
  try {
    const tieDoc = doc(db, 'ties', id);
    await deleteDoc(tieDoc);
  } catch (error) {
    console.error("Error deleting tie: ", error);
    throw error;
  }
}

export async function batchUpdateTieCategories(oldCategory: string, newCategory: string): Promise<void> {
  try {
    const q = query(tiesCollectionRef, where("category", "==", oldCategory));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.update(doc(db, "ties", document.id), { category: newCategory });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error batch updating tie categories: ", error);
    throw error;
  }
}
