import { z } from 'zod';

export const tieCategories = ["Solid", "Striped", "Dotted", "Plaid", "Floral", "Paisley", "Geometric", "Novelty"] as const;
export type TieCategory = (typeof tieCategories)[number];

export const TieSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Name is required." }).max(100, { message: "Name must be 100 characters or less." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitPrice: z.coerce.number().min(0, { message: "Unit price must be non-negative." }),
  category: z.enum(tieCategories, { message: "Please select a valid category." }),
  imageUrl: z.string().default(`https://placehold.co/300x400.png`), 
});

export type Tie = z.infer<typeof TieSchema> & {
  id: string; 
};

export type TieFormData = z.infer<typeof TieSchema> & {
  imageFile?: File | null;
};
