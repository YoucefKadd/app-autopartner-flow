import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, category, clientId, pinned, kamId, updateLastContact } =
      body;

    if (!content || !kamId) {
      return NextResponse.json(
        { error: "Le contenu de la note est requis" },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        category: category || "LIBRE",
        pinned: Boolean(pinned),
        clientId: clientId || null,
        kamId,
      },
      include: {
        client: {
          select: { id: true, company: true, contactName: true, status: true },
        },
        kam: { select: { id: true, name: true } },
      },
    });

    // Optionally touch client's lastContactAt when adding a note for that client
    if (clientId && updateLastContact !== false) {
      await prisma.client.update({
        where: { id: clientId },
        data: { lastContactAt: new Date() },
      });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Create note error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la note" },
      { status: 500 }
    );
  }
}
