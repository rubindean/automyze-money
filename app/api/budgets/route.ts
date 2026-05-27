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

export async function POST(request: Request) {
  const body = await request.json();

  const category = String(body.category || "").trim();
  const amount = Number(body.amount || 0);

  if (!category || amount <= 0) {
    return NextResponse.json(
      { error: "Category and amount are required." },
      { status: 400 }
    );
  }

  const budget = await prisma.budget.upsert({
    where: {
      category,
    },
    update: {
      amount,
    },
    create: {
      category,
      amount,
    },
  });

  return NextResponse.json(budget);
}

export async function DELETE(request: Request) {
  const body = await request.json();

  const category = String(body.category || "").trim();

  if (!category) {
    return NextResponse.json(
      { error: "Category is required." },
      { status: 400 }
    );
  }

  await prisma.budget.deleteMany({
    where: {
      category,
    },
  });

  return NextResponse.json({
    success: true,
    category,
  });
}