
import type { TieCategory } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { UNCATEGORIZED_LABEL } from '@/lib/types';

const tieCategoriesDocRef = doc(db, 'app_config', 'tieCategories');

// Default categories to seed if the document doesn't exist.
const seedDefaultCategories: TieCategory[] = ['Lisa', 'Listrada', 'Pontilhada'];


export async function getCategories(): Promise<TieCategory[]> {
  try {
    const docSnap = await getDoc(tieCategoriesDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.list || [];
    } else {
      // Optional: Seed categories if document doesn't exist
      // await setDoc(tieCategoriesDocRef, { list: seedDefaultCategories, createdAt: Timestamp.now() });
      // return seedDefaultCategories;
      // For now, if it doesn't exist, it means no categories have been explicitly saved yet.
      return [];
    }
  } catch (error) {
    console.error("Error fetching categories: ", error);
    throw error;
  }
}

export async function addCategory(categoryName: string): Promise<void> {
  if (categoryName === UNCATEGORIZED_LABEL) { // Prevent adding "Sem Categoria" as a managed category
    console.warn("Attempted to add UNCATEGORIZED_LABEL as a managed category.");
    return;
  }
  try {
    const docSnap = await getDoc(tieCategoriesDocRef);
    if (docSnap.exists()) {
      await updateDoc(tieCategoriesDocRef, { 
        list: arrayUnion(categoryName),
        updatedAt: Timestamp.now()
      });
    } else {
      await setDoc(tieCategoriesDocRef, { 
        list: [categoryName],
        createdAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error("Error adding category: ", error);
    throw error;
  }
}

export async function deleteCategory(categoryName: string): Promise<void> {
   if (categoryName === UNCATEGORIZED_LABEL) {
    // "Sem Categoria" is not stored in the category list in Firestore, it's a derived concept.
    // Or, if we allow its "deletion" from UI, it means it won't be a filter, but ties might still have it.
    console.warn("UNCATEGORIZED_LABEL cannot be deleted from Firestore category list as it's not explicitly stored there.");
    return; 
  }
  try {
    const docSnap = await getDoc(tieCategoriesDocRef);
    if (docSnap.exists()) {
      await updateDoc(tieCategoriesDocRef, { 
        list: arrayRemove(categoryName),
        updatedAt: Timestamp.now() 
      });
    }
  } catch (error) {
    console.error("Error deleting category: ", error);
    throw error;
  }
}
