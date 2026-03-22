import { z } from 'zod';

// =============================================================================
// Aetna Claims Data Types
// =============================================================================

/**
 * Represents a health insurance claim
 */
export interface Claim {
  claimId: string;
  memberName: string;
  claimType: string;
  dateOfService: string;
  claimAmount: string;
  status: string;
  providerName?: string;
  description?: string;
}

/**
 * Detailed claim information
 */
export interface ClaimDetails extends Claim {
  endDate?: string;
  amountBilled?: string;
  amountAllowed?: string;
  amountPaid?: string;
  patientResponsibility?: string;
  deductible?: string;
  copay?: string;
  coinsurance?: string;
  eobSummary?: string;
  localEobPath?: string;
  notes?: string;
  error?: string;
}

/**
 * Claim submission data that we prepare before submitting
 */
export interface ClaimSubmissionData {
  memberName: string;
  claimType: string;
  dateOfService: string;
  endDate?: string;
  amountPaid: string;
  reimburseProvider: boolean;
  invoiceFile?: string;
  isAccidentRelated: boolean;
  isEmploymentRelated: boolean;
  isOutsideUS: boolean;
  hasOtherCoverage: boolean;
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
 * Configuration for Aetna Claims client
 */
export interface AetnaClaimsConfig {
  username: string;
  password: string;
  emailImapHost: string;
  emailImapPort: number;
  emailImapUser: string;
  emailImapPassword: string;
  headless: boolean;
  timeout: number;
  downloadDir: string;
}

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const PrepareClaimSchema = z.object({
  member_name: z.string().describe('Name of the member the claim is for'),
  claim_type: z
    .enum(['Medical', 'Dental', 'Vision', 'Pharmacy'])
    .describe('Type of claim (Medical, Dental, Vision, or Pharmacy)'),
  date_of_service: z.string().describe('Start date of service (MM/DD/YYYY)'),
  end_date: z.string().optional().describe('Optional end date of service (MM/DD/YYYY)'),
  amount_paid: z.string().describe('Amount you paid (e.g., "$150.00" or "150.00")'),
  reimburse_provider: z
    .boolean()
    .default(false)
    .describe('If true, reimburse the provider directly instead of the member'),
  invoice_file_path: z
    .string()
    .optional()
    .describe('Path to the itemized bill file to upload (JPEG, PDF, PNG, or DOCX)'),
  is_accident_related: z.boolean().default(false).describe('Is this claim related to an accident?'),
  is_employment_related: z
    .boolean()
    .default(false)
    .describe('Is this claim related to employment?'),
  is_outside_us: z
    .boolean()
    .default(false)
    .describe('Is this claim for medical services received outside the U.S.?'),
  has_other_coverage: z
    .boolean()
    .default(false)
    .describe(
      "Are any family members' expenses covered by another group health plan, Medicare, or government plan?"
    ),
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
