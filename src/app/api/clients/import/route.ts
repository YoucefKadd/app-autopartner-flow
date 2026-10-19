import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ImportClientPayload {
  company: string;
  city: string;
  contactName?: string;
  position?: string;
  email?: string;
  phone?: string;
  apClientNumber?: string;
  vatNumber?: string;
  kamName?: string;
  status?: string;
  turnovers?: Array<{
    year: number;
    month: number;
    amount: number;
    ordersCount?: number;
  }>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clients: importedClients, targetKamId } = body as {
      clients: ImportClientPayload[];
      targetKamId?: string;
    };

    if (!Array.isArray(importedClients) || importedClients.length === 0) {
      return NextResponse.json(
        { error: "Aucun client à importer" },
        { status: 400 }
      );
    }

    // Retrieve default KAM
    let defaultKam = targetKamId
      ? await prisma.user.findUnique({ where: { id: targetKamId } })
      : null;

    if (!defaultKam) {
      defaultKam =
        (await prisma.user.findFirst({ where: { role: "KAM" } })) ||
        (await prisma.user.findFirst());
    }

    if (!defaultKam) {
      return NextResponse.json(
        { error: "Aucun utilisateur KAM disponible pour l'affectation" },
        { status: 400 }
      );
    }

    // Retrieve all existing users to match by name if needed
    const allUsers = await prisma.user.findMany();

    // Retrieve existing clients to match duplicates by company name or city
    const existingClients = await prisma.client.findMany();

    const results: Array<{
      id: string;
      company: string;
      isNew: boolean;
      apClientNumber?: string;
      vatNumber?: string;
      turnovers?: any[];
    }> = [];

    for (const item of importedClients) {
      if (!item.company || !item.company.trim()) continue;

      const trimmedCompany = item.company.trim();
      const trimmedCity = (item.city || "").trim();

      // Find if client already exists (case-insensitive fuzzy/exact match)
      const existing = existingClients.find(
        (c) =>
          c.company.toLowerCase() === trimmedCompany.toLowerCase() ||
          (trimmedCity &&
            c.city.toLowerCase() === trimmedCity.toLowerCase() &&
            c.company.toLowerCase().includes(trimmedCompany.toLowerCase()))
      );

      // Determine KAM: if targetKamId was explicitly passed (e.g. current KAM logged in), ALWAYS assign to them!
      let assignedKamId = defaultKam.id;
      if (!targetKamId && item.kamName) {
        const foundUser = allUsers.find(
          (u) =>
            u.name.toLowerCase().includes(item.kamName!.toLowerCase()) ||
            item.kamName!.toLowerCase().includes(u.name.toLowerCase())
        );
        if (foundUser) assignedKamId = foundUser.id;
      }

      if (existing) {
        // Update existing client
        const updated = await prisma.client.update({
          where: { id: existing.id },
          data: {
            city: trimmedCity || existing.city,
            contactName: item.contactName || existing.contactName,
            email: item.email || existing.email,
            phone: item.phone || existing.phone,
            ...(targetKamId ? { kamId: targetKamId } : {}),
          },
        });

        results.push({
          id: updated.id,
          company: updated.company,
          isNew: false,
          apClientNumber: item.apClientNumber,
          vatNumber: item.vatNumber,
          turnovers: item.turnovers,
        });
      } else {
        // Create new client
        const created = await prisma.client.create({
          data: {
            company: trimmedCompany,
            city: trimmedCity || "France",
            contactName: item.contactName || "Contact Comptoir",
            position: item.position || "Responsable Magasin",
            email: item.email || "",
            phone: item.phone || "",
            status: (item.status as any) || "ACTIVE",
            healthScore: 85,
            kamId: assignedKamId,
          },
        });

        results.push({
          id: created.id,
          company: created.company,
          isNew: true,
          apClientNumber: item.apClientNumber,
          vatNumber: item.vatNumber,
          turnovers: item.turnovers,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      createdCount: results.filter((r) => r.isNew).length,
      updatedCount: results.filter((r) => !r.isNew).length,
      clients: results,
    });
  } catch (error) {
    console.error("Batch import error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'import CSV" },
      { status: 500 }
    );
  }
}
