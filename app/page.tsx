// New file contents start here
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiBudget, ApiTransaction } from "./types";

type Transaction = {
  id: string;
  date: string;
  bank: string;
  merchant: string;
  category: string;
  allocation: string;
  amount: number;
  reconciled: boolean;
};

const initialTransactions: Transaction[] = [
  {
    id: "1",
    date: "2026-05-26",
    bank: "Woolworths Credit Card",
    merchant: "Woolworths",
    category: "Groceries",
    allocation: "Personal",
    amount: 1250,
    reconciled: true,
  },
  {
    id: "2",
    date: "2026-05-25",
    bank: "Discovery Credit Card",
    merchant: "Uber Eats",
    category: "Takeaways",
    allocation: "Personal",
    amount: 320,
    reconciled: true,
  },
  {
    id: "3",
    date: "2026-05-25",
    bank: "Discovery Bank",
    merchant: "Discovery Investment",
    category: "Investments",
    allocation: "Investment / Savings",
    amount: 807,
    reconciled: false,
  },
  {
    id: "4",
    date: "2026-05-24",
    bank: "Woolworths Credit Card",
    merchant: "Seattle Coffee",
    category: "Coffee",
    allocation: "Business Expense - Will be Reimbursed",
    amount: 68,
    reconciled: false,
  },
];

const initialBudget = [
  { category: "Groceries", budget: 8000 },
  { category: "Takeaways", budget: 2500 },
  { category: "Coffee", budget: 1200 },
  { category: "Investments", budget: 2000 },
];

const tabs = [
  "Dashboard",
  "Budget",
  "Needs Review",
  "Reconcile",
  "All Transactions",
] as const;

type Tab = (typeof tabs)[number];

function convertApiTransaction(transaction: ApiTransaction): Transaction {
  return {
    id: transaction.id,
    date: transaction.date.split("T")[0],
    bank: transaction.bank,
    merchant: transaction.merchant,
    category: transaction.category,
    allocation: transaction.allocation || "",
    amount: transaction.amount,
    reconciled: transaction.reconciled,
  };
}

function formatMoney(amount: number) {
  return "R" + amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(dateText: string) {
  return new Date(dateText + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

function getQuickDateRange(type: "thisMonth" | "lastMonth" | "thisYear") {
  const today = new Date();

  if (type === "thisMonth") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  }

  if (type === "lastMonth") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
  }

  return {
    start: new Date(today.getFullYear(), 0, 1),
    end: new Date(today.getFullYear(), 11, 31),
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [budget, setBudget] = useState(initialBudget);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountFilter, setAccountFilter] = useState("All Accounts");
  const [newBudgetCategory, setNewBudgetCategory] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");

  useEffect(() => {
    async function loadDatabaseData() {
      try {
        const [transactionsResponse, budgetsResponse] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/budgets"),
        ]);

        if (!transactionsResponse.ok || !budgetsResponse.ok) {
          throw new Error("Could not load database data.");
        }

        const apiTransactions: ApiTransaction[] = await transactionsResponse.json();
        const apiBudgets: ApiBudget[] = await budgetsResponse.json();

        setTransactions(apiTransactions.map(convertApiTransaction));
        setBudget(
          apiBudgets.map((item) => ({
            category: item.category,
            budget: item.amount,
          }))
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDatabaseData();
  }, []);

  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date + "T00:00:00");
      const startDate = fromDate ? new Date(fromDate + "T00:00:00") : null;
      const endDate = toDate ? new Date(toDate + "T23:59:59") : null;

      if (startDate && transactionDate < startDate) return false;
      if (endDate && transactionDate > endDate) return false;

      if (accountFilter !== "All Accounts" && transaction.bank !== accountFilter) {
        return false;
      }

      return true;
    });
  }, [fromDate, toDate, accountFilter, transactions]);

  const totalSpend = dateFilteredTransactions.reduce((total, transaction) => {
    return total + transaction.amount;
  }, 0);

  const monthlyBudget = budget.reduce((total, item) => {
    return total + item.budget;
  }, 0);

  const budgetRemaining = monthlyBudget - totalSpend;

  const needsReviewTransactions = dateFilteredTransactions.filter((transaction) => {
    return !transaction.reconciled;
  });

  const needsReviewCount = needsReviewTransactions.length;

  const categoryTotals = dateFilteredTransactions.reduce<Record<string, number>>(
    (totals, transaction) => {
      totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
      return totals;
    },
    {}
  );

  const filteredTransactions = useMemo(() => {
    const cleanSearch = search.toLowerCase().trim();

    if (!cleanSearch) return dateFilteredTransactions;

    return dateFilteredTransactions.filter((transaction) => {
      const searchableText = [
        transaction.date,
        transaction.bank,
        transaction.merchant,
        transaction.category,
        transaction.allocation,
        transaction.reconciled ? "reconciled" : "needs review",
        transaction.amount.toString(),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }, [search, dateFilteredTransactions]);

  function setQuickDate(type: "thisMonth" | "lastMonth" | "thisYear") {
    const range = getQuickDateRange(type);
    setFromDate(formatDateInput(range.start));
    setToDate(formatDateInput(range.end));
  }

async function saveBudget() {
  const response = await fetch("/api/budgets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: newBudgetCategory,
      amount: Number(newBudgetAmount),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.error || "Could not save budget.");
    return;
  }

  setBudget((currentBudget) => {
    const existing = currentBudget.find(
      (item) => item.category.toLowerCase() === result.category.toLowerCase()
    );

    if (existing) {
      return currentBudget.map((item) =>
        item.category.toLowerCase() === result.category.toLowerCase()
          ? { category: result.category, budget: result.amount }
          : item
      );
    }

    return [...currentBudget, { category: result.category, budget: result.amount }];
  });

  setNewBudgetCategory("");
  setNewBudgetAmount("");

  alert("Budget saved.");
}

async function deleteBudget(category: string) {
  const confirmed = confirm(`Delete budget category "${category}"?`);

  if (!confirmed) return;

  const response = await fetch("/api/budgets", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category }),
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.error || "Could not delete budget.");
    return;
  }

  setBudget((currentBudget) =>
    currentBudget.filter(
      (item) => item.category.toLowerCase() !== category.toLowerCase()
    )
  );

  alert("Budget deleted.");
}
async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {

  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/import-csv", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "CSV import failed.");
    }

    alert(result.message || "CSV imported.");

    const transactionsResponse = await fetch("/api/transactions");
    const apiTransactions: ApiTransaction[] = await transactionsResponse.json();

    setTransactions(apiTransactions.map(convertApiTransaction));

    event.target.value = "";
  } catch (error) {
    console.error(error);
    alert("CSV upload failed. Check the terminal for details.");
  }
}

  function updateTransactionAllocation(transactionId: string, allocation: string) {
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) => {
        if (transaction.id !== transactionId) return transaction;

        return {
          ...transaction,
          allocation,
        };
      })
    );
  }

async function saveAllAllocations() {
  const updates = needsReviewTransactions.map((transaction) => ({
    id: transaction.id,
    allocation: transaction.allocation || "Unallocated",
  }));

  const response = await fetch("/api/transactions", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ updates }),
  });

  const result = await response.json();

  setTransactions(result.transactions.map(convertApiTransaction));

  alert(`Saved ${result.updated} allocations.`);
}

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
<header className="sticky top-0 z-10 bg-slate-950 px-5 py-5 text-white shadow-lg md:px-8">
  <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-3xl font-bold md:text-4xl">Money Tracker</h1>
      <p className="mt-1 text-sm text-slate-400">Powered by Automyze.ai</p>
    </div>

    <div className="flex gap-3">
      <label className="cursor-pointer rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800">
        Upload CSV
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsvUpload}
        />
      </label>

      <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
        {isLoading ? "Loading DB..." : "Scan Gmail"}
      </button>
    </div>
  </div>
</header>


      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">From Date</label>
              <input
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                type="date"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">To Date</label>
              <input
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                type="date"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">Account</label>
              <select
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                <option>All Accounts</option>
                <option>Woolworths Credit Card</option>
                <option>Discovery Credit Card</option>
                <option>Discovery Bank</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">
                Apply Filter
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setQuickDate("thisMonth")}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDate("lastMonth")}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Last Month
            </button>
            <button
              onClick={() => setQuickDate("thisYear")}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              This Year
            </button>
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clear Dates
            </button>
          </div>
        </section>

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${
                activeTab === tab
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Dashboard" && (
          <DashboardView
            totalSpend={totalSpend}
            transactionsCount={dateFilteredTransactions.length}
            budgetRemaining={budgetRemaining}
            needsReviewCount={needsReviewCount}
            categoryTotals={categoryTotals}
            transactions={dateFilteredTransactions}
          />
        )}

        {activeTab === "Budget" && (
          <BudgetView
            budget={budget}
            categoryTotals={categoryTotals}
            newBudgetCategory={newBudgetCategory}
            setNewBudgetCategory={setNewBudgetCategory}
            newBudgetAmount={newBudgetAmount}
            setNewBudgetAmount={setNewBudgetAmount}
            onSaveBudget={saveBudget}
            onDeleteBudget={deleteBudget}
          />
        )}

        {activeTab === "Needs Review" && (
          <TransactionsView
            title="Needs Review"
            transactions={needsReviewTransactions}
            emptyMessage="Everything has been reviewed 🎉"
          />
        )}

        {activeTab === "Reconcile" && (
          <ReconcileView
            transactions={needsReviewTransactions}
            onAllocationChange={updateTransactionAllocation}
            onSaveAll={saveAllAllocations}
          />
        )}

        {activeTab === "All Transactions" && (
          <AllTransactionsView
            search={search}
            setSearch={setSearch}
            transactions={filteredTransactions}
          />
        )}
      </div>
    </main>
  );
}

function DashboardView({
  totalSpend,
  transactionsCount,
  budgetRemaining,
  needsReviewCount,
  categoryTotals,
  transactions,
}: {
  totalSpend: number;
  transactionsCount: number;
  budgetRemaining: number;
  needsReviewCount: number;
  categoryTotals: Record<string, number>;
  transactions: Transaction[];
}) {
  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total Spend" value={formatMoney(totalSpend)} />
        <StatCard title="Transactions" value={transactionsCount.toString()} />
        <StatCard
          title="Budget Remaining"
          value={formatMoney(budgetRemaining)}
          valueClassName={budgetRemaining < 0 ? "text-red-600" : "text-emerald-600"}
        />
        <StatCard
          title="Needs Review"
          value={needsReviewCount.toString()}
          valueClassName="text-amber-600"
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Spend by Category</h2>
          <CategoryTotals categoryTotals={categoryTotals} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Latest Transactions</h2>
          <CompactTransactionTable transactions={transactions.slice(0, 5)} />
        </div>
      </section>
    </>
  );
}

function BudgetView({
  budget,
  categoryTotals,
  newBudgetCategory,
  setNewBudgetCategory,
  newBudgetAmount,
  setNewBudgetAmount,
  onSaveBudget,
  onDeleteBudget,
}: {
  budget: { category: string; budget: number }[];
  categoryTotals: Record<string, number>;
  newBudgetCategory: string;
  setNewBudgetCategory: (value: string) => void;
  newBudgetAmount: string;
  setNewBudgetAmount: (value: string) => void;
  onSaveBudget: () => void;
  onDeleteBudget: (category: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">Budget vs Actual</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_180px_140px]">
  <input
    value={newBudgetCategory}
    onChange={(event) => setNewBudgetCategory(event.target.value)}
    className="rounded-xl border border-slate-200 px-4 py-3"
    placeholder="Category e.g. Fuel"
  />

  <input
    value={newBudgetAmount}
    onChange={(event) => setNewBudgetAmount(event.target.value)}
    className="rounded-xl border border-slate-200 px-4 py-3"
    placeholder="Amount"
    type="number"
  />

  <button
    onClick={onSaveBudget}
    className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white"
  >
    Save Budget
  </button>
</div>
      <div className="space-y-4">
        {budget.map((item) => {
          const actual = categoryTotals[item.category] || 0;
          const usedPercent = item.budget > 0 ? Math.min((actual / item.budget) * 100, 100) : 0;
          const remaining = item.budget - actual;

          return (
            <div key={item.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{item.category}</span>

                <div className="flex items-center gap-3">
                  <span className={remaining < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                    {formatMoney(remaining)} left
                  </span>

                  <button
                    onClick={() => onDeleteBudget(item.category)}
                    className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-3 rounded-full ${actual > item.budget ? "bg-red-600" : "bg-blue-600"}`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(actual)} of {formatMoney(item.budget)} used
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReconcileView({
  transactions,
  onAllocationChange,
  onSaveAll,
}: {
  transactions: Transaction[];
  onAllocationChange: (transactionId: string, allocation: string) => void;
  onSaveAll: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Reconcile & Allocate</h2>
          <p className="text-sm text-slate-500">Choose allocations, then save all once.</p>
        </div>
        <button
          onClick={onSaveAll}
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          Save All Allocations
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-slate-600">Everything is reconciled 🎉</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-5 md:items-center">
              <div>
                <p className="font-semibold">{transaction.merchant}</p>
                <p className="text-sm text-slate-500">{formatDisplayDate(transaction.date)}</p>
              </div>
              <div className="text-sm text-slate-600">{transaction.bank}</div>
              <div className="font-bold">{formatMoney(transaction.amount)}</div>
              <div className="text-sm text-slate-600">{transaction.category}</div>
              <select
                value={transaction.allocation}
                onChange={(event) => onAllocationChange(transaction.id, event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="">Select allocation</option>
                <option>Personal</option>
                <option>Business Expense</option>
                <option>Business Expense - Will be Reimbursed</option>
                <option>Investment / Savings</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AllTransactionsView({
  search,
  setSearch,
  transactions,
}: {
  search: string;
  setSearch: (value: string) => void;
  transactions: Transaction[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">All Transactions</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 md:w-80"
          placeholder="Search transactions..."
        />
      </div>

      <TransactionTable transactions={transactions} />
    </section>
  );
}

function TransactionsView({
  title,
  transactions,
  emptyMessage,
}: {
  title: string;
  transactions: Transaction[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {transactions.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-slate-600">{emptyMessage}</p>
      ) : (
        <TransactionTable transactions={transactions} />
      )}
    </section>
  );
}

function StatCard({
  title,
  value,
  valueClassName = "",
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h2 className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</h2>
    </div>
  );
}

function CategoryTotals({ categoryTotals }: { categoryTotals: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {Object.entries(categoryTotals).map(([category, amount]) => (
        <div key={category} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
          <span className="font-medium">{category}</span>
          <span className="font-bold">{formatMoney(amount)}</span>
        </div>
      ))}
    </div>
  );
}

function CompactTransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-slate-600">No transactions found.</p>;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 p-4 md:grid-cols-[110px_1fr_130px_120px] md:items-center"
        >
          <div className="text-sm text-slate-500">{formatDisplayDate(transaction.date)}</div>
          <div>
            <p className="font-bold text-slate-950">{transaction.merchant}</p>
            <p className="text-sm text-slate-500">{transaction.bank}</p>
          </div>
          <div className="text-sm font-medium text-slate-700">{transaction.category}</div>
          <div className="font-bold md:text-right">{formatMoney(transaction.amount)}</div>
        </div>
      ))}
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-slate-600">No transactions found.</p>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1100px] w-full">
          <thead>
            <tr className="border-b text-left text-sm text-slate-500">
              <th className="w-[120px] py-3">Date</th>
              <th className="w-[170px]">Bank</th>
              <th className="min-w-[220px]">Merchant</th>
              <th className="w-[150px]">Category</th>
              <th className="min-w-[220px]">Allocation</th>
              <th className="w-[140px] text-right">Amount</th>
              <th className="w-[160px]">Status</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b last:border-b-0">
                <td className="w-[120px] py-4 align-top">{formatDisplayDate(transaction.date)}</td>
                <td className="w-[170px] align-top text-sm text-slate-600">{transaction.bank}</td>
                <td className="min-w-[220px] align-top font-semibold">{transaction.merchant}</td>
                <td className="w-[150px] align-top">{transaction.category}</td>
                <td className="min-w-[220px] align-top">{transaction.allocation}</td>
                <td className="w-[140px] align-top text-right font-bold">{formatMoney(transaction.amount)}</td>
                <td className="w-[160px] align-top">
                  <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${transaction.reconciled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {transaction.reconciled ? "Reconciled" : "Needs Review"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{transaction.merchant}</p>
                <p className="text-sm text-slate-500">{formatDisplayDate(transaction.date)}</p>
                <p className="text-sm text-slate-500">{transaction.bank}</p>
              </div>
              <p className="text-lg font-bold">{formatMoney(transaction.amount)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{transaction.category}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{transaction.allocation}</span>
              <span className={`rounded-full px-3 py-1 ${transaction.reconciled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {transaction.reconciled ? "Reconciled" : "Needs Review"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}