import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json(transactions);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const updates = body.updates as {
      id: string;
      allocation: string;
    }[];

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid updates payload." },
        { status: 400 }
      );
    }

    for (const update of updates) {
      if (!update.id) continue;

      await prisma.transaction.update({
        where: {
          id: update.id,
        },
        data: {
          allocation: update.allocation || "Unallocated",
          reconciled: true,
        },
      });
    }

    const transactions = await prisma.transaction.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      updated: updates.length,
      transactions,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not update transactions." },
      { status: 500 }
    );
  }
}
