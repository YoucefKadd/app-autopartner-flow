import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ImportCaRow {
  apClientNumber?: string;
  company?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  year: number;
  month: number;
  amount?: number;
  axPurchases?: number;
  ordersCount?: number;
  target?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows, targetKamId } = body as { rows: ImportCaRow[]; targetKamId?: string };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne de CA / AX à importer" },
        { status: 400 }
      );
    }

    // Load all clients from DB for matching
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        company: true,
        apClientNumber: true,
        address: true,
        postalCode: true,
        city: true,
        contactName: true,
        email: true,
        phone: true,
      },
    });

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedItems: string[] = [];

    // Retrieve designated KAM for auto-creation (prefer user's targetKamId)
    const assignedKam =
      (targetKamId ? await prisma.user.findUnique({ where: { id: targetKamId } }) : null) ||
      (await prisma.user.findFirst({ where: { role: "KAM" } })) ||
      (await prisma.user.findFirst());

    for (const row of rows) {
      const cleanAp = (row.apClientNumber || "").trim().toLowerCase();
      const numericAp = cleanAp.replace(/^0+/, "");
      const cleanCompany = (row.company || "").trim().toLowerCase();

      // 1. Match by Code AP (exact or without leading zeros)
      let matchedClient = cleanAp
        ? clients.find((c) => {
            if (!c.apClientNumber) return false;
            const cClean = c.apClientNumber.trim().toLowerCase();
            return cClean === cleanAp || (numericAp && cClean.replace(/^0+/, "") === numericAp);
          })
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

      // 3. If client does not exist yet in DB, auto-create it so NO client from CA or AX is lost!
      if (!matchedClient && (cleanAp || cleanCompany) && assignedKam) {
        try {
          const clientCompany = (
            row.company && !row.company.startsWith("Client AP")
              ? row.company
              : row.apClientNumber
              ? `Client AP ${row.apClientNumber}`
              : "Nouveau Client Importé"
          ).trim();

          const createdClient = await prisma.client.create({
            data: {
              company: clientCompany,
              apClientNumber: row.apClientNumber ? row.apClientNumber.trim() : null,
              address: row.address ? row.address.trim() : null,
              postalCode: row.postalCode ? row.postalCode.trim() : null,
              city: row.city && row.city.trim() ? row.city.trim() : "France",
              contactName: row.contactName ? row.contactName.trim() : "Contact Comptoir",
              email: row.email
                ? row.email.trim().toLowerCase()
                : `contact.${cleanAp || Date.now() + Math.random().toString(36).substring(7)}@client.autopartner.fr`,
              phone: row.phone ? row.phone.trim() : "Non renseigné",
              position: "Gérant / Responsable",
              status: "ACTIVE",
              kamId: assignedKam.id,
            },
          });
          matchedClient = createdClient;
          clients.push(createdClient);
        } catch (createErr) {
          console.error("Failed to auto-create client:", createErr);
        }
      }

      if (!matchedClient) {
        unmatchedCount++;
        unmatchedItems.push(row.apClientNumber || row.company || "Ligne sans identifiant");
        continue;
      }

      // Update client address / contact info if new data is provided
      const clientUpdate: any = {};
      if (row.address && !matchedClient.address) clientUpdate.address = row.address.trim();
      if (row.postalCode && !matchedClient.postalCode) clientUpdate.postalCode = row.postalCode.trim();
      if (row.city && (!matchedClient.city || matchedClient.city === "France")) clientUpdate.city = row.city.trim();
      if (row.contactName && (!matchedClient.contactName || matchedClient.contactName === "Contact Comptoir")) clientUpdate.contactName = row.contactName.trim();
      if (row.email && (!matchedClient.email || matchedClient.email.includes("@client.autopartner.fr"))) clientUpdate.email = row.email.trim();
      if (row.phone && (!matchedClient.phone || matchedClient.phone === "Non renseigné")) clientUpdate.phone = row.phone.trim();

      if (Object.keys(clientUpdate).length > 0) {
        await prisma.client.update({
          where: { id: matchedClient.id },
          data: clientUpdate,
        }).catch(() => {});
      }

      const year = Number(row.year) || new Date().getFullYear();
      const month = Number(row.month) || 0; // 0 represents annual total

      const createData: any = {
        clientId: matchedClient.id,
        year,
        month,
        amount: row.amount !== undefined ? Number(row.amount) || 0 : 0,
        axPurchases: row.axPurchases !== undefined ? Number(row.axPurchases) || 0 : 0,
        ordersCount: row.ordersCount !== undefined ? Number(row.ordersCount) || 0 : 0,
        target: row.target !== undefined ? Number(row.target) || 0 : 0,
      };

      const updateData: any = {};
      if (row.amount !== undefined) {
        updateData.amount = Number(row.amount) || 0;
      }
      if (row.axPurchases !== undefined) {
        updateData.axPurchases = Number(row.axPurchases) || 0;
      }
      if (row.ordersCount !== undefined) {
        updateData.ordersCount = Number(row.ordersCount) || 0;
      }
      if (row.target !== undefined) {
        updateData.target = Number(row.target) || 0;
      }

      await prisma.turnover.upsert({
        where: {
          clientId_year_month: {
            clientId: matchedClient.id,
            year,
            month,
          },
        },
        create: createData,
        update: updateData,
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
