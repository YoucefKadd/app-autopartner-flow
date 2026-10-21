"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Users,
  UserPlus,
  ArrowRight,
  FileText,
  Building2,
  Lock,
  Eye,
  EyeOff,
  UserX,
  CheckCircle2,
  Ban,
  TrendingUp,
  Settings,
  Briefcase,
  Key,
  ShieldAlert,
  Table as TableIcon,
  LayoutGrid,
  Search,
  Check,
  X,
  UserCheck,
  Plus,
} from "lucide-react";
import { KamUser, getInitials, getAssignedManagerIds } from "@/types/kam";

interface SuperAdminTabProps {
  users: KamUser[];
  activeUser: KamUser;
  onSelectKam: (kamId: string) => void;
  onRefresh: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: "view_clients", label: "Clients" },
  { id: "edit_clients", label: "Modif. clients" },
  { id: "view_ca", label: "CA" },
  { id: "add_notes", label: "Notes" },
  { id: "add_visits", label: "Visites" },
];

export function SuperAdminTab({
  users,
  activeUser,
  onSelectKam,
  onRefresh,
}: SuperAdminTabProps) {
  // View mode & search
  const [viewFormat, setViewFormat] = useState<"table" | "cards">("table");
  const [filterQuery, setFilterQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create account modal state (only opens when clicking "+ Ajouter un compte")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("autopartner2026");
  const [role, setRole] = useState<"KAM" | "MANAGER" | "DIRECTEUR" | "SUPER_ADMIN">("KAM");
  const [title, setTitle] = useState("Key Account Manager");
  const [managerId, setManagerId] = useState<string>("");
  const [selectedNewUserManagerIds, setSelectedNewUserManagerIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "view_clients",
    "edit_clients",
    "view_ca",
    "add_notes",
    "add_visits",
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Password reset modal
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updatingUser, setUpdatingUser] = useState(false);

  // Manager attribution modal (for DIRECTEUR / SUPER_ADMIN)
  const [assigningKam, setAssigningKam] = useState<KamUser | null>(null);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [savingAttribution, setSavingAttribution] = useState(false);

  const managersList = users.filter((u) => u.role === "MANAGER" || u.role === "DIRECTEUR" || u.role === "SUPER_ADMIN");

  // Toggle permission checkbox
  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          password: password.trim() || undefined,
          title: title.trim() || undefined,
          role,
          managerId: role === "KAM" && selectedNewUserManagerIds[0] ? selectedNewUserManagerIds[0] : undefined,
          managerIds: role === "KAM" ? selectedNewUserManagerIds : undefined,
          permissions: selectedPermissions.join(","),
        }),
      });
      if (res.ok) {
        setName("");
        setEmail("");
        setPassword("autopartner2026");
        setTitle("Key Account Manager");
        setRole("KAM");
        setManagerId("");
        setSelectedNewUserManagerIds([]);
        setIsCreateModalOpen(false);
        setActionMessage("Nouveau compte créé avec succès !");
        onRefresh();
      } else {
        const err = await res.json();
        setActionMessage(err.error || "Erreur de création du compte.");
      }
    } finally {
      setCreating(false);
    }
  }

  // Toggle Active/Disabled status
  async function handleToggleStatus(userId: string, currentStatus: string) {
    const nextStatus = currentStatus === "DISABLED" ? "ACTIVE" : "DISABLED";
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        setActionMessage(`Statut utilisateur mis à jour (${nextStatus}).`);
        onRefresh();
      }
    } catch {
      setActionMessage("Erreur de mise à jour du statut.");
    }
  }

  // Toggle permission for existing user directly in 1 click
  async function handleToggleUserPermission(user: KamUser, permId: string) {
    const currentList = user.permissions
      ? user.permissions.split(",").map((p) => p.trim()).filter(Boolean)
      : [];
    const nextList = currentList.includes(permId)
      ? currentList.filter((p) => p !== permId)
      : [...currentList, permId];

    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          permissions: nextList.join(","),
        }),
      });
      if (res.ok) {
        setActionMessage(`Autorisations de ${user.name} mises à jour.`);
        onRefresh();
      }
    } catch {
      setActionMessage("Erreur lors de la mise à jour des autorisations.");
    }
  }

  // Reset password
  async function handleUpdatePassword(userId: string) {
    if (!newPassword.trim()) return;
    setUpdatingUser(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          password: newPassword.trim(),
        }),
      });
      if (res.ok) {
        setNewPassword("");
        setEditingUserId(null);
        setActionMessage("Mot de passe mis à jour avec succès !");
        onRefresh();
      }
    } finally {
      setUpdatingUser(false);
    }
  }

  // Save Manager attribution
  async function handleSaveManagerAttribution() {
    if (!assigningKam) return;
    setSavingAttribution(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assigningKam.id,
          managerIds: selectedManagerIds,
        }),
      });
      if (res.ok) {
        setAssigningKam(null);
        setActionMessage("Attribution du Manager mise à jour !");
        onRefresh();
      }
    } finally {
      setSavingAttribution(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Top Banner with Full Width */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Administration & Gouvernance des Équipes
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Gestion des Rôles & Attributions Commerciaux
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-4xl">
            Gestion hiérarchique complète : <strong>KAM</strong> (espace isolé), <strong>MANAGER</strong> (supervision de son équipe de KAMs), <strong>DIRECTEUR</strong> (supervision générale et attribution des KAMs aux managers) et <strong>SUPER ADMIN</strong> (contrôle total des accès).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectKam("ALL")}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition shadow-xs flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Vue Globale Réseau
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Ajouter un compte
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs hover:underline text-emerald-600 dark:text-emerald-400"
          >
            Fermer
          </button>
        </div>
      )}

      {/* FULL-WIDTH ACCOUNTS TABLE SECTION */}
      <div className="space-y-4">
        {/* Controls Bar: Search, Role filter & Table/Cards toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Rechercher par nom, email, titre..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les rôles ({users.length})</option>
              <option value="KAM">KAM Uniquement ({users.filter((u) => u.role === "KAM").length})</option>
              <option value="MANAGER">Managers ({users.filter((u) => u.role === "MANAGER").length})</option>
              <option value="DIRECTEUR">Directeurs ({users.filter((u) => u.role === "DIRECTEUR").length})</option>
              <option value="SUPER_ADMIN">Super Admins ({users.filter((u) => u.role === "SUPER_ADMIN").length})</option>
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-zinc-800 p-1 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewFormat("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewFormat === "table"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tableau Pleine Largeur</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewFormat === "cards"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cartes</span>
            </button>
          </div>
        </div>

        {/* 1. TABLE VIEW (Pleine largeur, lisible et aéré) */}
        {viewFormat === "table" ? (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Utilisateur / Identifiant</th>
                    <th className="py-3.5 px-4">Rôle</th>
                    <th className="py-3.5 px-4">Manager de rattachement</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-center">Portefeuille</th>
                    <th className="py-3.5 px-4">Options & Droits</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {filteredUsers.map((u) => {
                    const isCurrent = u.id === activeUser.id;
                    const isDisabled = u.status === "DISABLED";
                    const userPerms = (u.permissions || "view_clients,edit_clients,view_ca,add_notes,add_visits").split(",");

                    // Find assigned manager name
                    const assignedManagers = managersList.filter((m) => getAssignedManagerIds(u).includes(m.id));

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition group ${
                          isDisabled ? "opacity-60 bg-rose-50/10" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrent && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Session actuellement active" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "SUPER_ADMIN"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                : u.role === "DIRECTEUR"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : u.role === "MANAGER"
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {u.role === "SUPER_ADMIN"
                              ? "Super Admin"
                              : u.role === "DIRECTEUR"
                              ? "Directeur"
                              : u.role === "MANAGER"
                              ? "Manager KAM"
                              : "KAM Dédié"}
                          </span>
                        </td>

                        {/* Manager attribution */}
                        <td className="py-3.5 px-4">
                          {u.role === "KAM" ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assignedManagers.length > 0 ? (
                                assignedManagers.map((m) => (
                                  <span
                                    key={m.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium text-[11px] border border-purple-200/50"
                                  >
                                    <Briefcase className="w-3 h-3 text-purple-500" />
                                    <span>{m.name}</span>
                                    <span className="text-[9px] text-purple-500 font-semibold">
                                      ({m.role === "DIRECTEUR" ? "Dir." : m.role === "SUPER_ADMIN" ? "Admin" : "Mgr"})
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Autonome (Non attribué)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningKam(u);
                                  setSelectedManagerIds(getAssignedManagerIds(u));
                                }}
                                title="Modifier les managers et superviseurs de rattachement"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1 shrink-0"
                              >
                                {assignedManagers.length > 0 ? "Modifier" : "+ Attribuer"}
                              </button>
                            </div>
                          ) : u.role === "MANAGER" || u.role === "DIRECTEUR" ? (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                              <Users className="w-3 h-3 text-purple-500" />
                              <span>{users.filter((k) => k.role === "KAM" && getAssignedManagerIds(k).includes(u.id)).length} KAM sous sa gestion / supervision</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">— Direction —</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDisabled
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-rose-600" : "bg-emerald-600"}`} />
                            {isDisabled ? "DÉSACTIVÉ" : "ACTIF"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1" title="Clients dans ce portefeuille">
                              <Building2 className="w-3.5 h-3.5 text-blue-500" />
                              <strong>{u._count?.clients ?? 0}</strong> clients
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1" title="Notes rédigées">
                              <FileText className="w-3.5 h-3.5 text-amber-500" />
                              <strong>{u._count?.notes ?? 0}</strong>
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {AVAILABLE_PERMISSIONS.map((p) => {
                              const has = userPerms.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleToggleUserPermission(u, p.id)}
                                  title={`Cliquer pour ${has ? "retirer" : "accorder"} l'accès ${p.label}`}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold transition cursor-pointer ${
                                    has
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                                      : "bg-slate-100 dark:bg-zinc-800 text-slate-400 line-through opacity-60 border border-slate-200 dark:border-zinc-700 hover:opacity-100 hover:text-emerald-600 hover:border-emerald-500/30"
                                  }`}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {u.role !== "SUPER_ADMIN" && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                title={isDisabled ? "Réactiver le compte" : "Désactiver le compte"}
                                className={`p-1.5 rounded-lg text-xs transition ${
                                  isDisabled
                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                                }`}
                              >
                                {isDisabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setNewPassword("");
                              }}
                              title="Réinitialiser le mot de passe"
                              className="p-1.5 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectKam(u.id)}
                              title="Inspecter l'espace dédié de ce compte"
                              className="px-2.5 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition flex items-center gap-1 font-semibold shadow-xs"
                            >
                              <span>Ouvrir</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* 2. CARDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((u) => renderUserCard(u))}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE NEW ACCOUNT (Shown ONLY after clicking '+ Ajouter un compte') */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Créer un nouveau compte utilisateur
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Seul le nom complet est obligatoire. Les identifiants et accès sont automatiques.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1.5">
                  Type de Rôle & Niveau d&apos;accès
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("KAM");
                      setTitle("Key Account Manager");
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                      role === "KAM"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    KAM Dédié
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole("MANAGER");
                      setTitle("Manager d'Équipe KAM");
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                      role === "MANAGER"
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Manager
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole("DIRECTEUR");
                      setTitle("Directeur Réseau");
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                      role === "DIRECTEUR"
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Directeur
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole("SUPER_ADMIN");
                      setTitle("Super Administrateur");
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                      role === "SUPER_ADMIN"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Super Admin
                  </button>
                </div>
              </div>

              {/* Name (Only mandatory field) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: David Dupont"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* If KAM: select multiple managers & supervisors */}
              {role === "KAM" && managersList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Managers &amp; Superviseurs de rattachement
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {selectedNewUserManagerIds.length} sélectionné(s)
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl p-2 bg-slate-50 dark:bg-zinc-950">
                    {managersList.map((m) => {
                      const isChecked = selectedNewUserManagerIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedNewUserManagerIds((prev) =>
                                  isChecked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-slate-800 dark:text-zinc-200">{m.name}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {m.role === "SUPER_ADMIN" ? "Super Admin" : m.role === "DIRECTEUR" ? "Directeur" : "Manager"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Email / Identifiant de connexion
                  </label>
                  <span className="text-[10px] text-slate-400">Optionnel (généré si vide)</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Laisser vide pour auto-générer"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Optional Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mot de passe
                  </label>
                  <span className="text-[10px] text-slate-400">Défaut : autopartner2026</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="autopartner2026"
                    className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Options et autorisations accordées :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{creating ? "Création en cours..." : "Créer le compte"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ATTRIBUTE KAM TO MANAGER */}
      {assigningKam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-purple-600" />
              Attribution des Managers &amp; Superviseurs pour {assigningKam.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Sélectionnez un ou plusieurs Managers, Directeurs ou Superviseurs qui auront accès au portefeuille et au suivi de ce KAM.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Responsables assignés ({selectedManagerIds.length}) :
                </span>
                {selectedManagerIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedManagerIds([])}
                    className="text-[11px] text-rose-600 hover:underline font-medium"
                  >
                    Tout désélectionner (Autonome)
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-zinc-800 rounded-xl p-2 bg-slate-50/50 dark:bg-zinc-950/40">
                {managersList.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">Aucun manager ou superviseur configuré.</p>
                ) : (
                  managersList.map((m) => {
                    const isChecked = selectedManagerIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedManagerIds((prev) =>
                                isChecked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                              );
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              <span>{m.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  m.role === "SUPER_ADMIN"
                                    ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                    : m.role === "DIRECTEUR"
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                    : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                                }`}
                              >
                                {m.role === "SUPER_ADMIN" ? "Super Admin" : m.role === "DIRECTEUR" ? "Directeur" : "Manager"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{m.email}</div>
                          </div>
                        </div>
                        {isChecked && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAssigningKam(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingAttribution}
                  onClick={handleSaveManagerAttribution}
                  className="px-4 py-2 text-xs rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {savingAttribution ? "Enregistrement..." : "Confirmer l'attribution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PASSWORD */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-blue-500" />
              Réinitialiser le mot de passe
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Définissez un nouveau mot de passe pour cet utilisateur.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={updatingUser || !newPassword.trim()}
                  onClick={() => handleUpdatePassword(editingUserId)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
                >
                  {updatingUser ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderUserCard(user: KamUser) {
    const isCurrent = user.id === activeUser.id;
    const isDisabled = user.status === "DISABLED";
    const userPerms = (user.permissions || "view_clients,edit_clients,view_ca,add_notes,add_visits").split(",");
    const assignedManagers = managersList.filter((m) => getAssignedManagerIds(user).includes(m.id));

    return (
      <div
        key={user.id}
        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
          isDisabled
            ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 opacity-75"
            : isCurrent
            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm"
            : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                {getInitials(user.name)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {user.name}
                  {isDisabled && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold">
                      DÉSACTIVÉ
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  user.role === "SUPER_ADMIN"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                    : user.role === "DIRECTEUR"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : user.role === "MANAGER"
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                }`}
              >
                {user.role}
              </span>
              {isCurrent && (
                <span className="text-[10px] text-emerald-600 font-medium">
                  ● Session active
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {user.title || (user.role === "SUPER_ADMIN" ? "Super Admin" : "Key Account Manager")}
          </p>

          {/* Assigned Manager Badge */}
          {user.role === "KAM" && (
            <div className="text-[11px] mb-3 flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-zinc-950/40 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
              <span className="text-slate-400">Managers :</span>
              {assignedManagers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {assignedManagers.map((m) => (
                    <span
                      key={m.id}
                      className="font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded text-[10px]"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">Non rattaché</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setAssigningKam(user);
                  setSelectedManagerIds(getAssignedManagerIds(user));
                }}
                className="text-[10px] text-blue-600 hover:underline ml-auto font-semibold"
              >
                {assignedManagers.length > 0 ? "Modifier" : "+ Attribuer"}
              </button>
            </div>
          )}

          {/* User portfolio stats */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 text-xs mb-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>
                <strong>{user._count?.clients ?? 0}</strong> clients
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>
                <strong>{user._count?.notes ?? 0}</strong> notes
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {user.role !== "SUPER_ADMIN" && (
              <button
                type="button"
                onClick={() => handleToggleStatus(user.id, user.status)}
                title={isDisabled ? "Réactiver le compte" : "Désactiver le compte"}
                className={`p-1.5 rounded-lg text-xs transition ${
                  isDisabled
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                }`}
              >
                {isDisabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingUserId(user.id);
                setNewPassword("");
              }}
              title="Changer le mot de passe"
              className="p-1.5 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectKam(user.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Inspecter l&apos;espace
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
}
