
import { z } from 'zod';

export type TieCategory = string;
export const UNCATEGORIZED_LABEL = 'Sem Categoria';
const PLACEHOLDER_IMAGE_URL = `https://placehold.co/300x400.png`;

export const TieSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "O nome é obrigatório." }).max(100, { message: "O nome deve ter 100 caracteres ou menos." }),
  quantity: z.coerce.number().int().min(0, { message: "O estoque deve ser um número inteiro não negativo." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço unitário deve ser não negativo." }),
  valueInQuantity: z.coerce.number().min(0, {message: "O valor em quantidade deve ser não negativo."}).optional().default(0),
  category: z.string().default(UNCATEGORIZED_LABEL),
  imageUrl: z.string().url({ message: "URL da imagem inválida." }).default(PLACEHOLDER_IMAGE_URL), 
  // imageFile is only used on the client-side for form handling and not stored in Firestore.
  // If imageFile is present, it should be uploaded to Firebase Storage, 
  // and its resulting URL stored in imageUrl.
});

export type Tie = z.infer<typeof TieSchema> & {
  id: string; 
};

export type TieFormData = z.infer<typeof TieSchema> & {
  imageFile?: File | null; // For handling file uploads on the client
};
