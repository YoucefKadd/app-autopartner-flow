import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        kam: { select: { id: true, name: true, email: true } },
        photos: { orderBy: { createdAt: "desc" } },
        turnovers: { orderBy: [{ year: "desc" }, { month: "asc" }] },
        notes: {
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        },
        _count: { select: { notes: true } },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Get single client error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement du client" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.company !== undefined) updateData.company = body.company;
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.apClientNumber !== undefined) updateData.apClientNumber = body.apClientNumber;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.healthScore !== undefined)
      updateData.healthScore = Number(body.healthScore);
    if (body.lastContactAt !== undefined)
      updateData.lastContactAt = new Date(body.lastContactAt);

    const updated = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        photos: { orderBy: { createdAt: "desc" } },
        turnovers: { orderBy: [{ year: "desc" }, { month: "asc" }] },
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.client.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du client" },
      { status: 500 }
    );
  }
}
