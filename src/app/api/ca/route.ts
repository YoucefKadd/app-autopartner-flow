import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const clientIdParam = searchParams.get("clientId");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const where: any = { year };
    if (clientIdParam) {
      where.clientId = clientIdParam;
    }

    const turnovers = await prisma.turnover.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            company: true,
            city: true,
            apClientNumber: true,
            status: true,
            kamId: true,
          },
        },
      },
      orderBy: [{ month: "asc" }],
    });

    // Compute aggregates without any fake data
    const totalAmount = turnovers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalAx = turnovers.reduce((sum, t) => sum + (t.axPurchases || 0), 0);
    const totalTarget = turnovers.reduce((sum, t) => sum + (t.target || 0), 0);
    const totalOrders = turnovers.reduce((sum, t) => sum + (t.ordersCount || 0), 0);

    return NextResponse.json({
      year,
      totalAmount,
      totalAx,
      totalTarget,
      totalOrders,
      turnovers,
    });
  } catch (error) {
    console.error("Get CA error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de CA" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, year, month, amount, axPurchases, ordersCount, target } = body;

    if (!clientId || !year || month === undefined) {
      return NextResponse.json(
        { error: "clientId, year et month sont requis" },
        { status: 400 }
      );
    }

    const turnover = await prisma.turnover.upsert({
      where: {
        clientId_year_month: {
          clientId,
          year: Number(year),
          month: Number(month),
        },
      },
      create: {
        clientId,
        year: Number(year),
        month: Number(month),
        amount: Number(amount) || 0,
        axPurchases: axPurchases !== undefined ? Number(axPurchases) : 0,
        ordersCount: ordersCount !== undefined ? Number(ordersCount) : 0,
        target: target !== undefined ? Number(target) : 0,
      },
      update: {
        amount: amount !== undefined ? Number(amount) : undefined,
        axPurchases: axPurchases !== undefined ? Number(axPurchases) : undefined,
        ordersCount: ordersCount !== undefined ? Number(ordersCount) : undefined,
        target: target !== undefined ? Number(target) : undefined,
      },
    });

    return NextResponse.json(turnover);
  } catch (error) {
    console.error("Save CA error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du CA" },
      { status: 500 }
    );
  }
}
