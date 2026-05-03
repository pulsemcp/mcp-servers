/**
 * GraphQL operations used by the Monarch Money client.
 *
 * Operations are kept as plain strings so the build does not depend on a
 * GraphQL codegen pipeline. Field selections favor the slice of data the
 * MCP tools surface to the user — extra fields can be added here without
 * touching the transport layer.
 *
 * Schema notes (Monarch's GraphQL is undocumented & introspection-disabled,
 * so all shapes here were reverse-engineered against the live API):
 * - Mutations take a single typed `$input: SomeMutationInput!` variable.
 *   Inline `input: { ... }` literals constructed from top-level operation
 *   variables get rejected with a generic "Something went wrong" error.
 * - Field naming inside the input objects is inconsistent across mutations
 *   (e.g. `createTransaction.input.categoryId` but
 *   `updateTransaction.input.category`). Each mutation below documents its
 *   verified shape.
 */

export const Q_ACCOUNTS = `
query GetAccounts {
  accounts {
    id
    displayName
    syncDisabled
    isHidden
    isAsset
    type { name display }
    subtype { name display }
    currentBalance
    displayBalance
    includeInNetWorth
    institution { id name }
    updatedAt
    createdAt
  }
}`;

export const Q_ACCOUNT_BALANCE_HISTORY = `
query GetAccountBalanceHistory($accountId: UUID!, $startDate: Date!, $endDate: Date!) {
  accountBalanceHistory(accountId: $accountId, startDate: $startDate, endDate: $endDate) {
    date
    balance
  }
}`;

export const Q_ACCOUNT_HOLDINGS = `
query GetAccountHoldings($accountId: UUID!) {
  account(id: $accountId) {
    id
    displayName
    holdings {
      id
      ticker
      name
      quantity
      costBasis
      value
      type
      closingPrice
    }
  }
}`;

export const M_REFRESH_ACCOUNTS = `
mutation RefreshAccounts($accountIds: [UUID!]) {
  forceRefreshAccounts(accountIds: $accountIds) {
    success
    errors { message }
  }
}`;

// Monarch's GraphQL exposes net-worth history as `aggregateSnapshots` — the
// `netWorthHistory` field that older clients used has been removed. We alias
// the returned fields so callers continue to see the `netWorth/assets/
// liabilities` shape declared in `types.ts`.
export const Q_NET_WORTH = `
query GetNetWorth($startDate: Date, $endDate: Date) {
  aggregateSnapshots(filters: { startDate: $startDate, endDate: $endDate }) {
    date
    netWorth: balance
    assets: assetsBalance
    liabilities: liabilitiesBalance
  }
}`;

// Monarch's GraphQL gateway exposes cashflow/summary/spending all through a
// single `aggregates(filters [, groupBy])` field. The response is an array,
// where each element groups by whatever key (or no key) was requested. For
// the unkeyed cashflow case there's exactly one element whose `summary`
// carries the income/expense/savings totals.
export const Q_CASHFLOW = `
query GetCashflow($startDate: Date!, $endDate: Date!) {
  aggregates(filters: { startDate: $startDate, endDate: $endDate }) {
    summary {
      sumIncome
      sumExpense
      savings
      savingsRate
    }
  }
}`;

const TRANSACTION_FIELDS = `
  id
  amount
  pending
  date
  notes
  hideFromReports
  needsReview
  reviewedAt
  isSplitTransaction
  account { id displayName }
  category { id name }
  merchant { id name }
  tags { id name color order }
`;

// Two pieces of Monarch-specific shape baked in here:
//   1. Pagination (`limit`/`offset`) belongs on the `results` subfield, not
//      on `allTransactions` itself — Monarch rejects pagination args at the
//      outer level. `totalCount` reflects the full filter match count and is
//      independent of pagination, which is what callers use to decide
//      whether to page further.
//   2. The whole filter is passed as a single `TransactionFilterInput`
//      variable rather than as individual top-level variables. Monarch
//      rejects `[UUID!]`/`[ID!]` array variables (e.g. `$accountIds`) when
//      declared at the operation level, but accepts the same arrays when
//      embedded inside the typed input.
export const Q_TRANSACTIONS = `
query GetTransactions($filters: TransactionFilterInput, $limit: Int, $offset: Int) {
  allTransactions(filters: $filters) {
    totalCount
    results(limit: $limit, offset: $offset) {
${TRANSACTION_FIELDS}
    }
  }
}`;

// `transaction(id)` no longer exposes a `splits` (or `splitTransactions`)
// subfield — querying either yields a generic gateway error. Split children
// are reachable as standalone `Transaction` rows via `allTransactions(filters:
// { isSplit: true })` instead, but Monarch doesn't surface a parent linkage
// here, so the lookup tool returns the parent metadata only and tells callers
// to use `update_transaction_splits` (write path) when they need to inspect
// or modify splits.
export const Q_TRANSACTION_DETAILS = `
query GetTransactionDetails($transactionId: UUID!) {
  transaction(id: $transactionId) {
${TRANSACTION_FIELDS}
  }
}`;

// `transactionsSummary` was removed; aggregates over the same window provides
// the same totals (`count`, `sumIncome`, `sumExpense`, `avg`). The legacy
// `averageTransaction` shape is reconstructed client-side from `avg`.
export const Q_TRANSACTIONS_SUMMARY = `
query GetTransactionsSummary($startDate: Date!, $endDate: Date!) {
  aggregates(filters: { startDate: $startDate, endDate: $endDate }) {
    summary {
      count
      sumIncome
      sumExpense
      avg
    }
  }
}`;

// `spendingByCategory` was removed; the equivalent is `aggregates` with a
// `groupBy: ["category"]` argument. Each result element pairs a `groupBy`
// projection (the category) with a `summary` of totals for that group.
export const Q_SPENDING_BY_CATEGORY = `
query GetSpendingByCategory($startDate: Date!, $endDate: Date!) {
  aggregates(filters: { startDate: $startDate, endDate: $endDate }, groupBy: ["category"]) {
    groupBy {
      category { id name }
    }
    summary {
      sumExpense
      sumIncome
      sum
    }
  }
}`;

// `recurringTransactions` was replaced by `recurringTransactionItems`, which
// returns flat per-occurrence rows over a date window. The `stream` object
// only exposes id/name/frequency/isActive — Monarch does not surface the
// stream's category/merchant/account here, so we don't request them.
export const Q_RECURRING_TRANSACTIONS = `
query GetRecurringTransactions($startDate: Date!, $endDate: Date!) {
  recurringTransactionItems(startDate: $startDate, endDate: $endDate) {
    stream {
      id
      name
      frequency
      isActive
    }
    date
    amount
  }
}`;

// All mutations below take a single typed `$input` variable. Inline literals
// referencing top-level operation variables are rejected.
//
// `createTransaction.input` requires: accountId, amount, date, merchantName,
// categoryId. (Monarch refuses creates with a missing categoryId.)
export const M_CREATE_TRANSACTION = `
mutation CreateTransaction($input: CreateTransactionMutationInput!) {
  createTransaction(input: $input) {
    transaction {
${TRANSACTION_FIELDS}
    }
    errors { message }
  }
}`;

// `updateTransaction.input` accepts: id, amount, date, notes, hideFromReports,
// category (UUID — the field is `category`, NOT `categoryId`!), name (renames
// the merchant via free-form string), needsReview. Reassigning a transaction
// to a different existing merchant by id (`merchant` / `merchantId`) is not
// supported — only `name` works, and Monarch may auto-create a merchant for
// the supplied string.
export const M_UPDATE_TRANSACTION = `
mutation UpdateTransaction($input: UpdateTransactionMutationInput!) {
  updateTransaction(input: $input) {
    transaction {
${TRANSACTION_FIELDS}
    }
    errors { message }
  }
}`;

// `deleteTransaction.input.transactionId` (NOT `id`).
export const M_DELETE_TRANSACTION = `
mutation DeleteTransaction($input: DeleteTransactionMutationInput!) {
  deleteTransaction(input: $input) {
    deleted
    errors { message }
  }
}`;

// `setTransactionTags.input` requires `transactionId` + `tagIds`.
export const M_SET_TAGS = `
mutation SetTransactionTags($input: SetTransactionTagsInput!) {
  setTransactionTags(input: $input) {
    transaction {
${TRANSACTION_FIELDS}
    }
    errors { message }
  }
}`;

// Splits are managed via `updateTransactionSplit`, which fully replaces the
// split set for a transaction. `splitTransactions` on the response is the
// list of newly-created child transactions. The legacy `splitTransaction`
// mutation is gone; so is the `splits` subfield on `Transaction`, so we can
// only see the split children via this mutation's response.
export const M_UPDATE_TRANSACTION_SPLIT = `
mutation UpdateTransactionSplit($input: UpdateTransactionSplitMutationInput!) {
  updateTransactionSplit(input: $input) {
    transaction {
      id
      isSplitTransaction
      splitTransactions { id amount }
    }
    errors { message }
  }
}`;

export const Q_CATEGORIES = `
query GetCategories {
  categories {
    id
    name
    icon
    isSystemCategory
    group { id name type }
  }
}`;

export const Q_CATEGORY_GROUPS = `
query GetCategoryGroups {
  categoryGroups {
    id
    name
    type
  }
}`;

// Tags are exposed via `householdTransactionTags`. The legacy `tags` query
// was removed.
export const Q_TAGS = `
query GetTags {
  householdTransactionTags {
    id
    name
    color
    order
  }
}`;

// Read-only listing of transaction rules. Field selection is restricted to
// the slice that survives in the current schema:
// - `merchantCriteria` is now an array of {operator, value} matchers, not a
//   plain string.
// - `amountCriteria` is a single {operator, value, isExpense} object.
// - `setHideFromReportsAction` replaces the older `setHideFromReports`.
// - `setMerchantId`/`setCategoryId`/`setNeedsReview`/`setTagIds`/
//   `categoryCriteria` were removed entirely.
//
// We intentionally do NOT expose mutations to create/update/delete rules in
// this server: probing those endpoints during refactor work resulted in data
// loss, and Monarch's rule-write surface is undocumented enough that we'd
// rather leave it for users to manage in the Monarch UI.
export const Q_TRANSACTION_RULES = `
query GetTransactionRules {
  transactionRules {
    id
    order
    merchantCriteriaUseOriginalStatement
    merchantCriteria { operator value }
    amountCriteria { operator value isExpense }
    categoryIds
    accountIds
    setHideFromReportsAction
    lastAppliedAt
  }
}`;

// `budgets(startDate, endDate)` and the related `budgetItem(id)` queries are
// gone. The current shape is `budgetData(startMonth, endMonth)`, which
// returns per-category monthly entries with a `plannedAmount` per month.
//
// The MCP tool layer collapses this into the legacy flat `Budget[]` shape
// (one row per category, picked from the requested window's first month).
export const Q_BUDGET_DATA = `
query GetBudgetData($startMonth: Date!, $endMonth: Date!) {
  budgetData(startMonth: $startMonth, endMonth: $endMonth) {
    monthlyAmountsByCategory {
      category { id name }
      monthlyAmounts {
        month
        plannedAmount
      }
    }
  }
}`;

// `setBudgetAmount` was replaced by `updateOrCreateBudgetItem`. The mutation
// takes `categoryId`, `amount`, `startDate` (month boundary), `applyToFuture`,
// and `timeframe` ("month"). Its return is intentionally minimal — just
// `budgetItem { id }` — so the client wrapper echoes the request back so
// callers can confirm what was applied.
export const M_UPDATE_OR_CREATE_BUDGET_ITEM = `
mutation UpdateOrCreateBudgetItem($input: UpdateOrCreateBudgetItemMutationInput!) {
  updateOrCreateBudgetItem(input: $input) {
    budgetItem { id }
    errors { message }
  }
}`;

export const Q_ME = `
query Me {
  me {
    id
    email
    name
  }
}`;
