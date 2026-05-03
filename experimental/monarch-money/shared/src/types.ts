/**
 * Type definitions for the Monarch Money MCP server.
 *
 * Shapes here represent the slice of Monarch's GraphQL data model the server
 * exposes to MCP tools. They are intentionally permissive: GraphQL responses
 * may contain extra fields we don't model, and Monarch occasionally adds new
 * ones, so unknown trailing properties are tolerated.
 */

export interface Account {
  id: string;
  displayName: string;
  syncDisabled?: boolean;
  isHidden?: boolean;
  isAsset?: boolean;
  type?: { name: string; display: string } | null;
  subtype?: { name: string; display: string } | null;
  currentBalance?: number | null;
  displayBalance?: number | null;
  includeInNetWorth?: boolean;
  institution?: { id: string; name: string } | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface BalanceSnapshot {
  date: string;
  balance: number;
}

export interface Holding {
  id: string;
  ticker?: string | null;
  name?: string | null;
  quantity?: number;
  costBasis?: number | null;
  value?: number | null;
  type?: string | null;
  closingPrice?: number | null;
}

export interface NetWorthSnapshot {
  date: string;
  netWorth: number;
  assets?: number | null;
  liabilities?: number | null;
}

export interface NetWorthByTypeRow {
  type: string;
  balance: number;
}

export interface CashflowSummary {
  startDate: string;
  endDate: string;
  // Income is positive; expense is negative (Monarch's sign convention).
  income: number;
  expense: number;
  savings: number;
  // Fraction in [0, 1]; Monarch returns 0 when income is 0.
  savingsRate?: number;
}

export interface TransactionsSummary {
  count: number;
  totalIncome: number;
  totalExpense: number;
  averageTransaction: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  isSystemCategory?: boolean;
  group?: { id: string; name: string; type?: string } | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  type?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  order?: number | null;
}

export interface Merchant {
  id: string;
  name: string;
}

export interface TransactionSplit {
  id: string;
  amount: number;
  notes?: string | null;
  category?: { id: string; name: string } | null;
  merchant?: { id: string; name: string } | null;
}

export interface Transaction {
  id: string;
  amount: number;
  pending?: boolean;
  date: string;
  notes?: string | null;
  hideFromReports?: boolean;
  needsReview?: boolean;
  reviewedAt?: string | null;
  isSplitTransaction?: boolean;
  account?: { id: string; displayName: string } | null;
  category?: { id: string; name: string } | null;
  merchant?: { id: string; name: string } | null;
  tags?: Tag[];
  splits?: TransactionSplit[];
}

export interface TransactionFilter {
  accountIds?: string[];
  categoryIds?: string[];
  tagIds?: string[];
  merchantIds?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  amountGte?: number;
  amountLte?: number;
  needsReview?: boolean;
  hideFromReports?: boolean;
  isSplit?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Forecast occurrence of a recurring transaction stream.
 *
 * Monarch's `recurringTransactionItems` returns flat per-occurrence rows whose
 * stream metadata only exposes id/name/frequency/isActive — the underlying
 * stream object does NOT carry merchant, category, or account fields, so we
 * cannot surface them here without a separate per-stream lookup.
 */
export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  frequency?: string | null;
  isActive?: boolean;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  amount: number;
}

/**
 * Read-only view of a transaction rule.
 *
 * Monarch's modern schema removes the older flat fields (`setMerchantId`,
 * `setCategoryId`, `setHideFromReports`, `setNeedsReview`, `setTagIds`,
 * `categoryCriteria`) and replaces `merchantCriteria` with an array of
 * structured matchers. We expose the remaining read-only fields and do NOT
 * publish mutations to write rules — the schema for the write side is
 * undocumented and prior probing during refactor work caused data loss.
 */
export interface TransactionRule {
  id: string;
  order?: number;
  merchantCriteriaUseOriginalStatement?: boolean;
  merchantCriteria?: Array<{ operator: string; value: string }> | null;
  amountCriteria?: {
    operator: string;
    value: number;
    isExpense: boolean;
  } | null;
  categoryIds?: string[] | null;
  accountIds?: string[] | null;
  setHideFromReportsAction?: boolean;
  lastAppliedAt?: string | null;
}

/**
 * Per-category budget snapshot for a single month.
 *
 * Synthesized from Monarch's `budgetData.monthlyAmountsByCategory` shape —
 * each row pairs a category with the month's planned amount. The legacy
 * `id`/`endDate`/`rolloverEnabled` fields aren't reachable in the modern
 * schema, so they're not part of this shape.
 */
export interface Budget {
  categoryId: string;
  categoryName?: string;
  amount: number;
  month?: string;
}

export interface SplitInput {
  amount: number;
  categoryId?: string;
  notes?: string;
  merchantId?: string;
}

export interface SessionState {
  token: string;
  obtainedAt: string;
  email?: string;
  /**
   * Stable per-install identifier sent to Monarch as the `device-uuid` header.
   * Persisted across runs so a once-paired install (via email OTP) keeps its
   * trusted-device status — subsequent password logins skip the OTP challenge.
   */
  deviceUuid?: string;
}
