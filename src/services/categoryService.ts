
import { db } from '@/lib/firebase';
import type { TieCategory } from '@/lib/types';
import { UNCATEGORIZED_LABEL } from '@/lib/types';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

const CATEGORIES_DOC_ID = 'userCategories'; // Nome do documento para categorias do usuário
const CATEGORIES_COLLECTION_SUBPATH = 'app_settings'; // Subcoleção dentro do user doc

// Helper para obter a referência do documento de categorias de um usuário
const getUserCategoriesDocRef = (userId: string) => {
  if (!userId) throw new Error("User ID is required for category operations.");
  return doc(db, 'users', userId, CATEGORIES_COLLECTION_SUBPATH, CATEGORIES_DOC_ID);
};

const getCategoriesDocument = async (userId: string): Promise<{ categories?: TieCategory[] }> => {
  const docSnap = await getDoc(getUserCategoriesDocRef(userId));
  if (docSnap.exists()) {
    return docSnap.data() as { categories?: TieCategory[] };
  }
  return {}; 
};

export const getCategoriesFromFirestore = async (userId: string, defaultCategories: TieCategory[]): Promise<TieCategory[]> => {
  try {
    const data = await getCategoriesDocument(userId);
    let categoriesToReturn = defaultCategories;

    if (data.categories && data.categories.length > 0) {
      categoriesToReturn = Array.from(new Set([...defaultCategories, ...data.categories]));
    } else {
      // Se não há categorias no Firestore para este usuário, cria o documento com as padrões.
      await setDoc(getUserCategoriesDocRef(userId), { categories: defaultCategories });
    }
    
    // Garante que UNCATEGORIZED_LABEL esteja presente
    if (!categoriesToReturn.includes(UNCATEGORIZED_LABEL)) {
      categoriesToReturn.push(UNCATEGORIZED_LABEL);
    }
    return categoriesToReturn.sort();

  } catch (error) {
    console.error("Error fetching categories from Firestore: ", error);
    const errorDefaults = [...defaultCategories];
    if (!errorDefaults.includes(UNCATEGORIZED_LABEL)) errorDefaults.push(UNCATEGORIZED_LABEL);
    return errorDefaults.sort();
  }
};

export const addCategoryToFirestore = async (userId: string, categoryName: TieCategory): Promise<void> => {
  try {
    const userCategoriesRef = getUserCategoriesDocRef(userId);
    const docSnap = await getDoc(userCategoriesRef);
    if (!docSnap.exists()) {
      // Se o documento não existe, cria com a primeira categoria
      await setDoc(userCategoriesRef, { categories: [categoryName] });
    } else {
      // Se existe, adiciona ao array
      await updateDoc(userCategoriesRef, {
        categories: arrayUnion(categoryName)
      });
    }
  } catch (error) {
    console.error("Error adding category to Firestore: ", error);
    throw error;
  }
};

export const deleteCategoryFromFirestore = async (userId: string, categoryName: TieCategory): Promise<void> => {
  try {
    await updateDoc(getUserCategoriesDocRef(userId), {
      categories: arrayRemove(categoryName)
    });
  } catch (error) {
    console.error("Error deleting category from Firestore: ", error);
    throw error;
  }
};
