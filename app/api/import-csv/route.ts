import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

type CsvRow = {
  date?: string;
  bank?: string;
  merchant?: string;
  category?: string;
  allocation?: string;
  amount?: string;
  direction?: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const csvText = await file.text();

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data.filter((row) => row.date && row.amount);

    for (const row of rows) {
      await prisma.transaction.create({
        data: {
          date: new Date(String(row.date)),
          bank: row.bank || "Unknown",
          merchant: row.merchant || "Unknown",
          category: row.category || "Needs Review",
          allocation: row.allocation || "",
          amount: Number(row.amount || 0),
          direction: row.direction || "Out",
          reconciled: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
      message: `${rows.length} transactions imported.`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not import CSV." }, { status: 500 });
  }
}