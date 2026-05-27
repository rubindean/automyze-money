import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const budgets = await prisma.budget.findMany({
    orderBy: {
      category: "asc",
    },
  });

  return NextResponse.json(budgets);
}