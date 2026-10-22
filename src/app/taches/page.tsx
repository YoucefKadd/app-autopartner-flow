"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { useWorkspace } from "@/components/AppShell";
import { TasksTab } from "@/components/TasksTab";

export default function TasksRoutePage() {
  const {
    activeUser,
    clients,
    tasks,
    loading,
    refreshWorkspace,
    openQuickTask,
  } = useWorkspace();

  if (loading || !activeUser) {
    return (
      <div className="p-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement de vos tâches &amp; Kanban...
      </div>
    );
  }

  return (
    <div className="w-full">
      <TasksTab
        tasks={tasks}
        clients={clients}
        activeKamId={activeUser.id}
        onRefresh={() => refreshWorkspace(activeUser.id)}
        onOpenTaskDrawer={(opts) => openQuickTask(opts)}
      />
    </div>
  );
}
