import type { IMonarchClient } from './client.js';
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
  SpendingByCategory,
  Tag,
  Transaction,
  TransactionFilter,
  TransactionRule,
} from '../types.js';

/**
 * In-memory `IMonarchClient` for integration tests.
 *
 * The integration tier exercises the full MCP wire protocol with a real
 * `TestMCPClient` <-> server stdio pair. The Monarch API is the only piece we
 * mock, so this client lives in `shared/` and is loaded by the local
 * `index.integration-with-mock.ts` entry. Mock data is supplied via the
 * `MCP_INTEGRATION_TEST_MOCK_DATA` env var.
 */
export interface MockData {
  authenticated?: boolean;
  me?: { id: string; email: string; name: string };
  accounts?: Account[];
  balanceHistory?: BalanceSnapshot[];
  holdings?: Holding[];
  netWorth?: NetWorthSnapshot[];
  netWorthByType?: NetWorthByTypeRow[];
  cashflow?: CashflowSummary;
  transactions?: Transaction[];
  transactionsTotalCount?: number;
  transactionDetails?: Transaction;
  transactionsSummary?: {
    count: number;
    totalIncome: number;
    totalExpense: number;
    averageTransaction: number;
  };
  spendingByCategory?: SpendingByCategory[];
  recurring?: RecurringTransaction[];
  categories?: Category[];
  categoryGroups?: CategoryGroup[];
  tags?: Tag[];
  rules?: TransactionRule[];
  budgets?: Budget[];
  // Mutate echoes: each mutate returns a sensible default unless overridden.
  createTransactionResult?: Transaction;
  updateTransactionResult?: Transaction;
  setTransactionTagsResult?: Transaction;
  splitTransactionResult?: Array<{ id: string; amount: number }>;
  setBudgetResult?: {
    budgetItemId: string;
    categoryId: string;
    amount: number;
    startDate: string;
    applyToFuture: boolean;
  };
}

const stubTransaction: Transaction = {
  id: 'tx_integration_default',
  amount: -12.34,
  date: '2026-01-15',
  account: { id: 'acc_default', displayName: 'Default Checking' },
  category: { id: 'cat_default', name: 'Misc' },
  merchant: { id: 'merch_default', name: 'Mock Merchant' },
};

export function createIntegrationMockMonarchClient(
  mockData: MockData = {}
): IMonarchClient & { mockData: MockData } {
  const data = { ...mockData };

  return {
    mockData: data,

    async isAuthenticated() {
      return data.authenticated !== false;
    },
    async saveSessionToken() {
      data.authenticated = true;
    },
    async whoami() {
      return (
        data.me ?? {
          id: 'user_mock',
          email: 'mock@example.com',
          name: 'Mock User',
        }
      );
    },

    async getAccounts() {
      return (
        data.accounts ?? [
          {
            id: 'acc_default',
            displayName: 'Mock Checking',
            currentBalance: 1234.56,
            displayBalance: 1234.56,
            isAsset: true,
            type: { name: 'depository', display: 'Checking' },
            institution: { id: 'inst_1', name: 'Mock Bank' },
          },
        ]
      );
    },
    async getAccountBalanceHistory() {
      return (
        data.balanceHistory ?? [
          { date: '2026-01-01', balance: 1000 },
          { date: '2026-01-02', balance: 1100 },
        ]
      );
    },
    async getAccountHoldings() {
      return data.holdings ?? [];
    },
    async refreshAccounts() {
      return { success: true, errors: [] };
    },

    async getNetWorth() {
      return (
        data.netWorth ?? [
          {
            date: '2026-01-01',
            netWorth: 50_000,
            assets: 60_000,
            liabilities: 10_000,
          },
        ]
      );
    },
    async getNetWorthByAccountType() {
      return (
        data.netWorthByType ?? [
          { type: 'depository', balance: 5000 },
          { type: 'investment', balance: 45_000 },
        ]
      );
    },
    async getCashflow() {
      return (
        data.cashflow ?? {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          income: 5000,
          expense: -3000,
          savings: 2000,
          savingsRate: 0.4,
        }
      );
    },

    async getTransactions(_filter?: TransactionFilter) {
      const results = data.transactions ?? [stubTransaction];
      return {
        totalCount: data.transactionsTotalCount ?? results.length,
        results,
      };
    },
    async getTransactionDetails() {
      return data.transactionDetails ?? stubTransaction;
    },
    async getTransactionsSummary() {
      return (
        data.transactionsSummary ?? {
          count: 1,
          totalIncome: 0,
          totalExpense: 12.34,
          averageTransaction: 12.34,
        }
      );
    },
    async getSpendingByCategory() {
      return (
        data.spendingByCategory ?? [
          { categoryId: 'cat_default', categoryName: 'Misc', amount: 12.34 },
        ]
      );
    },
    async getRecurringTransactions() {
      return data.recurring ?? [];
    },

    async createTransaction() {
      return data.createTransactionResult ?? { ...stubTransaction, id: 'tx_created' };
    },
    async updateTransaction() {
      return data.updateTransactionResult ?? stubTransaction;
    },
    async deleteTransaction() {
      return { deleted: true, errors: [] };
    },
    async setTransactionCategory() {
      return { updatedCount: 1, errors: [] };
    },
    async setTransactionTags() {
      return data.setTransactionTagsResult ?? stubTransaction;
    },
    async updateTransactionNotes(id: string, notes: string) {
      return { id, notes };
    },
    async markTransactionReviewed() {
      return stubTransaction;
    },
    async splitTransaction() {
      return (
        data.splitTransactionResult ?? [
          { id: 'split_1', amount: -6.17 },
          { id: 'split_2', amount: -6.17 },
        ]
      );
    },

    async getCategories() {
      return data.categories ?? [{ id: 'cat_default', name: 'Misc', isSystemCategory: false }];
    },
    async getCategoryGroups() {
      return data.categoryGroups ?? [{ id: 'grp_default', name: 'Expenses', type: 'expense' }];
    },
    async getTags() {
      return data.tags ?? [];
    },

    async getTransactionRules() {
      return data.rules ?? [];
    },

    async getBudgets() {
      return data.budgets ?? [];
    },
    async setBudgetAmount(input) {
      return (
        data.setBudgetResult ?? {
          budgetItemId: 'bi_mock',
          categoryId: input.categoryId,
          amount: input.amount,
          startDate: input.startDate ?? '2026-01-01',
          applyToFuture: input.applyToFuture ?? false,
        }
      );
    },
  };
}
