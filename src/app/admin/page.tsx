"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { SuperAdminTab } from "@/components/SuperAdminTab";

export default function AdminRoutePage() {
  const router = useRouter();
  const { users, activeUser, loading, switchKam, refreshWorkspace } =
    useWorkspace();

  if (loading || !activeUser) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement des comptes Key Account Manager...
      </div>
    );
  }

  return (
    <div className="w-full">
      <SuperAdminTab
        users={users}
        activeUser={activeUser}
        onSelectKam={(kamId) => {
          switchKam(kamId);
          router.push("/clients");
        }}
        onRefresh={() => refreshWorkspace(activeUser.id)}
      />
    </div>
  );
}
