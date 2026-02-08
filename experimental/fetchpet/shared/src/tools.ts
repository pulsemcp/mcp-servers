import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory, IFetchPetClient } from './server.js';
import { PrepareClaimSchema, SubmitClaimSchema, GetClaimDetailsSchema } from './types.js';

// =============================================================================
// TOOL DESCRIPTIONS
// =============================================================================

const PREPARE_CLAIM_DESCRIPTION = `Prepare a pet insurance claim for submission on Fetch Pet.

This tool fills out the claim submission form with all the provided details and validates
that everything is correct BEFORE actually submitting. It does NOT submit the claim.

After calling this tool, you will receive:
- A confirmation token (if validation passes)
- The exact details that will be submitted
- Any validation errors that need to be fixed

**IMPORTANT**: The user MUST explicitly confirm they want to submit before calling submit_claim.

Required parameters:
- pet_name: Name of the pet for this claim
- invoice_date: Date of the veterinary invoice
- invoice_amount: Total amount of the invoice
- provider_name: Name of the vet clinic/provider
- claim_description: Brief description of the treatment

Optional parameters:
- invoice_file_path: Path to invoice PDF to upload
- medical_records_path: Path to medical records to upload`;

const SUBMIT_CLAIM_DESCRIPTION = `Submit a prepared claim on Fetch Pet.

**CRITICAL**: This tool ACTUALLY SUBMITS the claim. It should only be called after:
1. prepare_claim_to_submit has been called successfully
2. The user has explicitly reviewed the claim details
3. The user has explicitly confirmed they want to submit

You must provide the confirmation_token from prepare_claim_to_submit.

Returns the claim ID/confirmation number if successful.`;

const GET_ACTIVE_CLAIMS_DESCRIPTION = `Get all active/pending insurance claims from Fetch Pet.

Returns a list of claims that are currently:
- Pending review
- Processing
- Awaiting additional information
- Recently submitted

Each claim includes:
- Claim ID
- Pet name
- Claim date
- Amount
- Current status
- Provider name (if available)`;

const GET_HISTORICAL_CLAIMS_DESCRIPTION = `Get all historical/completed insurance claims from Fetch Pet.

Returns a list of claims that have been:
- Approved and paid
- Denied
- Closed/processed

Each claim includes:
- Claim ID
- Pet name
- Claim date
- Amount
- Final status
- Provider name (if available)`;

const GET_CLAIM_DETAILS_DESCRIPTION = `Get detailed information about a specific claim on Fetch Pet.

Provide the claim_id to get comprehensive details including:
- Full claim information (pet, date, amount, status)
- Provider details
- Reimbursement breakdown (if available)
- EOB (Explanation of Benefits) - downloaded locally if available
- Invoice document - downloaded locally if available

The tool will attempt to download any available documents (EOB, Invoice)
to local files and provide the file paths.`;

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
export type GetReadyClientFn = () => Promise<IFetchPetClient>;

export function createRegisterTools(
  clientFactory: ClientFactory,
  getReadyClient?: GetReadyClientFn
) {
  // Create a single client instance that persists across calls
  let client: IFetchPetClient | null = null;
  let isInitialized = false;

  // If getReadyClient is provided (background login mode), use it
  // Otherwise fall back to lazy initialization (legacy behavior)
  const getClient = async (): Promise<IFetchPetClient> => {
    if (getReadyClient) {
      // Use the provided getter that handles background login
      return getReadyClient();
    }

    // Legacy behavior: lazy initialization
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
          pet_name: {
            type: 'string',
            description: 'Name of the pet for this claim',
          },
          invoice_date: {
            type: 'string',
            description: 'Date of the invoice (YYYY-MM-DD or MM/DD/YYYY)',
          },
          invoice_amount: {
            type: 'string',
            description: 'Total amount of the invoice (e.g., "$150.00" or "150.00")',
          },
          provider_name: {
            type: 'string',
            description: 'Name of the veterinary provider/clinic',
          },
          claim_description: {
            type: 'string',
            description: 'Brief description of the treatment or reason for claim',
          },
          invoice_file_path: {
            type: 'string',
            description: 'Optional path to the invoice file to upload',
          },
          medical_records_path: {
            type: 'string',
            description: 'Optional path to medical records file to upload',
          },
        },
        required: [
          'pet_name',
          'invoice_date',
          'invoice_amount',
          'provider_name',
          'claim_description',
        ],
      },
      handler: async (args: unknown) => {
        try {
          const validated = PrepareClaimSchema.parse(args);
          const fetchPetClient = await getClient();
          const result = await fetchPetClient.prepareClaimToSubmit(
            validated.pet_name,
            validated.invoice_date,
            validated.invoice_amount,
            validated.provider_name,
            validated.claim_description,
            validated.invoice_file_path,
            validated.medical_records_path
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
          const fetchPetClient = await getClient();
          const result = await fetchPetClient.submitClaim(validated.confirmation_token);

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
      name: 'get_active_claims',
      description: GET_ACTIVE_CLAIMS_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const fetchPetClient = await getClient();
          const claims = await fetchPetClient.getActiveClaims();

          if (claims.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No active claims found. All your claims may be completed or you may not have submitted any claims yet.',
                },
              ],
            };
          }

          const formattedClaims = claims
            .map(
              (claim, i) =>
                `${i + 1}. **Claim ${claim.claimId}**
   Pet: ${claim.petName}
   Date: ${claim.claimDate || 'N/A'}
   Amount: ${claim.claimAmount || 'N/A'}
   Status: ${claim.status}${claim.providerName ? `\n   Provider: ${claim.providerName}` : ''}${claim.description ? `\n   Description: ${claim.description}` : ''}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${claims.length} active claim(s):\n\n${formattedClaims}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting active claims: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_historical_claims',
      description: GET_HISTORICAL_CLAIMS_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const fetchPetClient = await getClient();
          const claims = await fetchPetClient.getHistoricalClaims();

          if (claims.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No historical claims found. You may not have any completed claims yet.',
                },
              ],
            };
          }

          const formattedClaims = claims
            .map(
              (claim, i) =>
                `${i + 1}. **Claim ${claim.claimId}**
   Pet: ${claim.petName}
   Date: ${claim.claimDate || 'N/A'}
   Amount: ${claim.claimAmount || 'N/A'}
   Status: ${claim.status}${claim.providerName ? `\n   Provider: ${claim.providerName}` : ''}${claim.description ? `\n   Description: ${claim.description}` : ''}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${claims.length} historical claim(s):\n\n${formattedClaims}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting historical claims: ${error instanceof Error ? error.message : String(error)}`,
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
          const fetchPetClient = await getClient();
          const details = await fetchPetClient.getClaimDetails(validated.claim_id);

          const lines = [
            `**Claim Details: ${details.claimId}**`,
            '',
            `Pet: ${details.petName}`,
            `Status: ${details.status}`,
            `Claim Date: ${details.claimDate || 'N/A'}`,
            `Claim Amount: ${details.claimAmount || 'N/A'}`,
          ];

          if (details.providerName) {
            lines.push(`Provider: ${details.providerName}`);
          }
          if (details.description) {
            lines.push(`Description: ${details.description}`);
          }

          // Financial details
          if (details.reimbursementAmount || details.deductible || details.copay) {
            lines.push('', '**Financial Breakdown:**');
            if (details.reimbursementAmount) {
              lines.push(`  Reimbursement: ${details.reimbursementAmount}`);
            }
            if (details.deductible) {
              lines.push(`  Deductible: ${details.deductible}`);
            }
            if (details.copay) {
              lines.push(`  Copay: ${details.copay}`);
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

          // Invoice information
          if (details.invoiceSummary || details.localInvoicePath) {
            lines.push('', '**Invoice:**');
            if (details.localInvoicePath) {
              lines.push(`  Downloaded to: ${details.localInvoicePath}`);
            }
            if (details.invoiceSummary) {
              lines.push(`  ${details.invoiceSummary}`);
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
