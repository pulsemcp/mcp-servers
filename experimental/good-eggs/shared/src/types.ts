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

export const GetGroceryDetailsSchema = z.object({
  grocery_url: z.string().describe('The Good Eggs URL of the grocery item to get details for'),
});

export const AddToCartSchema = z.object({
  grocery_url: z.string().describe('The Good Eggs URL of the grocery item to add to cart'),
  quantity: z.number().optional().default(1).describe('Quantity to add (default: 1)'),
});

export const GetPastOrderGroceriesSchema = z.object({
  past_order_date: z
    .string()
    .describe('The date of the past order to get groceries from (e.g., "2024-01-15")'),
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
