import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (clientId) {
      const photos = await prisma.clientPhoto.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(photos);
    }

    // Return all photos
    const allPhotos = await prisma.clientPhoto.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(allPhotos);
  } catch (error) {
    console.error("Photos GET error:", error);
    return NextResponse.json({ error: "Erreur chargement photos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, label, category, url, note, sizeKb, originalSizeKb, format } = body;

    if (!clientId || !url) {
      return NextResponse.json({ error: "clientId et url requis" }, { status: 400 });
    }

    const photo = await prisma.clientPhoto.create({
      data: {
        clientId,
        label: label || "Photo de livraison",
        category: category || "AUTRE",
        url,
        note: note || "",
        sizeKb: Number(sizeKb) || 0,
        originalSizeKb: Number(originalSizeKb) || 0,
        format: format || "JPG",
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Photos POST error:", error);
    return NextResponse.json({ error: "Erreur enregistrement photo" }, { status: 500 });
  }
}
