import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const kamId = searchParams.get("kamId");

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (kamId && kamId !== "ALL") where.kamId = kamId;

    const visits = await prisma.visit.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        client: {
          select: {
            id: true,
            company: true,
            contactName: true,
            city: true,
            status: true,
            phone: true,
            email: true,
          },
        },
        kam: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            pinned: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ visits });
  } catch (error) {
    console.error("GET /api/visits error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des visites" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      kamId,
      date,
      time,
      type = "ROUTINE",
      status = "EFFECTUEE",
      interlocutor,
      summary,
      nextVisitDate,
      createLinkedNote = false,
      noteTitle,
      noteContent,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Le client est obligatoire" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { error: "La date de visite est obligatoire" },
        { status: 400 }
      );
    }
    if (!summary || !summary.trim()) {
      return NextResponse.json(
        { error: "Le compte-rendu de visite est obligatoire" },
        { status: 400 }
      );
    }

    // Créer la visite en base
    const visit = await prisma.visit.create({
      data: {
        clientId,
        kamId,
        date,
        time: time || null,
        type,
        status,
        interlocutor: interlocutor || null,
        summary: summary.trim(),
        nextVisitDate: nextVisitDate || null,
      },
      include: {
        client: true,
        kam: true,
        notes: true,
      },
    });

    // Mettre à jour lastContactAt du client si effectuée
    if (status === "EFFECTUEE") {
      try {
        await prisma.client.update({
          where: { id: clientId },
          data: { lastContactAt: new Date(date) },
        });
      } catch (e) {
        console.warn("Could not update client lastContactAt:", e);
      }
    }

    // Si l'utilisateur a choisi de lier / créer une note pour cette visite
    if (createLinkedNote) {
      const createdNote = await prisma.note.create({
        data: {
          title: noteTitle || `Visite : ${type}`,
          content: noteContent || summary.trim(),
          category: "VISITE",
          clientId,
          kamId,
          visitId: visit.id,
        },
      });
      return NextResponse.json({ visit, linkedNote: createdNote }, { status: 201 });
    }

    return NextResponse.json({ visit }, { status: 201 });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la visite" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("id");

    if (!visitId) {
      return NextResponse.json(
        { error: "L'identifiant de la visite est obligatoire" },
        { status: 400 }
      );
    }

    await prisma.visit.delete({
      where: { id: visitId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/visits error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la visite" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, date, time, type, status, interlocutor, summary, nextVisitDate } = body;

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant de la visite est obligatoire" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (date !== undefined) data.date = date;
    if (time !== undefined) data.time = time;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (interlocutor !== undefined) data.interlocutor = interlocutor;
    if (summary !== undefined) data.summary = summary;
    if (nextVisitDate !== undefined) data.nextVisitDate = nextVisitDate;

    const updated = await prisma.visit.update({
      where: { id },
      data,
      include: {
        client: true,
        kam: true,
        notes: true,
      },
    });

    return NextResponse.json({ visit: updated });
  } catch (error) {
    console.error("PATCH /api/visits error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la visite" },
      { status: 500 }
    );
  }
}
