import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title?.trim() || null;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.pinned !== undefined) updateData.pinned = Boolean(body.pinned);
    if (body.clientId !== undefined)
      updateData.clientId = body.clientId || null;

    const updated = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, company: true, contactName: true, status: true },
        },
        kam: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la note" },
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
    await prisma.note.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la note" },
      { status: 500 }
    );
  }
}
