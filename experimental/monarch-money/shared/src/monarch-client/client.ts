import type {
  Account,
  BalanceSnapshot,
  Budget,
  CashflowSummary,
  Category,
  CategoryGroup,
  Holding,
  NetWorthByTypeRow,
  NetWorthSnapshot,
  RecurringTransaction,
  SessionState,
  SpendingByCategory,
  SplitInput,
  Tag,
  Transaction,
  TransactionFilter,
  TransactionRule,
  TransactionRuleInput,
} from '../types.js';
import {
  createGraphQLTransport,
  type GraphQLTransport,
  MonarchAuthError,
} from './graphql-transport.js';
import * as ops from './operations.js';

/**
 * Public interface for the Monarch Money client.
 *
 * Tools use this interface (rather than the concrete class) so functional
 * tests can swap in mocks via the client factory.
 */
export interface IMonarchClient {
  isAuthenticated(): Promise<boolean>;
  saveSessionToken(token: string, email?: string): Promise<void>;
  whoami(): Promise<{ id: string; email: string; name: string }>;

  getAccounts(): Promise<Account[]>;
  getAccountBalanceHistory(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<BalanceSnapshot[]>;
  getAccountHoldings(accountId: string): Promise<Holding[]>;
  refreshAccounts(accountIds?: string[]): Promise<{ success: boolean; errors: string[] }>;

  getNetWorth(startDate?: string, endDate?: string): Promise<NetWorthSnapshot[]>;
  getNetWorthByAccountType(): Promise<NetWorthByTypeRow[]>;
  getCashflow(startDate: string, endDate: string): Promise<CashflowSummary>;

  getTransactions(
    filter?: TransactionFilter
  ): Promise<{ totalCount: number; results: Transaction[] }>;
  getTransactionDetails(transactionId: string): Promise<Transaction>;
  getTransactionsSummary(
    startDate: string,
    endDate: string
  ): Promise<{
    count: number;
    totalIncome: number;
    totalExpense: number;
    averageTransaction: number;
  }>;
  getSpendingByCategory(startDate: string, endDate: string): Promise<SpendingByCategory[]>;
  getRecurringTransactions(startDate?: string, endDate?: string): Promise<RecurringTransaction[]>;

  createTransaction(input: {
    accountId: string;
    amount: number;
    date: string;
    merchantName: string;
    categoryId: string;
    notes?: string;
  }): Promise<Transaction>;
  updateTransaction(input: {
    id: string;
    amount?: number;
    date?: string;
    notes?: string;
    hideFromReports?: boolean;
    merchantName?: string;
    categoryId?: string;
  }): Promise<Transaction>;
  deleteTransaction(id: string): Promise<{ deleted: boolean; errors: string[] }>;
  setTransactionCategory(
    transactionIds: string[],
    categoryId: string
  ): Promise<{ updatedCount: number; errors: string[] }>;
  setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction>;
  updateTransactionNotes(id: string, notes: string): Promise<{ id: string; notes: string }>;
  markTransactionReviewed(id: string, reviewed: boolean): Promise<Transaction>;
  splitTransaction(
    id: string,
    splits: SplitInput[]
  ): Promise<Array<{ id: string; amount: number }>>;

  getCategories(): Promise<Category[]>;
  getCategoryGroups(): Promise<CategoryGroup[]>;
  getTags(): Promise<Tag[]>;
  createTag(input: { name: string; color: string }): Promise<Tag>;
  deleteTag(id: string): Promise<{ deleted: boolean; errors: string[] }>;

  getTransactionRules(): Promise<TransactionRule[]>;
  createTransactionRule(input: TransactionRuleInput): Promise<TransactionRule[]>;
  updateTransactionRule(input: TransactionRuleInput & { id: string }): Promise<TransactionRule[]>;
  deleteTransactionRule(id: string): Promise<{ deleted: boolean; errors: string[] }>;

  getBudgets(startDate?: string, endDate?: string): Promise<Budget[]>;
  setBudgetAmount(input: {
    categoryId: string;
    amount: number;
    startDate?: string;
    applyToFuture?: boolean;
  }): Promise<{
    budgetItemId: string;
    categoryId: string;
    amount: number;
    startDate: string;
    applyToFuture: boolean;
  }>;
}

export interface MonarchClientOptions {
  transport: GraphQLTransport;
  /** Pre-loaded session, if any. Used for `isAuthenticated()`. */
  session: SessionState | null;
  /** Persist session tokens (and clear them) via this hook. */
  onSessionChange?: (state: SessionState | null) => Promise<void>;
}

function firstDayOfMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Monarch's rule mutations return their failures as a single nullable
 * `PayloadError` object (NOT a list), shaped `{ message, code, fieldErrors }`.
 */
interface PayloadError {
  message?: string | null;
  code?: string | null;
  fieldErrors?: Array<{
    field?: string | null;
    messages?: string[] | null;
  }> | null;
}

/**
 * Build a human-readable message from a rule mutation's `PayloadError`.
 *
 * A non-null `PayloadError` always signals failure, but the live API does not
 * always populate `message`: when an update would drop a rule's last criterion
 * or last action (which Monarch silently refuses, because every rule must keep
 * at least one of each), it returns an error object whose `message` and
 * `fieldErrors` are null. We surface a concrete explanation for that case so
 * the failure is never mistaken for success.
 */
function payloadErrorMessage(err: PayloadError): string {
  const parts: string[] = [];
  if (err.message) parts.push(err.message);
  for (const fe of err.fieldErrors ?? []) {
    const msgs = (fe.messages ?? []).join(', ');
    if (msgs) parts.push(fe.field ? `${fe.field}: ${msgs}` : msgs);
  }
  if (parts.length === 0) {
    return (
      'Monarch rejected the rule without a message. This usually means the ' +
      'resulting rule would have no criteria or no actions — every rule must ' +
      'keep at least one criterion (merchantCriteria, amountCriteria, ' +
      'categoryIds, or accountIds) AND at least one action (setCategoryAction, ' +
      'setHideFromReportsAction, or addTagsAction). Note that updates fully ' +
      'replace the rule, so re-supply every criterion and action you want to keep.' +
      (err.code ? ` (code: ${err.code})` : '')
    );
  }
  return err.code ? `${parts.join('; ')} (code: ${err.code})` : parts.join('; ');
}

export class MonarchClient implements IMonarchClient {
  private session: SessionState | null;

  constructor(private readonly options: MonarchClientOptions) {
    this.session = options.session;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.session) return false;
    try {
      await this.options.transport.request<{ me: { id: string } }>({
        query: ops.Q_ME,
      });
      return true;
    } catch (err) {
      if (err instanceof MonarchAuthError) return false;
      throw err;
    }
  }

  async saveSessionToken(token: string, email?: string): Promise<void> {
    const next: SessionState = {
      token,
      email: email ?? this.session?.email,
      obtainedAt: new Date().toISOString(),
      deviceUuid: this.session?.deviceUuid,
    };
    this.session = next;
    if (this.options.onSessionChange) await this.options.onSessionChange(next);
  }

  async whoami(): Promise<{ id: string; email: string; name: string }> {
    const data = await this.options.transport.request<{
      me: { id: string; email: string; name: string };
    }>({ query: ops.Q_ME });
    return data.me;
  }

  async getAccounts(): Promise<Account[]> {
    const data = await this.options.transport.request<{ accounts: Account[] }>({
      query: ops.Q_ACCOUNTS,
    });
    return data.accounts ?? [];
  }

  async getAccountBalanceHistory(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<BalanceSnapshot[]> {
    const data = await this.options.transport.request<{
      snapshotsForAccount: Array<{
        date: string;
        signedBalance: number;
      }> | null;
    }>({
      query: ops.Q_ACCOUNT_BALANCE_HISTORY,
      variables: { accountId },
    });
    // `snapshotsForAccount` returns the full series with no server-side date
    // filtering, so window it here. ISO `YYYY-MM-DD` dates compare correctly
    // lexicographically, and the bounds are inclusive on both ends.
    return (data.snapshotsForAccount ?? [])
      .filter((s) => s.date >= startDate && s.date <= endDate)
      .map((s) => ({ date: s.date, balance: s.signedBalance }));
  }

  async getAccountHoldings(accountId: string): Promise<Holding[]> {
    const data = await this.options.transport.request<{
      account: { holdings: Holding[] | null } | null;
    }>({
      query: ops.Q_ACCOUNT_HOLDINGS,
      variables: { accountId },
    });
    return data.account?.holdings ?? [];
  }

  async refreshAccounts(accountIds?: string[]): Promise<{ success: boolean; errors: string[] }> {
    const data = await this.options.transport.request<{
      forceRefreshAccounts: {
        success: boolean;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_REFRESH_ACCOUNTS,
      variables: { accountIds: accountIds ?? null },
    });
    return {
      success: data.forceRefreshAccounts.success,
      errors: (data.forceRefreshAccounts.errors ?? []).map((e) => e.message),
    };
  }

  async getNetWorth(startDate?: string, endDate?: string): Promise<NetWorthSnapshot[]> {
    // Q_NET_WORTH selects from `aggregateSnapshots` and aliases its fields
    // (`balance` → `netWorth`, etc.) into the NetWorthSnapshot shape, so the
    // response key is `aggregateSnapshots` even though the inner records
    // already match `NetWorthSnapshot`.
    const data = await this.options.transport.request<{
      aggregateSnapshots: NetWorthSnapshot[];
    }>({
      query: ops.Q_NET_WORTH,
      variables: { startDate, endDate },
    });
    return data.aggregateSnapshots ?? [];
  }

  /**
   * Monarch removed the dedicated `netWorthByAccountType` field from its
   * GraphQL gateway, so we synthesize the same shape client-side by summing
   * `currentBalance` per `account.type` group, skipping accounts that opt out
   * of net-worth inclusion. `currentBalance` is signed (negative for
   * liabilities), so plain summation gives the correct net contribution per
   * type.
   */
  async getNetWorthByAccountType(): Promise<NetWorthByTypeRow[]> {
    const accounts = await this.getAccounts();
    const byType = new Map<string, number>();
    for (const a of accounts) {
      if (a.includeInNetWorth === false) continue;
      const typeName = a.type?.display ?? a.type?.name ?? 'Other';
      const balance = a.currentBalance ?? a.displayBalance ?? 0;
      byType.set(typeName, (byType.get(typeName) ?? 0) + balance);
    }
    return [...byType.entries()].map(([type, balance]) => ({ type, balance }));
  }

  async getCashflow(startDate: string, endDate: string): Promise<CashflowSummary> {
    // `aggregates` returns an array; with no `groupBy` there's exactly one
    // element whose `summary` carries the totals. Field names map onto the
    // legacy `CashflowSummary` shape:
    //   sumIncome  → income (positive)
    //   sumExpense → expense (negative; Monarch's sign convention)
    //   savings    → savings
    //   savingsRate (0..1) → savingsRate; defaults to 0 when income is 0
    const data = await this.options.transport.request<{
      aggregates: Array<{
        summary: {
          sumIncome: number | null;
          sumExpense: number | null;
          savings: number | null;
          savingsRate: number | null;
        };
      }>;
    }>({
      query: ops.Q_CASHFLOW,
      variables: { startDate, endDate },
    });
    const summary = data.aggregates?.[0]?.summary ?? {
      sumIncome: 0,
      sumExpense: 0,
      savings: 0,
      savingsRate: 0,
    };
    return {
      startDate,
      endDate,
      income: summary.sumIncome ?? 0,
      expense: summary.sumExpense ?? 0,
      savings: summary.savings ?? 0,
      savingsRate: summary.savingsRate ?? 0,
    };
  }

  async getTransactions(
    filter: TransactionFilter = {}
  ): Promise<{ totalCount: number; results: Transaction[] }> {
    // Build the TransactionFilterInput. Only set keys the caller actually
    // provided — Monarch validates the input strictly and complains about
    // explicit nulls for some optional fields. `amountGte`/`amountLte`
    // (caller-facing names) map to `absAmountGte`/`absAmountLte` on the
    // server-side filter type.
    const filters: Record<string, unknown> = {};
    if (filter.accountIds !== undefined) filters.accounts = filter.accountIds;
    if (filter.categoryIds !== undefined) filters.categories = filter.categoryIds;
    if (filter.tagIds !== undefined) filters.tags = filter.tagIds;
    if (filter.merchantIds !== undefined) filters.merchants = filter.merchantIds;
    if (filter.startDate !== undefined) filters.startDate = filter.startDate;
    if (filter.endDate !== undefined) filters.endDate = filter.endDate;
    if (filter.search !== undefined) filters.search = filter.search;
    if (filter.amountGte !== undefined) filters.absAmountGte = filter.amountGte;
    if (filter.amountLte !== undefined) filters.absAmountLte = filter.amountLte;
    if (filter.needsReview !== undefined) filters.needsReview = filter.needsReview;
    if (filter.hideFromReports !== undefined) filters.hideFromReports = filter.hideFromReports;
    if (filter.isSplit !== undefined) filters.isSplit = filter.isSplit;

    const data = await this.options.transport.request<{
      allTransactions: { totalCount: number; results: Transaction[] };
    }>({
      query: ops.Q_TRANSACTIONS,
      variables: {
        filters,
        limit: filter.limit ?? 100,
        offset: filter.offset ?? 0,
      },
    });
    return {
      totalCount: data.allTransactions.totalCount,
      results: data.allTransactions.results ?? [],
    };
  }

  async getTransactionDetails(transactionId: string): Promise<Transaction> {
    const data = await this.options.transport.request<{
      transaction: Transaction;
    }>({
      query: ops.Q_TRANSACTION_DETAILS,
      variables: { transactionId },
    });
    return data.transaction;
  }

  /**
   * Date arguments are required by Monarch's `aggregates` field — callers
   * should supply a window. The legacy `transactionsSummary` shape is
   * reconstructed from the `aggregates(filters).summary` fields:
   *   count      → count
   *   sumIncome  → totalIncome (positive)
   *   sumExpense → totalExpense (negative; Monarch convention)
   *   avg        → averageTransaction
   */
  async getTransactionsSummary(startDate: string, endDate: string) {
    const data = await this.options.transport.request<{
      aggregates: Array<{
        summary: {
          count: number | null;
          sumIncome: number | null;
          sumExpense: number | null;
          avg: number | null;
        };
      }>;
    }>({
      query: ops.Q_TRANSACTIONS_SUMMARY,
      variables: { startDate, endDate },
    });
    const summary = data.aggregates?.[0]?.summary ?? {
      count: 0,
      sumIncome: 0,
      sumExpense: 0,
      avg: 0,
    };
    return {
      count: summary.count ?? 0,
      totalIncome: summary.sumIncome ?? 0,
      totalExpense: summary.sumExpense ?? 0,
      averageTransaction: summary.avg ?? 0,
    };
  }

  /**
   * Monarch surfaces per-category spending via `aggregates` with
   * `groupBy: ["category"]`. Each result element pairs the projected
   * `category` with a `summary` of totals; we want the expense magnitude per
   * category (returned by Monarch as a negative number).
   *
   * `sumExpense` is preferred when present; if Monarch omits it for income-
   * only categories we fall back to `sum`.
   */
  async getSpendingByCategory(startDate: string, endDate: string): Promise<SpendingByCategory[]> {
    const data = await this.options.transport.request<{
      aggregates: Array<{
        groupBy: { category: { id: string; name: string } | null } | null;
        summary: {
          sumExpense: number | null;
          sumIncome: number | null;
          sum: number | null;
        };
      }>;
    }>({
      query: ops.Q_SPENDING_BY_CATEGORY,
      variables: { startDate, endDate },
    });
    return (data.aggregates ?? [])
      .filter((row) => row.groupBy?.category != null)
      .map((row) => {
        const category = row.groupBy!.category!;
        const amount = row.summary.sumExpense ?? row.summary.sum ?? 0;
        return {
          categoryId: category.id,
          categoryName: category.name,
          amount,
        };
      });
  }

  /**
   * Monarch's `recurringTransactionItems` returns per-occurrence forecasts
   * over a date window. Defaults to "today through 90 days from now" when no
   * window is supplied so the surface is usable from a no-argument MCP tool.
   */
  async getRecurringTransactions(
    startDate?: string,
    endDate?: string
  ): Promise<RecurringTransaction[]> {
    const today = new Date();
    const ninetyDaysOut = new Date(today);
    ninetyDaysOut.setDate(today.getDate() + 90);
    const start = startDate ?? today.toISOString().slice(0, 10);
    const end = endDate ?? ninetyDaysOut.toISOString().slice(0, 10);

    const data = await this.options.transport.request<{
      recurringTransactionItems: Array<{
        stream: {
          id: string;
          name: string;
          frequency: string | null;
          isActive: boolean | null;
        } | null;
        date: string;
        amount: number;
      }>;
    }>({
      query: ops.Q_RECURRING_TRANSACTIONS,
      variables: { startDate: start, endDate: end },
    });
    return (data.recurringTransactionItems ?? [])
      .filter((item) => item.stream != null)
      .map((item) => ({
        id: item.stream!.id,
        name: item.stream!.name,
        amount: item.amount,
        date: item.date,
        frequency: item.stream!.frequency ?? null,
        isActive: item.stream!.isActive ?? undefined,
      }));
  }

  async createTransaction(input: {
    accountId: string;
    amount: number;
    date: string;
    merchantName: string;
    categoryId: string;
    notes?: string;
  }): Promise<Transaction> {
    // `categoryId` is required by Monarch — the mutation rejects creates
    // without one. Other fields map straight onto the typed input.
    const data = await this.options.transport.request<{
      createTransaction: {
        transaction: Transaction;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_CREATE_TRANSACTION,
      variables: {
        input: {
          accountId: input.accountId,
          amount: input.amount,
          date: input.date,
          merchantName: input.merchantName,
          categoryId: input.categoryId,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      },
    });
    if (data.createTransaction.errors && data.createTransaction.errors.length > 0) {
      throw new Error(
        `createTransaction failed: ${data.createTransaction.errors.map((e) => e.message).join('; ')}`
      );
    }
    return data.createTransaction.transaction;
  }

  async updateTransaction(input: {
    id: string;
    amount?: number;
    date?: string;
    notes?: string;
    hideFromReports?: boolean;
    needsReview?: boolean;
    merchantName?: string;
    categoryId?: string;
  }): Promise<Transaction> {
    // The Monarch input is sparse — only include keys the caller specified.
    // Note the field renames: `categoryId` (caller-facing) maps to `category`
    // on the input; `merchantName` maps to `name`. Reassigning a transaction
    // to a different existing merchant by id is not supported by the API.
    const inputObj: Record<string, unknown> = { id: input.id };
    if (input.amount !== undefined) inputObj.amount = input.amount;
    if (input.date !== undefined) inputObj.date = input.date;
    if (input.notes !== undefined) inputObj.notes = input.notes;
    if (input.hideFromReports !== undefined) inputObj.hideFromReports = input.hideFromReports;
    if (input.needsReview !== undefined) inputObj.needsReview = input.needsReview;
    if (input.merchantName !== undefined) inputObj.name = input.merchantName;
    if (input.categoryId !== undefined) inputObj.category = input.categoryId;

    const data = await this.options.transport.request<{
      updateTransaction: {
        transaction: Transaction;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_UPDATE_TRANSACTION,
      variables: { input: inputObj },
    });
    if (data.updateTransaction.errors && data.updateTransaction.errors.length > 0) {
      throw new Error(
        `updateTransaction failed: ${data.updateTransaction.errors.map((e) => e.message).join('; ')}`
      );
    }
    return data.updateTransaction.transaction;
  }

  async deleteTransaction(id: string): Promise<{ deleted: boolean; errors: string[] }> {
    const data = await this.options.transport.request<{
      deleteTransaction: {
        deleted: boolean;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_DELETE_TRANSACTION,
      variables: { input: { transactionId: id } },
    });
    return {
      deleted: data.deleteTransaction.deleted,
      errors: (data.deleteTransaction.errors ?? []).map((e) => e.message),
    };
  }

  /**
   * Bulk recategorization. Monarch removed the dedicated batch mutation, so
   * we apply the new category to each transaction sequentially via
   * `updateTransaction(input: { id, category })` and aggregate the result.
   * We keep the legacy `{ updatedCount, errors }` return shape so callers
   * (and the tool surface) don't need to change.
   */
  async setTransactionCategory(
    transactionIds: string[],
    categoryId: string
  ): Promise<{ updatedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let updatedCount = 0;
    for (const id of transactionIds) {
      try {
        await this.updateTransaction({ id, categoryId });
        updatedCount += 1;
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { updatedCount, errors };
  }

  async setTransactionTags(transactionId: string, tagIds: string[]): Promise<Transaction> {
    const data = await this.options.transport.request<{
      setTransactionTags: {
        transaction: Transaction;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_SET_TAGS,
      variables: { input: { transactionId, tagIds } },
    });
    if (data.setTransactionTags.errors && data.setTransactionTags.errors.length > 0) {
      throw new Error(
        `setTransactionTags failed: ${data.setTransactionTags.errors.map((e) => e.message).join('; ')}`
      );
    }
    return data.setTransactionTags.transaction;
  }

  async updateTransactionNotes(id: string, notes: string) {
    const tx = await this.updateTransaction({ id, notes });
    return { id: tx.id, notes: tx.notes ?? '' };
  }

  /**
   * Monarch removed the dedicated `reviewTransaction` mutation; the modern
   * equivalent is `updateTransaction(input: { id, needsReview })`. Note the
   * inverted boolean: callers ask "is this reviewed?", but Monarch tracks
   * "does this still need review?", so we flip the flag on the way in.
   */
  async markTransactionReviewed(id: string, reviewed: boolean): Promise<Transaction> {
    return this.updateTransaction({ id, needsReview: !reviewed });
  }

  /**
   * Splits a parent transaction into multiple child transactions.
   * `updateTransactionSplit` fully replaces the split set — the response
   * carries the new child transaction ids and amounts.
   */
  async splitTransaction(
    id: string,
    splits: SplitInput[]
  ): Promise<Array<{ id: string; amount: number }>> {
    const data = await this.options.transport.request<{
      updateTransactionSplit: {
        transaction: {
          id: string;
          isSplitTransaction: boolean;
          splitTransactions: Array<{ id: string; amount: number }> | null;
        };
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_UPDATE_TRANSACTION_SPLIT,
      variables: {
        input: {
          transactionId: id,
          splitData: splits.map((s) => {
            const out: Record<string, unknown> = { amount: s.amount };
            if (s.categoryId !== undefined) out.categoryId = s.categoryId;
            if (s.merchantId !== undefined) out.merchantId = s.merchantId;
            if (s.notes !== undefined) out.notes = s.notes;
            return out;
          }),
        },
      },
    });
    if (data.updateTransactionSplit.errors && data.updateTransactionSplit.errors.length > 0) {
      throw new Error(
        `splitTransaction failed: ${data.updateTransactionSplit.errors.map((e) => e.message).join('; ')}`
      );
    }
    return data.updateTransactionSplit.transaction.splitTransactions ?? [];
  }

  async getCategories(): Promise<Category[]> {
    const data = await this.options.transport.request<{
      categories: Category[];
    }>({
      query: ops.Q_CATEGORIES,
    });
    return data.categories ?? [];
  }

  async getCategoryGroups(): Promise<CategoryGroup[]> {
    const data = await this.options.transport.request<{
      categoryGroups: CategoryGroup[];
    }>({
      query: ops.Q_CATEGORY_GROUPS,
    });
    return data.categoryGroups ?? [];
  }

  async getTags(): Promise<Tag[]> {
    const data = await this.options.transport.request<{
      householdTransactionTags: Tag[];
    }>({
      query: ops.Q_TAGS,
    });
    return data.householdTransactionTags ?? [];
  }

  /**
   * Create a transaction tag. Monarch's `createTransactionTag` requires both a
   * `name` and a `color` (a hex string); `order` is assigned server-side. The
   * mutation echoes the new tag back, so we return it directly.
   *
   * `errors` is a single nullable `PayloadError` object (not a list); any
   * non-null value means the create failed.
   */
  async createTag(input: { name: string; color: string }): Promise<Tag> {
    const data = await this.options.transport.request<{
      createTransactionTag: {
        tag: Tag | null;
        errors: PayloadError | null;
      };
    }>({
      query: ops.M_CREATE_TAG,
      variables: { input: { name: input.name, color: input.color } },
    });
    const errors = data.createTransactionTag?.errors;
    if (errors) {
      throw new Error(`createTag failed: ${payloadErrorMessage(errors)}`);
    }
    const tag = data.createTransactionTag?.tag;
    if (!tag) {
      throw new Error('createTag failed: Monarch returned no tag and no error.');
    }
    return tag;
  }

  /**
   * Delete a transaction tag. `deleteTransactionTag` takes a bare `$id`
   * argument and returns a `deleted` flag plus `errors`.
   *
   * Mirroring `deleteTransactionRule`, the `deleted` flag is treated as
   * advisory: when the mutation reports no `errors`, we re-query
   * `householdTransactionTags` and derive `deleted` from whether the id has
   * actually disappeared, rather than trusting the flag.
   */
  async deleteTag(id: string): Promise<{ deleted: boolean; errors: string[] }> {
    const data = await this.options.transport.request<{
      deleteTransactionTag: {
        deleted: boolean;
        errors: PayloadError | null;
      };
    }>({
      query: ops.M_DELETE_TAG,
      variables: { id },
    });
    const err = data.deleteTransactionTag?.errors;
    if (err) {
      return { deleted: false, errors: [payloadErrorMessage(err)] };
    }
    const remaining = await this.getTags();
    return { deleted: !remaining.some((t) => t.id === id), errors: [] };
  }

  async getTransactionRules(): Promise<TransactionRule[]> {
    const data = await this.options.transport.request<{
      transactionRules: TransactionRule[];
    }>({
      query: ops.Q_TRANSACTION_RULES,
    });
    return data.transactionRules ?? [];
  }

  /**
   * Build the Monarch rule input object, including only the keys the caller
   * provided. The create and update inputs share this shape; `id` is included
   * only for updates. Criteria and action fields use different names (e.g. the
   * `setCategoryAction` action vs the `categoryIds` criteria) — see
   * `TransactionRuleInput` for the mapping.
   */
  private buildRuleInput(input: TransactionRuleInput & { id?: string }): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (input.id !== undefined) out.id = input.id;
    if (input.merchantCriteria !== undefined) out.merchantCriteria = input.merchantCriteria;
    if (input.merchantCriteriaUseOriginalStatement !== undefined)
      out.merchantCriteriaUseOriginalStatement = input.merchantCriteriaUseOriginalStatement;
    if (input.amountCriteria !== undefined) out.amountCriteria = input.amountCriteria;
    if (input.categoryIds !== undefined) out.categoryIds = input.categoryIds;
    if (input.accountIds !== undefined) out.accountIds = input.accountIds;
    if (input.setCategoryAction !== undefined) out.setCategoryAction = input.setCategoryAction;
    if (input.setHideFromReportsAction !== undefined)
      out.setHideFromReportsAction = input.setHideFromReportsAction;
    if (input.addTagsAction !== undefined) out.addTagsAction = input.addTagsAction;
    if (input.applyToExistingTransactions !== undefined)
      out.applyToExistingTransactions = input.applyToExistingTransactions;
    return out;
  }

  /**
   * Create a transaction rule. Monarch's `createTransactionRuleV2` mutation
   * returns only an `errors` payload — it does not echo the new rule back, so
   * after a successful create we re-query `transactionRules` and return the
   * full refreshed set (the caller can locate the new rule and its id there).
   *
   * `errors` is a single nullable `PayloadError` object (not a list); any
   * non-null value means the create failed.
   */
  async createTransactionRule(input: TransactionRuleInput): Promise<TransactionRule[]> {
    const data = await this.options.transport.request<{
      createTransactionRuleV2: {
        errors: PayloadError | null;
      };
    }>({
      query: ops.M_CREATE_TRANSACTION_RULE,
      variables: { input: this.buildRuleInput(input) },
    });
    const errors = data.createTransactionRuleV2?.errors;
    if (errors) {
      throw new Error(`createTransactionRule failed: ${payloadErrorMessage(errors)}`);
    }
    return this.getTransactionRules();
  }

  /**
   * Update an existing transaction rule. The update input reuses the create
   * field surface plus the required `id`.
   *
   * IMPORTANT — this is a FULL REPLACE: the input defines the rule's complete
   * new state, so any criterion or action not present in `input` is cleared.
   * Callers must re-supply every criterion and action they want to keep (at
   * least one of each). Like create, the mutation returns only `errors` (a
   * single nullable `PayloadError`), so we re-query and return the refreshed
   * rule set. A non-null `errors` means the update failed — including the
   * silent-rejection case where the resulting rule would have no criteria or no
   * actions (Monarch returns an error object with a null `message` there, which
   * `payloadErrorMessage` translates into an actionable explanation).
   */
  async updateTransactionRule(
    input: TransactionRuleInput & { id: string }
  ): Promise<TransactionRule[]> {
    const data = await this.options.transport.request<{
      updateTransactionRuleV2: {
        errors: PayloadError | null;
      };
    }>({
      query: ops.M_UPDATE_TRANSACTION_RULE,
      variables: { input: this.buildRuleInput(input) },
    });
    const errors = data.updateTransactionRuleV2?.errors;
    if (errors) {
      throw new Error(`updateTransactionRule failed: ${payloadErrorMessage(errors)}`);
    }
    return this.getTransactionRules();
  }

  /**
   * Delete a transaction rule. `deleteTransactionRule` takes a bare `$id`
   * argument and returns a `deleted` flag plus `errors`.
   *
   * The API's `deleted` flag is unreliable — it comes back `false` even when the
   * rule is in fact removed. So we don't trust it: when the mutation reports no
   * `errors`, we re-query `transactionRules` and derive `deleted` from whether
   * the id has actually disappeared.
   */
  async deleteTransactionRule(id: string): Promise<{ deleted: boolean; errors: string[] }> {
    const data = await this.options.transport.request<{
      deleteTransactionRule: {
        deleted: boolean;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_DELETE_TRANSACTION_RULE,
      variables: { id },
    });
    const errors = (data.deleteTransactionRule.errors ?? []).map((e) => e.message);
    if (errors.length > 0) {
      return { deleted: false, errors };
    }
    const remaining = await this.getTransactionRules();
    return { deleted: !remaining.some((r) => r.id === id), errors };
  }

  /**
   * Per-category budget snapshot for the requested window. Monarch's
   * `budgetData` keys by `startMonth`/`endMonth` (month boundaries) and
   * returns one `monthlyAmounts` array per category. We flatten that into a
   * row per (category, month) so callers see a familiar `Budget[]` shape.
   *
   * Defaults to the current month when no dates are provided.
   */
  async getBudgets(startDate?: string, endDate?: string): Promise<Budget[]> {
    const now = new Date();
    const startMonth = startDate ? `${startDate.slice(0, 7)}-01` : firstDayOfMonth(now);
    const endMonth = endDate ? `${endDate.slice(0, 7)}-01` : firstDayOfMonth(now);

    const data = await this.options.transport.request<{
      budgetData: {
        monthlyAmountsByCategory: Array<{
          category: { id: string; name: string };
          monthlyAmounts: Array<{
            month: string;
            plannedAmount: number | null;
          }>;
        }> | null;
      } | null;
    }>({
      query: ops.Q_BUDGET_DATA,
      variables: { startMonth, endMonth },
    });
    const rows: Budget[] = [];
    for (const entry of data.budgetData?.monthlyAmountsByCategory ?? []) {
      for (const ma of entry.monthlyAmounts) {
        rows.push({
          categoryId: entry.category.id,
          categoryName: entry.category.name,
          amount: ma.plannedAmount ?? 0,
          month: ma.month,
        });
      }
    }
    return rows;
  }

  /**
   * Set a category's planned budget amount for the period containing
   * `startDate` (or the current month when omitted). Pass `applyToFuture:
   * true` to roll the change forward to all subsequent periods.
   *
   * `updateOrCreateBudgetItem` returns only the new `budgetItem.id`, so we
   * echo the request back so callers can confirm what was applied.
   */
  async setBudgetAmount(input: {
    categoryId: string;
    amount: number;
    startDate?: string;
    applyToFuture?: boolean;
  }): Promise<{
    budgetItemId: string;
    categoryId: string;
    amount: number;
    startDate: string;
    applyToFuture: boolean;
  }> {
    const startDate = input.startDate
      ? `${input.startDate.slice(0, 7)}-01`
      : firstDayOfMonth(new Date());
    const applyToFuture = input.applyToFuture ?? false;

    const data = await this.options.transport.request<{
      updateOrCreateBudgetItem: {
        budgetItem: { id: string } | null;
        errors: { message: string }[] | null;
      };
    }>({
      query: ops.M_UPDATE_OR_CREATE_BUDGET_ITEM,
      variables: {
        input: {
          categoryId: input.categoryId,
          amount: input.amount,
          startDate,
          applyToFuture,
          timeframe: 'month',
        },
      },
    });
    if (data.updateOrCreateBudgetItem.errors && data.updateOrCreateBudgetItem.errors.length > 0) {
      throw new Error(
        `setBudgetAmount failed: ${data.updateOrCreateBudgetItem.errors.map((e) => e.message).join('; ')}`
      );
    }
    return {
      budgetItemId: data.updateOrCreateBudgetItem.budgetItem?.id ?? '',
      categoryId: input.categoryId,
      amount: input.amount,
      startDate,
      applyToFuture,
    };
  }
}

/**
 * Build a `MonarchClient` against the live API for a given session token.
 */
export function buildMonarchClient(opts: {
  session: SessionState;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  onSessionChange?: (state: SessionState | null) => Promise<void>;
}): MonarchClient {
  const transport = createGraphQLTransport({
    endpoint: opts.endpoint,
    token: opts.session.token,
    fetchImpl: opts.fetchImpl,
    deviceUuid: opts.session.deviceUuid,
  });
  return new MonarchClient({
    transport,
    session: opts.session,
    onSessionChange: opts.onSessionChange,
  });
}
