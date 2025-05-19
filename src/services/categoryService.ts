
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

// Usaremos um único documento para armazenar a lista de categorias.
const CATEGORIES_DOC_ID = 'tieCategories';
const CATEGORIES_COLLECTION = 'app_config'; // Ou qualquer coleção que você queira usar para configurações
const categoriesDocRef = doc(db, CATEGORIES_COLLECTION, CATEGORIES_DOC_ID);

const getCategoriesDocument = async (): Promise<{ categories?: TieCategory[] }> => {
  const docSnap = await getDoc(categoriesDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as { categories?: TieCategory[] };
  }
  return {}; // Retorna objeto vazio se o documento não existe
};

export const getCategoriesFromFirestore = async (defaultCategories: TieCategory[]): Promise<TieCategory[]> => {
  try {
    const data = await getCategoriesDocument();
    if (data.categories && data.categories.length > 0) {
      // Garante que categorias padrão e UNCATEGORIZED_LABEL sejam respeitadas se não estiverem no Firestore ainda
      // ou se o Firestore estiver vazio.
      const combined = Array.from(new Set([...defaultCategories, ...data.categories]));
      if (!combined.includes(UNCATEGORIZED_LABEL)) combined.push(UNCATEGORIZED_LABEL);
      return combined.sort();

    }
    // Se não há categorias no Firestore, cria o documento com as padrões.
    await setDoc(categoriesDocRef, { categories: defaultCategories });
    const initialCategories = [...defaultCategories];
    if (!initialCategories.includes(UNCATEGORIZED_LABEL)) initialCategories.push(UNCATEGORIZED_LABEL);
    return initialCategories.sort();

  } catch (error) {
    console.error("Error fetching categories from Firestore: ", error);
    // Em caso de erro, retorna as categorias padrão para não quebrar a UI
    const errorDefaults = [...defaultCategories];
    if (!errorDefaults.includes(UNCATEGORIZED_LABEL)) errorDefaults.push(UNCATEGORIZED_LABEL);
    return errorDefaults.sort();
  }
};

export const addCategoryToFirestore = async (categoryName: TieCategory): Promise<void> => {
  try {
    // Garante que o documento exista antes de tentar adicionar ao array
    const docSnap = await getDoc(categoriesDocRef);
    if (!docSnap.exists()) {
      await setDoc(categoriesDocRef, { categories: [categoryName] });
    } else {
      await updateDoc(categoriesDocRef, {
        categories: arrayUnion(categoryName)
      });
    }
  } catch (error) {
    console.error("Error adding category to Firestore: ", error);
    throw error;
  }
};

export const deleteCategoryFromFirestore = async (categoryName: TieCategory): Promise<void> => {
  try {
    await updateDoc(categoriesDocRef, {
      categories: arrayRemove(categoryName)
    });
  } catch (error) {
    console.error("Error deleting category from Firestore: ", error);
    throw error;
  }
};
