import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kamId = searchParams.get("kamId");
    const clientId = searchParams.get("clientId");

    const where: any = {};
    if (kamId && kamId !== "ALL") {
      where.kamId = kamId;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    const tasks = await prisma.task.findMany({
      where,
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
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des tâches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      status,
      category,
      priority,
      dueDate,
      dueTime,
      checklist,
      clientId,
      kamId,
    } = body;

    if (!title || !title.trim() || !kamId) {
      return NextResponse.json(
        { error: "Le titre de la tâche est requis" },
        { status: 400 }
      );
    }

    const checklistStr =
      typeof checklist === "string"
        ? checklist
        : Array.isArray(checklist)
        ? JSON.stringify(checklist)
        : null;

    const finalStatus = status || "TODO";

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: finalStatus,
        category: category || "COMMERCIAL",
        priority: Boolean(priority),
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        checklist: checklistStr,
        clientId: clientId || null,
        kamId,
        completedAt: finalStatus === "DONE" ? new Date() : null,
      },
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

    return NextResponse.json(task);
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la tâche" },
      { status: 500 }
    );
  }
}
