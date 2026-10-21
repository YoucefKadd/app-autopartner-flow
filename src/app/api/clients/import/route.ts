import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ImportClientPayload {
  company: string;
  city?: string;
  address?: string;
  postalCode?: string;
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

    // Retrieve all existing users to match by commercial name
    const allUsers = await prisma.user.findMany();

    // Retrieve all existing clients to perform deduplication
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
      const trimmedApCode = (item.apClientNumber || "").trim();
      const trimmedCity = (item.city || "").trim();
      const trimmedAddress = (item.address || "").trim();
      const trimmedPostalCode = (item.postalCode || "").trim();
      const trimmedPhone = (item.phone || "").trim();
      const trimmedEmail = (item.email || "").trim();

      // Normalize status: "actif" -> "ACTIVE", "inactif" -> "INACTIVE", etc.
      let normalizedStatus = "ACTIVE";
      if (item.status) {
        const s = item.status.trim().toLowerCase();
        if (s.includes("inactif") || s.includes("inactive")) {
          normalizedStatus = "INACTIVE";
        } else if (s.includes("vip")) {
          normalizedStatus = "VIP";
        } else if (s.includes("prospect")) {
          normalizedStatus = "PROSPECT";
        } else if (s.includes("nouveau") || s.includes("new")) {
          normalizedStatus = "NEW";
        } else if (s.includes("relance") || s.includes("follow")) {
          normalizedStatus = "FOLLOW_UP";
        } else if (s.includes("archive")) {
          normalizedStatus = "ARCHIVED";
        } else {
          normalizedStatus = "ACTIVE";
        }
      }

      // 1. STRICT DEDUPLICATION BY CODE AP (Priorité absolue demandée par l'utilisateur)
      let existing = trimmedApCode
        ? existingClients.find(
            (c) =>
              c.apClientNumber &&
              c.apClientNumber.trim().toLowerCase() === trimmedApCode.toLowerCase()
          )
        : null;

      // 2. Secondary deduplication by exact Company name (if Code AP wasn't provided or didn't match)
      if (!existing) {
        existing = existingClients.find(
          (c) => c.company.toLowerCase() === trimmedCompany.toLowerCase()
        );
      }

      // 3. Fallback deduplication by Company + City
      if (!existing && trimmedCity) {
        existing = existingClients.find(
          (c) =>
            c.city.toLowerCase() === trimmedCity.toLowerCase() &&
            (c.company.toLowerCase().includes(trimmedCompany.toLowerCase()) ||
              trimmedCompany.toLowerCase().includes(c.company.toLowerCase()))
        );
      }

      // Determine KAM
      let assignedKamId = defaultKam.id;
      if (!targetKamId && item.kamName) {
        const foundUser = allUsers.find(
          (u) =>
            u.name.toLowerCase().includes(item.kamName!.toLowerCase()) ||
            item.kamName!.toLowerCase().includes(u.name.toLowerCase())
        );
        if (foundUser) assignedKamId = foundUser.id;
      }

      let clientId = "";

      if (existing) {
        // UPDATE EXISTING CLIENT (NO DUPLICATE CREATION!)
        const updated = await prisma.client.update({
          where: { id: existing.id },
          data: {
            company: trimmedCompany || existing.company,
            apClientNumber: trimmedApCode || existing.apClientNumber,
            address: trimmedAddress || existing.address,
            postalCode: trimmedPostalCode || existing.postalCode,
            city: trimmedCity || existing.city,
            contactName: item.contactName || existing.contactName,
            email: trimmedEmail || existing.email,
            phone: trimmedPhone || existing.phone,
            status: item.status ? normalizedStatus : existing.status,
            ...(targetKamId ? { kamId: targetKamId } : {}),
          },
        });

        clientId = updated.id;
        results.push({
          id: updated.id,
          company: updated.company,
          isNew: false,
          apClientNumber: updated.apClientNumber || undefined,
          vatNumber: item.vatNumber,
          turnovers: item.turnovers,
        });
      } else {
        // CREATE NEW CLIENT
        const created = await prisma.client.create({
          data: {
            company: trimmedCompany,
            apClientNumber: trimmedApCode || null,
            address: trimmedAddress || null,
            postalCode: trimmedPostalCode || null,
            city: trimmedCity || "France",
            contactName: item.contactName || "Contact Comptoir",
            position: item.position || "Responsable Magasin",
            email: trimmedEmail,
            phone: trimmedPhone,
            status: normalizedStatus,
            healthScore: 85,
            kamId: assignedKamId,
          },
        });

        // Add to existing clients in memory for subsequent rows in this same batch
        existingClients.push(created as any);
        clientId = created.id;

        results.push({
          id: created.id,
          company: created.company,
          isNew: true,
          apClientNumber: created.apClientNumber || undefined,
          vatNumber: item.vatNumber,
          turnovers: item.turnovers,
        });
      }

      // 4. If turnovers (CA / AX) are included, upsert directly into MySQL Turnover table
      if (item.turnovers && Array.isArray(item.turnovers) && clientId) {
        for (const t of item.turnovers) {
          if (t.year && t.month !== undefined) {
            await prisma.turnover.upsert({
              where: {
                clientId_year_month: {
                  clientId,
                  year: Number(t.year),
                  month: Number(t.month),
                },
              },
              create: {
                clientId,
                year: Number(t.year),
                month: Number(t.month),
                amount: Number(t.amount) || 0,
                ordersCount: Number(t.ordersCount) || 0,
              },
              update: {
                amount: Number(t.amount) || 0,
                ordersCount: Number(t.ordersCount) || 0,
              },
            }).catch(() => {});
          }
        }
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
