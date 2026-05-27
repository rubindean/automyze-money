

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.categoryRule.deleteMany();
  await prisma.merchantCleanRule.deleteMany();

  await prisma.transaction.createMany({
    data: [
      {
        date: new Date("2026-05-26"),
        bank: "Woolworths Credit Card",
        merchant: "Woolworths",
        category: "Groceries",
        allocation: "Personal",
        amount: 1250,
        direction: "Out",
        reconciled: true,
      },

      {
        date: new Date("2026-05-25"),
        bank: "Discovery Credit Card",
        merchant: "Uber Eats",
        category: "Takeaways",
        allocation: "Personal",
        amount: 320,
        direction: "Out",
        reconciled: true,
      },

      {
        date: new Date("2026-05-25"),
        bank: "Discovery Bank",
        merchant: "Discovery Investment",
        category: "Investments",
        allocation: "Investment / Savings",
        amount: 807,
        direction: "Out",
        reconciled: false,
      },

      {
        date: new Date("2026-05-24"),
        bank: "Woolworths Credit Card",
        merchant: "Seattle Coffee",
        category: "Coffee",
        allocation: "Business Expense - Will be Reimbursed",
        amount: 68,
        direction: "Out",
        reconciled: false,
      },
    ],
  });

  await prisma.budget.createMany({
    data: [
      {
        category: "Groceries",
        amount: 8000,
      },

      {
        category: "Takeaways",
        amount: 2500,
      },

      {
        category: "Coffee",
        amount: 1200,
      },

      {
        category: "Investments",
        amount: 2000,
      },
    ],
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });