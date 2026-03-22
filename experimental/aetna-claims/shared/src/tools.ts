import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory, IAetnaClaimsClient } from './server.js';
import { PrepareClaimSchema, SubmitClaimSchema, GetClaimDetailsSchema } from './types.js';

// =============================================================================
// TOOL DESCRIPTIONS
// =============================================================================

const PREPARE_CLAIM_DESCRIPTION = `Prepare a health insurance claim for submission on Aetna.

This tool fills out the claim submission form with all the provided details and validates
that everything is correct BEFORE actually submitting. It does NOT submit the claim.

After calling this tool, you will receive:
- A confirmation token (if validation passes)
- The exact details that will be submitted
- Any validation errors that need to be fixed

**IMPORTANT**: The user MUST explicitly confirm they want to submit before calling submit_claim.

Required parameters:
- member_name: Name of the member the claim is for
- claim_type: Type of claim (Medical, Dental, Vision, or Pharmacy)
- date_of_service: Start date of service (MM/DD/YYYY)
- amount_paid: Amount you paid

Optional parameters:
- end_date: End date of service (MM/DD/YYYY)
- reimburse_provider: If true, reimburse provider directly
- invoice_file_path: Path to itemized bill (JPEG, PDF, PNG, or DOCX, max 5MB)
- is_accident_related: Is this claim related to an accident?
- is_employment_related: Is this claim related to employment?
- is_outside_us: Is this for services outside the U.S.?
- has_other_coverage: Are expenses covered by another plan?`;

const SUBMIT_CLAIM_DESCRIPTION = `Submit a prepared claim on Aetna.

**CRITICAL**: This tool ACTUALLY SUBMITS the claim. It should only be called after:
1. prepare_claim_to_submit has been called successfully
2. The user has explicitly reviewed the claim details
3. The user has explicitly confirmed they want to submit

You must provide the confirmation_token from prepare_claim_to_submit.

Returns the confirmation number if successful.`;

const GET_CLAIMS_DESCRIPTION = `Get all insurance claims from Aetna.

Returns a list of claims with:
- Claim ID
- Member name
- Claim type
- Date of service
- Amount
- Current status
- Provider name (if available)`;

const GET_CLAIM_DETAILS_DESCRIPTION = `Get detailed information about a specific claim on Aetna.

Provide the claim_id to get comprehensive details including:
- Full claim information (member, type, date, amount, status)
- Provider details
- Financial breakdown (billed, allowed, paid, patient responsibility)
- Deductible, copay, and coinsurance amounts
- EOB summary (if available)`;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

/**
 * Async getter that returns a ready-to-use client (login completed)
 */
export type GetReadyClientFn = () => Promise<IAetnaClaimsClient>;

export function createRegisterTools(
  clientFactory: ClientFactory,
  getReadyClient?: GetReadyClientFn
) {
  let client: IAetnaClaimsClient | null = null;
  let isInitialized = false;

  const getClient = async (): Promise<IAetnaClaimsClient> => {
    if (getReadyClient) {
      return getReadyClient();
    }

    if (!client) {
      client = clientFactory();
    }
    if (!isInitialized) {
      await client.initialize();
      isInitialized = true;
    }
    return client;
  };

  const tools: Tool[] = [
    {
      name: 'prepare_claim_to_submit',
      description: PREPARE_CLAIM_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          member_name: {
            type: 'string',
            description: 'Name of the member the claim is for',
          },
          claim_type: {
            type: 'string',
            enum: ['Medical', 'Dental', 'Vision', 'Pharmacy'],
            description: 'Type of claim',
          },
          date_of_service: {
            type: 'string',
            description: 'Start date of service (MM/DD/YYYY)',
          },
          end_date: {
            type: 'string',
            description: 'Optional end date of service (MM/DD/YYYY)',
          },
          amount_paid: {
            type: 'string',
            description: 'Amount you paid (e.g., "$150.00" or "150.00")',
          },
          reimburse_provider: {
            type: 'boolean',
            description: 'If true, reimburse the provider directly',
          },
          invoice_file_path: {
            type: 'string',
            description: 'Path to the itemized bill file to upload (JPEG, PDF, PNG, or DOCX)',
          },
          is_accident_related: {
            type: 'boolean',
            description: 'Is this claim related to an accident?',
          },
          is_employment_related: {
            type: 'boolean',
            description: 'Is this claim related to employment?',
          },
          is_outside_us: {
            type: 'boolean',
            description: 'Is this for medical services received outside the U.S.?',
          },
          has_other_coverage: {
            type: 'boolean',
            description: 'Are expenses covered by another group health plan?',
          },
        },
        required: ['member_name', 'claim_type', 'date_of_service', 'amount_paid'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = PrepareClaimSchema.parse(args);
          const aetnaClient = await getClient();
          const result = await aetnaClient.prepareClaimToSubmit(
            validated.member_name,
            validated.claim_type,
            validated.date_of_service,
            validated.amount_paid,
            validated.reimburse_provider,
            validated.invoice_file_path,
            validated.end_date,
            validated.is_accident_related,
            validated.is_employment_related,
            validated.is_outside_us,
            validated.has_other_coverage
          );

          if (!result.isReadyToSubmit) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Cannot prepare claim - validation errors:\n\n${result.validationErrors.join('\n')}\n\nPlease fix these issues and try again.`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: result.confirmationMessage,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error preparing claim: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'submit_claim',
      description: SUBMIT_CLAIM_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          confirmation_token: {
            type: 'string',
            description:
              'The confirmation token from prepare_claim_to_submit. This confirms user has reviewed the claim details.',
          },
        },
        required: ['confirmation_token'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = SubmitClaimSchema.parse(args);
          const aetnaClient = await getClient();
          const result = await aetnaClient.submitClaim(validated.confirmation_token);

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to submit claim: ${result.message}`,
                },
              ],
              isError: true,
            };
          }

          const lines = ['Claim submitted successfully!'];
          if (result.claimId) {
            lines.push(`Claim ID: ${result.claimId}`);
          }
          if (result.confirmationNumber) {
            lines.push(`Confirmation Number: ${result.confirmationNumber}`);
          }
          lines.push(`\nMessage: ${result.message}`);

          return {
            content: [
              {
                type: 'text',
                text: lines.join('\n'),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error submitting claim: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_claims',
      description: GET_CLAIMS_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const aetnaClient = await getClient();
          const claims = await aetnaClient.getClaims();

          if (claims.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No claims found.',
                },
              ],
            };
          }

          const formattedClaims = claims
            .map(
              (claim, i) =>
                `${i + 1}. **Claim ${claim.claimId}**
   Member: ${claim.memberName || 'N/A'}
   Type: ${claim.claimType || 'N/A'}
   Date: ${claim.dateOfService || 'N/A'}
   Amount: ${claim.claimAmount || 'N/A'}
   Status: ${claim.status || 'N/A'}${claim.providerName ? `\n   Provider: ${claim.providerName}` : ''}${claim.description ? `\n   Description: ${claim.description}` : ''}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${claims.length} claim(s):\n\n${formattedClaims}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting claims: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_claim_details',
      description: GET_CLAIM_DETAILS_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          claim_id: {
            type: 'string',
            description: 'The ID of the claim to get details for',
          },
        },
        required: ['claim_id'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = GetClaimDetailsSchema.parse(args);
          const aetnaClient = await getClient();
          const details = await aetnaClient.getClaimDetails(validated.claim_id);

          if (details.error) {
            return {
              content: [
                {
                  type: 'text',
                  text: details.error,
                },
              ],
              isError: true,
            };
          }

          const lines = [
            `**Claim Details: ${details.claimId}**`,
            '',
            `Member: ${details.memberName || 'N/A'}`,
            `Type: ${details.claimType || 'N/A'}`,
            `Status: ${details.status || 'N/A'}`,
            `Date of Service: ${details.dateOfService || 'N/A'}`,
            `Amount: ${details.claimAmount || 'N/A'}`,
          ];

          if (details.providerName) {
            lines.push(`Provider: ${details.providerName}`);
          }

          // Financial details
          const hasFinancial =
            details.amountBilled ||
            details.amountAllowed ||
            details.amountPaid ||
            details.patientResponsibility ||
            details.deductible ||
            details.copay ||
            details.coinsurance;

          if (hasFinancial) {
            lines.push('', '**Financial Breakdown:**');
            if (details.amountBilled) {
              lines.push(`  Amount Billed: ${details.amountBilled}`);
            }
            if (details.amountAllowed) {
              lines.push(`  Amount Allowed: ${details.amountAllowed}`);
            }
            if (details.amountPaid) {
              lines.push(`  Amount Paid: ${details.amountPaid}`);
            }
            if (details.patientResponsibility) {
              lines.push(`  Patient Responsibility: ${details.patientResponsibility}`);
            }
            if (details.deductible) {
              lines.push(`  Deductible: ${details.deductible}`);
            }
            if (details.copay) {
              lines.push(`  Copay: ${details.copay}`);
            }
            if (details.coinsurance) {
              lines.push(`  Coinsurance: ${details.coinsurance}`);
            }
          }

          // EOB information
          if (details.eobSummary || details.localEobPath) {
            lines.push('', '**Explanation of Benefits (EOB):**');
            if (details.localEobPath) {
              lines.push(`  Downloaded to: ${details.localEobPath}`);
            }
            if (details.eobSummary) {
              lines.push(`  ${details.eobSummary}`);
            }
          }

          if (details.notes) {
            lines.push('', `Notes: ${details.notes}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: lines.join('\n'),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting claim details: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
  ];

  return (server: Server) => {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
    });
  };
}
