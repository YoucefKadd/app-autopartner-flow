import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const photos = await prisma.clientPhoto.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(photos);
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json({ error: "Erreur chargement photos" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { label, category, url, note, sizeKb, originalSizeKb, format } = body;

    if (!url) {
      return NextResponse.json({ error: "Image URL manquante" }, { status: 400 });
    }

    const photo = await prisma.clientPhoto.create({
      data: {
        clientId: id,
        label: label || "Photo de livraison",
        category: category || "AUTRE",
        url,
        note: note || "",
        sizeKb: sizeKb || 0,
        originalSizeKb: originalSizeKb || 0,
        format: format || "JPG",
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Create photo error:", error);
    return NextResponse.json({ error: "Erreur enregistrement photo" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await context.params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "ID de photo requis" }, { status: 400 });
    }

    await prisma.clientPhoto.deleteMany({
      where: { id: photoId, clientId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json({ error: "Erreur suppression photo" }, { status: 500 });
  }
}
