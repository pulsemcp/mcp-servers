import { z } from 'zod';

// =============================================================================
// Good Eggs Data Types
// =============================================================================

export interface GroceryItem {
  url: string;
  name: string;
  brand: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  unit?: string;
  imageUrl?: string;
}

export interface GroceryDetails {
  url: string;
  name: string;
  brand: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  unit?: string;
  description?: string;
  productDetails?: string;
  availability?: string[];
  imageUrl?: string;
}

export interface PastOrder {
  date: string;
  orderNumber?: string;
  total?: string;
  itemCount?: number;
}

export interface CartResult {
  success: boolean;
  message: string;
  itemName?: string;
  quantity?: number;
}

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const SearchGrocerySchema = z.object({
  query: z
    .string()
    .describe('Search query for groceries (e.g., "organic apples", "milk", "bread")'),
});

const goodEggsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('https://www.goodeggs.com/'), {
    message: 'URL must be a Good Eggs URL (https://www.goodeggs.com/...)',
  });

export const GetGroceryDetailsSchema = z.object({
  grocery_url: goodEggsUrlSchema.describe(
    'The Good Eggs URL of the grocery item to get details for'
  ),
});

export const AddToCartSchema = z.object({
  grocery_url: goodEggsUrlSchema.describe('The Good Eggs URL of the grocery item to add to cart'),
  quantity: z
    .number()
    .min(1)
    .optional()
    .default(1)
    .describe('Quantity to add (minimum 1, default: 1)'),
});

export const GetPastOrderGroceriesSchema = z.object({
  past_order_date: z
    .string()
    .describe('The date of the past order to get groceries from (e.g., "2024-01-15")'),
});

export const AddFavoriteSchema = z.object({
  grocery_url: goodEggsUrlSchema.describe(
    'The Good Eggs URL of the grocery item to add to favorites'
  ),
});

export const RemoveFavoriteSchema = z.object({
  grocery_url: goodEggsUrlSchema.describe(
    'The Good Eggs URL of the grocery item to remove from favorites'
  ),
});

export const RemoveFromCartSchema = z.object({
  grocery_url: goodEggsUrlSchema.describe(
    'The Good Eggs URL of the grocery item to remove from cart'
  ),
});

// =============================================================================
// Playwright Configuration
// =============================================================================

export interface GoodEggsConfig {
  username: string;
  password: string;
  headless: boolean;
  timeout: number;
}
