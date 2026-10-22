import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined)
      updateData.description = body.description ? body.description.trim() : null;
    if (body.status !== undefined) {
      updateData.status = body.status;
      updateData.completedAt = body.status === "DONE" ? new Date() : null;
    }
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = Boolean(body.priority);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate || null;
    if (body.dueTime !== undefined) updateData.dueTime = body.dueTime || null;
    if (body.clientId !== undefined) updateData.clientId = body.clientId || null;
    if (body.checklist !== undefined) {
      updateData.checklist =
        typeof body.checklist === "string"
          ? body.checklist
          : Array.isArray(body.checklist)
          ? JSON.stringify(body.checklist)
          : null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            company: true,
            contactName: true,
            status: true,
            city: true,
            apClientNumber: true,
          },
        },
        kam: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la tâche" },
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
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la tâche" },
      { status: 500 }
    );
  }
}
