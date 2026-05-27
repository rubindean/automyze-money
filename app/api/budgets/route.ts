import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { id: "1", category: "Groceries", amount: 8000 },
    { id: "2", category: "Takeaways", amount: 2500 },
    { id: "3", category: "Coffee", amount: 1200 },
    { id: "4", category: "Investments", amount: 2000 },
  ]);
}