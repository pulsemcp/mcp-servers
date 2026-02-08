import { z } from 'zod';

// =============================================================================
// Fetch Pet Data Types
// =============================================================================

/**
 * Represents a pet insurance claim
 */
export interface Claim {
  claimId: string;
  petName: string;
  claimDate: string;
  claimAmount: string;
  status: string;
  description?: string;
  invoiceDate?: string;
  providerName?: string;
}

/**
 * Detailed claim information including EOB and invoice
 */
export interface ClaimDetails extends Claim {
  eobSummary?: string;
  invoiceSummary?: string;
  eobFileUrl?: string;
  invoiceFileUrl?: string;
  localEobPath?: string;
  localInvoicePath?: string;
  reimbursementAmount?: string;
  deductible?: string;
  copay?: string;
  notes?: string;
  submittedDate?: string;
  processedDate?: string;
}

/**
 * Claim submission data that we prepare before submitting
 */
export interface ClaimSubmissionData {
  petName: string;
  invoiceDate: string;
  invoiceAmount: string;
  providerName: string;
  claimDescription: string;
  invoiceFile?: string;
  medicalRecordsFile?: string;
  isReadyToSubmit: boolean;
  validationErrors: string[];
  confirmationMessage: string;
}

/**
 * Result of claim submission
 */
export interface ClaimSubmissionResult {
  success: boolean;
  message: string;
  claimId?: string;
  confirmationNumber?: string;
}

/**
 * Configuration for Fetch Pet client
 */
export interface FetchPetConfig {
  username: string;
  password: string;
  headless: boolean;
  timeout: number;
  downloadDir: string;
}

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const PrepareClaimSchema = z.object({
  pet_name: z.string().describe('Name of the pet for this claim'),
  invoice_date: z.string().describe('Date of the invoice (YYYY-MM-DD or MM/DD/YYYY)'),
  invoice_amount: z.string().describe('Total amount of the invoice (e.g., "$150.00" or "150.00")'),
  provider_name: z.string().describe('Name of the veterinary provider/clinic'),
  claim_description: z.string().describe('Brief description of the treatment or reason for claim'),
  invoice_file_path: z.string().optional().describe('Optional path to the invoice file to upload'),
  medical_records_path: z
    .string()
    .optional()
    .describe('Optional path to medical records file to upload'),
});

export const SubmitClaimSchema = z.object({
  confirmation_token: z
    .string()
    .describe(
      'The confirmation token from prepare_claim_to_submit. This confirms user has reviewed the claim details.'
    ),
});

export const GetClaimDetailsSchema = z.object({
  claim_id: z.string().describe('The ID of the claim to get details for'),
});
