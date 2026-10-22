import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssignedManagerIds, encodeAssignedManagerIds } from "@/types/kam";
import { ensureSeeded } from "@/lib/seed";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const requestedKamId = searchParams.get("kamId");
    const sessionUserId = searchParams.get("sessionUserId");

    // Fetch all users including manager and team relationships
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        kams: { select: { id: true, name: true, email: true } },
        _count: {
          select: { clients: true, notes: true, kams: true },
        },
      },
    });

    // Identify who is logged in
    const loggedUser = users.find((u) => u.id === sessionUserId) || users.find((u) => u.role === "KAM") || users[0];

    // If loggedUser is disabled, reject
    if (loggedUser && loggedUser.status === "DISABLED") {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    let activeUser = loggedUser;
    let whereClause: any = {};

    // Scope data strictly based on role:
    if (loggedUser.role === "KAM") {
      // STRICT ISOLATION: A KAM can NEVER see data other than their own!
      activeUser = loggedUser;
      whereClause = { kamId: loggedUser.id };
    } else if (loggedUser.role === "MANAGER") {
      // MANAGER: has visibility over their assigned team of KAMs + their own clients
      const managedKamIds = users
        .filter((u) => getAssignedManagerIds(u as any).includes(loggedUser.id))
        .map((u) => u.id);
      const allowedIds = [loggedUser.id, ...managedKamIds];

      if (requestedKamId && requestedKamId !== "ALL") {
        if (allowedIds.includes(requestedKamId)) {
          const target = users.find((u) => u.id === requestedKamId);
          activeUser = target || loggedUser;
          whereClause = { kamId: activeUser.id };
        } else {
          // If trying to access non-managed KAM, default to manager's team
          activeUser = loggedUser;
          whereClause = { kamId: { in: allowedIds } };
        }
      } else {
        // View all assigned KAMs + manager's portfolio
        activeUser = loggedUser;
        whereClause = { kamId: { in: allowedIds } };
      }
    } else if (loggedUser.role === "DIRECTEUR" || loggedUser.role === "SUPER_ADMIN") {
      // DIRECTEUR & SUPER ADMIN: Full supervision over all KAMs, Managers & global stats
      if (requestedKamId && requestedKamId !== "ALL") {
        const target = users.find((u) => u.id === requestedKamId);
        if (target) {
          activeUser = target;
          whereClause = { kamId: target.id };
        } else {
          whereClause = {};
        }
      } else {
        whereClause = {};
      }
    }

    // NOTES ARE STRICTLY CONFIDENTIAL & PERSONAL:
    // "les directeur et manager ne doivent pas avoir accès aux notes des autres et des KAM"
    // Each user (whether KAM, Manager, or Director) strictly views only their own created notes.
    const notesWhere = { kamId: loggedUser.id };

    const [clients, notes, tasks] = await Promise.all([
      prisma.client.findMany({
        where: whereClause,
        include: {
          kam: { select: { id: true, name: true, email: true } },
          _count: {
            select: { notes: true, tasks: true },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.note.findMany({
        where: notesWhere,
        include: {
          client: {
            select: { id: true, company: true, contactName: true, status: true },
          },
          kam: { select: { id: true, name: true } },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      }),
      prisma.task.findMany({
        where: whereClause,
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
      }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        status: u.status,
        permissions: u.permissions,
        managerId: u.managerId,
        managerIds: getAssignedManagerIds(u as any),
        manager: u.manager,
        kams: u.kams,
        _count: u._count,
      })),
      loggedUser: {
        id: loggedUser.id,
        name: loggedUser.name,
        email: loggedUser.email,
        role: loggedUser.role,
        title: loggedUser.title,
        status: loggedUser.status,
        permissions: loggedUser.permissions,
        managerId: loggedUser.managerId,
        managerIds: getAssignedManagerIds(loggedUser as any),
        manager: loggedUser.manager,
        kams: loggedUser.kams,
      },
      activeUser: {
        id: activeUser.id,
        name: activeUser.name,
        email: activeUser.email,
        role: activeUser.role,
        title: activeUser.title,
        status: activeUser.status,
        permissions: activeUser.permissions,
        managerId: activeUser.managerId,
        managerIds: getAssignedManagerIds(activeUser as any),
        manager: activeUser.manager,
        kams: activeUser.kams,
      },
      clients,
      notes,
      tasks,
    });
  } catch (error) {
    console.error("Workspace GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de l'espace KAM" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, title, role, permissions, managerId, managerIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Le nom est obligatoire" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    // Generate clean slug from name if email is omitted
    const slug = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");

    const finalEmail =
      email && email.trim()
        ? email.trim().toLowerCase()
        : `${slug || "kam"}.${Date.now().toString().slice(-4)}@autopartner.fr`;

    const defaultTitle =
      role === "SUPER_ADMIN"
        ? "Super Administrateur"
        : role === "DIRECTEUR"
        ? "Directeur de Réseau"
        : role === "MANAGER"
        ? "Manager d'Équipe KAM"
        : "Key Account Manager";

    const allManagerIds: string[] = Array.isArray(managerIds)
      ? managerIds.filter(Boolean)
      : managerId
      ? [managerId]
      : [];
    const primaryManagerId = allManagerIds[0] || null;
    const finalPermissions = encodeAssignedManagerIds(
      permissions || "view_clients,edit_clients,view_ca,add_notes,add_visits",
      allManagerIds
    );

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: finalEmail,
        password: password?.trim() || "autopartner2026",
        title: title || defaultTitle,
        role: role || "KAM",
        status: "ACTIVE",
        permissions: finalPermissions,
        managerId: primaryManagerId,
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Create User error:", error);
    return NextResponse.json(
      { error: "Impossible de créer ce compte (l'adresse email existe peut-être déjà)" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, password, title, role, status, permissions, managerId, managerIds, avatar } = body;

    if (!id) {
      return NextResponse.json({ error: "Identifiant utilisateur manquant" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (password !== undefined && password.trim().length > 0) updateData.password = password.trim();
    if (title !== undefined) updateData.title = title;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (managerIds !== undefined) {
      const validIds: string[] = Array.isArray(managerIds) ? managerIds.filter(Boolean) : [];
      updateData.managerId = validIds[0] || null;
      updateData.permissions = encodeAssignedManagerIds(
        permissions !== undefined ? permissions : existingUser.permissions,
        validIds
      );
    } else {
      if (permissions !== undefined) updateData.permissions = permissions;
      if (managerId !== undefined) updateData.managerId = managerId || null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update User error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Identifiant utilisateur requis" }, { status: 400 });
    }

    // Check if user is Super Admin
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Impossible de supprimer le Super Admin principal." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer ce compte" },
      { status: 500 }
    );
  }
}
