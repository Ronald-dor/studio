
'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * @fileOverview Service for handling image uploads and deletions in Firebase Storage.
 */

/**
 * Uploads an image file or blob to Firebase Storage and returns its download URL.
 * @param userId - The ID of the user uploading the image.
 * @param file - The image file (File or Blob) to upload.
 * @param tieId - The ID of the tie, used to create a structured path.
 * @param existingImageUrl - Optional. If an image already exists, its path will be extracted to delete it before uploading the new one.
 * @returns The public download URL of the uploaded image.
 * @throws If the upload fails.
 */
export async function uploadImageAndGetURL(
  userId: string,
  file: File | Blob,
  tieId: string,
  existingImageUrl?: string | null
): Promise<string> {
  if (!userId || !tieId) {
    throw new Error('User ID and Tie ID are required for image upload.');
  }

  // If an old image URL is provided, try to delete the old image from storage.
  if (existingImageUrl && existingImageUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const oldImageRef = ref(storage, existingImageUrl);
      await deleteObject(oldImageRef);
    } catch (error: any) {
      // Log deletion error but don't block new upload if deletion fails (e.g., file not found)
      console.warn('Failed to delete old image or old image did not exist:', error.code, error.message);
    }
  }
  
  const fileName = `tie_image_${Date.now()}_${(file instanceof File) ? file.name : 'webcam.webp'}`;
  const imagePath = `users/${userId}/ties/${tieId}/${fileName}`;
  const storageRef = ref(storage, imagePath);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw error; 
  }
}

/**
 * Deletes an image from Firebase Storage based on its download URL.
 * @param imageUrl The download URL of the image to delete.
 * @returns A promise that resolves when the deletion is attempted.
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    console.warn('Invalid image URL provided for deletion or not a Firebase Storage URL.');
    return;
  }
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error: any) {
    // Log deletion error but don't fail catastrophically if file not found etc.
    console.error('Failed to delete image from Firebase Storage:', error.code, error.message);
    if (error.code === 'storage/object-not-found') {
      // If the object doesn't exist, we can consider the deletion "successful" in terms of outcome
      return;
    }
    throw error;
  }
}
