import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory, IAetnaClaimsClient } from './server.js';
import { SubmitClaimSchema, GetClaimDetailsSchema } from './types.js';
import {
  requestConfirmation,
  createConfirmationSchema,
  readElicitationConfig,
} from '@pulsemcp/mcp-elicitation';

// =============================================================================
// TOOL DESCRIPTIONS
// =============================================================================

const SUBMIT_CLAIM_DESCRIPTION = `Submit a health insurance claim on Aetna.

This tool fills out the claim submission form, requests user confirmation via elicitation,
and then submits the claim if confirmed.

**WARNING**: This action submits a real insurance claim and cannot be undone.

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

type ToolFactory = (server: Server, getClient: () => Promise<IAetnaClaimsClient>) => Tool;

/**
 * Async getter that returns a ready-to-use client (login completed)
 */
export type GetReadyClientFn = () => Promise<IAetnaClaimsClient>;

// =============================================================================
// TOOL FACTORIES
// =============================================================================

const submitClaimTool: ToolFactory = (server, getClient) => ({
  name: 'submit_claim',
  description: SUBMIT_CLAIM_DESCRIPTION,
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
      const validated = SubmitClaimSchema.parse(args);
      const aetnaClient = await getClient();

      // Step 1: Fill out the form and validate
      const prepared = await aetnaClient.prepareClaimToSubmit(
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

      if (!prepared.isReadyToSubmit) {
        return {
          content: [
            {
              type: 'text',
              text: `Cannot submit claim - validation errors:\n\n${prepared.validationErrors.join('\n')}\n\nPlease fix these issues and try again.`,
            },
          ],
          isError: true,
        };
      }

      // Step 2: Request user confirmation via elicitation
      const elicitationConfig = readElicitationConfig();
      if (elicitationConfig.enabled) {
        const confirmMessage =
          `About to submit a health insurance claim on Aetna:\n` +
          `  Member: ${validated.member_name}\n` +
          `  Type: ${validated.claim_type}\n` +
          `  Date of Service: ${validated.date_of_service}${validated.end_date ? ` to ${validated.end_date}` : ''}\n` +
          `  Amount Paid: ${validated.amount_paid}\n` +
          `  Reimburse Provider: ${validated.reimburse_provider ? 'Yes' : 'No'}\n` +
          (validated.invoice_file_path ? `  Invoice: ${validated.invoice_file_path}\n` : '') +
          `\nThis action cannot be undone.`;

        const confirmation = await requestConfirmation(
          {
            server,
            message: confirmMessage,
            requestedSchema: createConfirmationSchema(
              'Submit this claim?',
              'Confirm that you want to submit this health insurance claim on Aetna.'
            ),
            meta: {
              'com.pulsemcp/tool-name': 'submit_claim',
            },
          },
          elicitationConfig
        );

        // Fail-safe: only proceed on explicit 'accept'
        if (confirmation.action !== 'accept') {
          if (confirmation.action === 'expired') {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Claim submission confirmation expired. Please try again.',
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: 'Claim submission was cancelled by the user.',
              },
            ],
          };
        }

        // Defense-in-depth: check checkbox even if action='accept'
        if (
          confirmation.content &&
          'confirm' in confirmation.content &&
          confirmation.content.confirm === false
        ) {
          return {
            content: [
              {
                type: 'text',
                text: 'Claim submission was not confirmed. The claim was not submitted.',
              },
            ],
          };
        }
      }

      // Step 3: Actually submit the claim
      const result = await aetnaClient.submitClaim();

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
});

const getClaimsTool: ToolFactory = (_server, getClient) => ({
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
});

const getClaimDetailsTool: ToolFactory = (_server, getClient) => ({
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
        if (details.amountBilled) lines.push(`  Amount Billed: ${details.amountBilled}`);
        if (details.amountAllowed) lines.push(`  Amount Allowed: ${details.amountAllowed}`);
        if (details.amountPaid) lines.push(`  Amount Paid: ${details.amountPaid}`);
        if (details.patientResponsibility)
          lines.push(`  Patient Responsibility: ${details.patientResponsibility}`);
        if (details.deductible) lines.push(`  Deductible: ${details.deductible}`);
        if (details.copay) lines.push(`  Copay: ${details.copay}`);
        if (details.coinsurance) lines.push(`  Coinsurance: ${details.coinsurance}`);
      }

      if (details.eobSummary || details.localEobPath) {
        lines.push('', '**Explanation of Benefits (EOB):**');
        if (details.localEobPath) lines.push(`  Downloaded to: ${details.localEobPath}`);
        if (details.eobSummary) lines.push(`  ${details.eobSummary}`);
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
});

// =============================================================================
// TOOL REGISTRATION
// =============================================================================

const ALL_TOOL_FACTORIES: ToolFactory[] = [submitClaimTool, getClaimsTool, getClaimDetailsTool];

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

  return (server: Server) => {
    // Create tool instances with the server and client getter
    const tools = ALL_TOOL_FACTORIES.map((factory) => factory(server, getClient));

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
