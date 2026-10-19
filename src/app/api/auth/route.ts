import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // Verify password (defaults to 'autopartner2026' if not set)
    const expectedPassword = user.password || "autopartner2026";
    if (cleanPassword !== expectedPassword) {
      return NextResponse.json(
        { error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === "DISABLED") {
      return NextResponse.json(
        { error: "Ce compte a été désactivé par l'administrateur. Veuillez contacter le Super Admin." },
        { status: 403 }
      );
    }

    // Return safe user profile
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      status: user.status,
      permissions: user.permissions,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    // Set auth cookie
    response.cookies.set("apflow_user_id", user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Accessible from client-side state
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get("apflow_user_id")?.value;
    const urlUserId = req.nextUrl.searchParams.get("userId");
    const targetId = userIdCookie || urlUserId;

    if (!targetId) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!user || user.status === "DISABLED") {
      const response = NextResponse.json({ user: null });
      response.cookies.delete("apflow_user_id");
      return response;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        status: user.status,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Auth GET error:", error);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("apflow_user_id");
  return response;
}
