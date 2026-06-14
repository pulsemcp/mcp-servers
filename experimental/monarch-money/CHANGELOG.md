# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.9] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.0.8] - 2026-06-01

### Added

- **Transaction rule management.** Three new `manage`-group tools — `create_transaction_rule`, `update_transaction_rule`, and `delete_transaction_rule` — let agents create, edit, and remove Monarch auto-classification rules. Previously the server could only read rules (`get_transaction_rules`). The mutating tools are gated to the write-capable `manage` group and never appear in `readonly` configurations. Each rule takes one or more criteria (merchant / amount / category / account) plus one or more actions (set category, hide from reports, add tags). Reverse-engineered against the live Monarch GraphQL `createTransactionRuleV2` / `updateTransactionRuleV2` / `deleteTransactionRule` resolvers and verified end-to-end against the live API via a self-cleaning create → read-back → update → delete e2e test.

### Changed

- **`get_transaction_rules` now returns each rule's actions.** The read query selects `setCategoryAction { id name }` and `addTagsAction { id name }` in addition to the existing criteria, so a rule's full state round-trips with the write tools.

### Notes

- **`update_transaction_rule` is a full replace, not a patch.** Monarch's update resolver treats the input as the rule's complete new state: any criterion or action you omit is cleared. The tool requires at least one criterion and one action on every call, and its description instructs callers to read the rule first and then send back the complete desired state. This mirrors the live API, which silently rejects an update that would leave a rule with no criteria or no actions.

## [0.0.7] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.0.6] - 2026-05-03

### Fixed

- **Mutations rewritten against the live Monarch GraphQL schema.** The `0.0.5` cut shipped six write operations whose argument shapes had drifted from what the server now accepts (`createTransaction`, `updateTransaction`, `deleteTransaction`, `setTransactionTags`, `splitTransaction`, `setBudgetAmount`). Each is now sent as a single typed `$input` variable matching the server's published input types, and `getBudgets` was rewritten to use `budgetData(startMonth, endMonth)` (the legacy `budgets` field is gone). Verified against the live API via a new lifecycle e2e test that creates → updates → tags → reviews → splits → deletes a transaction in one run.

### Changed (breaking)

- **`update_transaction.merchantId` → `merchantName`.** Monarch's `updateTransaction` mutation does not accept a merchant ID — it accepts a free-form string and auto-creates a merchant if needed. The parameter has been renamed and re-described to reflect this; bulk mode rejects it.
- **`create_transaction.categoryId` is now required.** Monarch's `createTransaction` mutation rejects requests without a category, so the parameter has been promoted from optional to required at the schema level.
- **`split_transaction` returns `[{ id, amount }]`** instead of full `Transaction` records. The live `updateTransactionSplit` mutation only echoes split IDs and amounts; the previous shape was synthetic.
- **`set_budget_amount` returns `{ budgetItemId, categoryId, amount, startDate, applyToFuture }`.** The mutation does not return a full `Budget` record, so the response shape now matches what the API actually echoes.

### Removed

- **`create_tag` tool dropped.** Monarch's `createTag` mutation requires fields (`order`, `name`, `color`) and a UI-side workflow that don't fit cleanly into an MCP tool, and tag creation is rare. Users should create tags in the Monarch UI; the MCP server can read and assign them via `get_tags` + `update_transaction`.
- **`manage_transaction_rule` tool dropped (read-only `get_transaction_rules` retained).** Rule writes are now disallowed at the tool layer after a probing session against the live API silently destroyed all 43 of the user's transaction rules. The `IMonarchClient` methods `createTransactionRule`, `updateTransactionRule`, and `deleteTransactionRule` have been removed entirely. Rules can still be created and edited in the Monarch UI.

### Tools (33 → 17, all validated against the live API)

After this release the surface is:

- **Auth**: `check_authentication`, `monarch_login_with_token`
- **Accounts**: `get_accounts`, `get_account_balance_history`, `refresh_accounts`
- **Net worth**: `get_net_worth`
- **Transactions**: `get_transactions`, `get_transaction_details`, `create_transaction`, `update_transaction`, `delete_transaction`, `split_transaction`
- **Categories/tags**: `get_categories`, `get_tags`
- **Rules (read-only)**: `get_transaction_rules`
- **Budgets**: `get_budgets`, `set_budget_amount`

## [0.0.5] - 2026-05-03

### Tool design refactor (breaking)

Heavy consolidation of the tool surface, removal of all elicitation flows, and introduction of tool groups. **All renamed/removed tool names below are breaking changes.**

#### Tool groups

Added `MONARCH_ENABLED_TOOL_GROUPS`, `MONARCH_ENABLED_TOOLS`, and `MONARCH_DISABLED_TOOLS` env vars for runtime tool-surface filtering. Two groups:

- `readonly` — lookups only.
- `manage` — everything in `readonly` plus mutations and `refresh_accounts`.

Filter precedence: `MONARCH_ENABLED_TOOLS` > `MONARCH_ENABLED_TOOL_GROUPS` > `MONARCH_DISABLED_TOOLS`.

#### Consolidated tool surface (33 → 19)

- **Auth**: `setup_authentication` + `check_auth_status` → single `check_authentication` (returns setup instructions when not authenticated, user info when authenticated).
- **Accounts**: `get_account_holdings` folded into `get_accounts` via `includeHoldings: boolean`.
- **Net worth**: `get_net_worth_by_account_type` folded into `get_net_worth` via `view: "history" | "by_type"`.
- **Transactions (read)**: `get_transactions_summary`, `get_spending_by_category`, `get_recurring_transactions`, and `get_cashflow` all folded into `get_transactions` via `view: "list" | "summary" | "cashflow" | "by_category" | "recurring"`.
- **Transactions (write)**: `set_transaction_category`, `set_transaction_tags`, `update_transaction_notes`, and `mark_transaction_reviewed` folded into `update_transaction`. Bulk recategorization now happens via `bulkTransactionIds` + `categoryId` on the same tool.
- **Categories**: `get_category_groups` folded into `get_categories` via `includeGroups: boolean`.
- **Rules**: `create_transaction_rule`, `update_transaction_rule`, and `delete_transaction_rule` folded into `manage_transaction_rule` with `action: "create" | "update" | "delete"`.

#### Elicitation removed

All confirmation prompts have been removed from mutate tools. Write protection is now enforced via tool group filtering — set `MONARCH_ENABLED_TOOL_GROUPS=readonly` for a strict read-only deployment. The `@pulsemcp/mcp-elicitation` dependency, the `ELICITATION_*` env vars, and the `shared/src/elicitation.ts` module have been removed.

#### Tool descriptions

Every tool description has been rewritten with: a one-line purpose statement, a representative example response in JSON, an explanation of any enum-valued parameter, and a use-cases section. Optional flags advertise their default values.

## [0.0.1] - 2026-05-03

Initial release of the Monarch Money MCP server.

### Server

- Custom thin GraphQL transport targeting `api.monarch.com/graphql` (no third-party Monarch client dependency).
- REST `/auth/login/` flow for obtaining a session token, with explicit handling for email-OTP, TOTP, and rejected-credential cases.
- Persistent `device-uuid` header sent on every request and persisted alongside the session token, so a once-paired install stays trusted across runs and skips Monarch's email-OTP gate on subsequent password logins.
- Encrypted on-disk session at `~/.monarch-money-mcp/session.enc` (AES-256-GCM with `scrypt` key derivation; passphrase derived from `${HOSTNAME}:${USER}` by default, overridable via `MONARCH_SESSION_PASSPHRASE`).
- Headless env-var auth: `MONARCH_SESSION_TOKEN` (paste-a-token) or `MONARCH_EMAIL` + `MONARCH_PASSWORD` (server-side login at startup, with `MONARCH_TOTP` / `MONARCH_EMAIL_OTP` for the 2FA paths).
- Interactive `npm run login` CLI fallback that exchanges email/password for a session token outside the MCP protocol — passwords never traverse tool inputs.

### Tools (33 total, all validated against the live Monarch GraphQL API)

- **Auth/session**: `setup_authentication`, `check_auth_status`, `monarch_login_with_token`
- **Accounts**: `get_accounts`, `get_account_balance_history`, `get_account_holdings`, `refresh_accounts`
- **Net worth & cashflow**: `get_net_worth`, `get_net_worth_by_account_type`, `get_cashflow`
- **Transactions (read)**: `get_transactions`, `get_transaction_details`, `get_transactions_summary`, `get_spending_by_category`, `get_recurring_transactions`
- **Transactions (mutate, all elicit-confirmed)**: `create_transaction`, `update_transaction`, `delete_transaction`, `set_transaction_category`, `set_transaction_tags`, `update_transaction_notes`, `split_transaction`, `mark_transaction_reviewed` (no elicit — low-risk toggle)
- **Categories/tags**: `get_categories`, `get_category_groups`, `get_tags`, `create_tag`
- **Rules**: `get_transaction_rules`, `create_transaction_rule`, `update_transaction_rule`, `delete_transaction_rule`
- **Budgets**: `get_budgets`, `set_budget_amount`

### Notable GraphQL shapes

Monarch's GraphQL gateway is allowlisted and disables introspection, so each operation in `shared/src/monarch-client/operations.ts` was reverse-engineered against the live schema. A few non-obvious shapes the live API requires:

- **`Q_NET_WORTH`** uses `aggregateSnapshots(filters)` with field aliases (`netWorth: balance`, `assets: assetsBalance`, `liabilities: liabilitiesBalance`).
- **`Q_TRANSACTIONS`** passes the whole filter as a single `TransactionFilterInput` value (operation-level `[UUID!]` array variables get rejected) and puts pagination on the inner `results(limit, offset)` selection.
- **`Q_CASHFLOW` / `Q_TRANSACTIONS_SUMMARY` / `Q_SPENDING_BY_CATEGORY`** all go through a single `aggregates(filters [, groupBy])` field; client-side mapping reshapes the response into the legacy `CashflowSummary` / `SpendingByCategory` / transactions-summary surfaces.
- **`Q_RECURRING_TRANSACTIONS`** uses `recurringTransactionItems(startDate, endDate)` and surfaces stream-level fields (`name`, `frequency`, `isActive`) plus the per-occurrence `date` and `amount`.
- **`get_net_worth_by_account_type`** is synthesized client-side from `getAccounts()` (Monarch removed the dedicated `netWorthByAccountType` field).
- **`amountGte`/`amountLte`** filter args are mapped to Monarch's `absAmountGte`/`absAmountLte` fields.

### Safety

- Elicitation-based confirmation for every mutate operation via `@pulsemcp/mcp-elicitation`; configurable via `ELICITATION_ENABLED`, `ELICITATION_REQUEST_URL`, `ELICITATION_POLL_URL`.
- Authentication is exclusively via env vars or the CLI script — never through tool inputs (which would put credentials in transcripts, prompt logs, and elicitation responses).

### Tests + CI

- Three-tier test suite: functional (mocked client), integration (full MCP protocol with mocked Monarch), e2e (live Monarch GraphQL API, gated on `MONARCH_SESSION_TOKEN`).
- New `.github/workflows/mcp-servers-monarch-money.yml` — first server in this repo to use the `MCP_SERVERS_MASTER_KEY` static-credential pattern in CI. Three jobs: lint+typecheck, functional tests, and live-API e2e (decrypts `tests/e2e/.env.enc`, seeds the session, runs a 10-tool read-only suite). Skips e2e gracefully if `MCP_SERVERS_MASTER_KEY` is unavailable.
