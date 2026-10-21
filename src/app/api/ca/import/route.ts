import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ImportCaRow {
  apClientNumber?: string;
  company?: string;
  year: number;
  month: number;
  amount: number;
  axPurchases?: number;
  ordersCount?: number;
  target?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: ImportCaRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne de CA / AX à importer" },
        { status: 400 }
      );
    }

    // Load all clients from DB for matching
    const clients = await prisma.client.findMany({
      select: { id: true, company: true, apClientNumber: true },
    });

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedItems: string[] = [];

    for (const row of rows) {
      const cleanAp = (row.apClientNumber || "").trim().toLowerCase();
      const cleanCompany = (row.company || "").trim().toLowerCase();

      // 1. Match by Code AP first!
      let matchedClient = cleanAp
        ? clients.find(
            (c) =>
              c.apClientNumber &&
              c.apClientNumber.trim().toLowerCase() === cleanAp
          )
        : null;

      // 2. Fallback to matching by Company name
      if (!matchedClient && cleanCompany) {
        matchedClient = clients.find(
          (c) =>
            c.company.trim().toLowerCase() === cleanCompany ||
            c.company.trim().toLowerCase().includes(cleanCompany) ||
            cleanCompany.includes(c.company.trim().toLowerCase())
        );
      }

      if (!matchedClient) {
        unmatchedCount++;
        unmatchedItems.push(row.apClientNumber || row.company || "Ligne sans identifiant");
        continue;
      }

      const year = Number(row.year) || new Date().getFullYear();
      const month = Number(row.month) || 0; // 0 represents annual total
      const amount = Number(row.amount) || 0;
      const axPurchases = Number(row.axPurchases) || 0;
      const ordersCount = Number(row.ordersCount) || 0;
      const target = Number(row.target) || 0;

      await prisma.turnover.upsert({
        where: {
          clientId_year_month: {
            clientId: matchedClient.id,
            year,
            month,
          },
        },
        create: {
          clientId: matchedClient.id,
          year,
          month,
          amount,
          axPurchases,
          ordersCount,
          target,
        },
        update: {
          amount,
          axPurchases,
          ordersCount,
          target,
        },
      });

      matchedCount++;
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      matchedCount,
      unmatchedCount,
      unmatchedItems: unmatchedItems.slice(0, 10),
    });
  } catch (error) {
    console.error("Import CA & AX error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import du fichier CA / AX" },
      { status: 500 }
    );
  }
}
