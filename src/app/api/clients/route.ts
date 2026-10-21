import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company,
      contactName,
      position,
      email,
      phone,
      city,
      status,
      healthScore,
      lastContactAt,
      kamId,
      logo,
    } = body;

    if (!company || !contactName || !kamId) {
      return NextResponse.json(
        { error: "Entreprise, nom du contact et KAM sont obligatoires" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        company,
        contactName,
        position: position || "Contact Principal",
        email: email || "",
        phone: phone || "",
        city: city || "",
        status: status || "ACTIVE",
        healthScore: typeof healthScore === "number" ? healthScore : 85,
        lastContactAt: lastContactAt ? new Date(lastContactAt) : new Date(),
        kamId,
        logo: logo || null,
      },
      include: {
        notes: true,
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du client" },
      { status: 500 }
    );
  }
}
