"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { stripMarkdown } from "@/components/NoteFormatter";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  ShieldCheck,
  Search,
  Plus,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LogOut,
  MapPin,
  Clock,
  ArrowRight,
  Hash,
  Camera,
  LayoutDashboard,
  CheckSquare,
  Kanban,
  UserPlus,
  Map,
} from "lucide-react";
import { ClientItem, KamUser, NoteItem, TaskItem, TaskStatus, TASK_STATUS_CONFIG, parseTaskChecklist, ClientVisit, getInitials, hasPermission, getAssignedManagerIds } from "@/types/kam";
import { QuickNoteModal } from "@/components/QuickNoteModal";
import { NoteWorkspaceDrawer, NoteDockMode } from "@/components/NoteWorkspaceDrawer";
import { TaskWorkspaceDrawer, TaskDockMode } from "@/components/TaskWorkspaceDrawer";
import { ClientFormModal } from "@/components/ClientFormModal";
import { DatabaseSyncHelper } from "@/components/DatabaseSyncHelper";
import { getAllPortfolioVisits } from "@/lib/visits";

interface WorkspaceContextValue {
  users: KamUser[];
  activeUser: KamUser | null;
  loggedUser: KamUser | null;
  clients: ClientItem[];
  notes: NoteItem[];
  tasks: TaskItem[];
  visits: ClientVisit[];
  loading: boolean;
  globalSearch: string;
  setGlobalSearch: (val: string) => void;
  refreshWorkspace: (kamId?: string) => Promise<void>;
  switchKam: (kamId: string) => void;
  logout: () => void;
  openQuickNote: (options?: {
    clientId?: string | null;
    note?: NoteItem | null;
  }) => void;
  openQuickTask: (options?: {
    clientId?: string | null;
    task?: TaskItem | null;
    defaultStatus?: TaskStatus;
  }) => void;
  openClientModal: (client?: ClientItem | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside AppShell");
  }
  return ctx;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login route, render bare page without navigation shell
  const isLoginPage = pathname === "/login";

  // Theme & Sidebar state
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Data state
  const [users, setUsers] = useState<KamUser[]>([]);
  const [activeUser, setActiveUser] = useState<KamUser | null>(null);
  const [loggedUser, setLoggedUser] = useState<KamUser | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [noteModalClientId, setNoteModalClientId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [noteDockMode, setNoteDockMode] = useState<NoteDockMode>("dock");
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [taskModalClientId, setTaskModalClientId] = useState<string | null>(null);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<TaskStatus>("TODO");
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskDockMode, setTaskDockMode] = useState<TaskDockMode>("dock");

  // Sync dock mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("apflow_notes_dock_mode") as NoteDockMode;
    if (saved && (saved === "dock" || saved === "split" || saved === "floating")) {
      setNoteDockMode(saved);
    }
  }, []);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setSearchDropdownOpen(false);
  }, [pathname]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Dark Mode & Sidebar state
  useEffect(() => {
    const savedTheme = localStorage.getItem("apflow_theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    const savedSidebar = localStorage.getItem("apflow_sidebar");
    if (savedSidebar === "collapsed") {
      setSidebarExpanded(false);
    }
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("apflow_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("apflow_theme", "light");
    }
  }

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      const next = !sidebarExpanded;
      setSidebarExpanded(next);
      localStorage.setItem("apflow_sidebar", next ? "expanded" : "collapsed");
    }
  }

  // Check auth session & load workspace
  const refreshWorkspace = useCallback(async (kamId?: string) => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    try {
      // 1. Check local session
      let storedUserStr = localStorage.getItem("apflow_user");
      let storedUser: KamUser | null = null;
      if (storedUserStr) {
        try {
          storedUser = JSON.parse(storedUserStr);
        } catch {}
      }

      // If no session found in localStorage, redirect to /login
      if (!storedUser?.id) {
        router.push("/login");
        setLoading(false);
        return;
      }

      setLoggedUser(storedUser);

      // Determine target KAM ID:
      // If KAM role: strictly enforce their own ID!
      let targetKamId = storedUser.id;
      if (storedUser.role === "SUPER_ADMIN" || storedUser.role === "DIRECTEUR" || storedUser.role === "MANAGER") {
        targetKamId = kamId || localStorage.getItem("apflow_active_kam_id") || "ALL";
      }

      const query = `?kamId=${targetKamId}&sessionUserId=${storedUser.id}`;
      const res = await fetch(`/api/workspace${query}`);
      if (!res.ok) {
        if (res.status === 403) {
          localStorage.removeItem("apflow_user");
          router.push("/login");
        }
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
      setActiveUser(data.activeUser || storedUser);
      setLoggedUser(data.loggedUser || storedUser);
      setClients(data.clients || []);
      setNotes(data.notes || []);
      setTasks(data.tasks || []);
      setVisits(data.visits || []);

      if (targetKamId !== "ALL" && data.activeUser?.id) {
        localStorage.setItem("apflow_active_kam_id", data.activeUser.id);
      } else if (targetKamId === "ALL") {
        localStorage.setItem("apflow_active_kam_id", "ALL");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  // Logout handler
  const logout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("apflow_user");
    localStorage.removeItem("apflow_active_kam_id");
    setLoggedUser(null);
    setActiveUser(null);
    router.push("/login");
  };

  function handleUserAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !loggedUser) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 250;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          fetch("/api/workspace", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: loggedUser.id, avatar: compressed }),
          })
            .then(() => refreshWorkspace())
            .catch((err) => console.error("Error saving avatar:", err));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Extract current client ID if on /clients/[id]
  const currentClientMatch = pathname?.match(/^\/clients\/([^/]+)$/);
  const currentRouteClientId = currentClientMatch ? currentClientMatch[1] : null;

  function switchKam(kamId: string) {
    setProfileMenuOpen(false);
    localStorage.setItem("apflow_active_kam_id", kamId);
    refreshWorkspace(kamId);
    if (pathname?.startsWith("/clients/")) {
      router.push("/clients");
    }
  }

  function openQuickNote(options?: {
    clientId?: string | null;
    note?: NoteItem | null;
  }) {
    setIsQuickTaskOpen(false);
    setEditingNote(options?.note || null);
    setNoteModalClientId(
      options?.clientId !== undefined ? options.clientId : currentRouteClientId
    );
    setIsQuickNoteOpen(true);
  }

  function openQuickTask(options?: {
    clientId?: string | null;
    task?: TaskItem | null;
    defaultStatus?: TaskStatus;
  }) {
    setIsQuickNoteOpen(false);
    setEditingTask(options?.task || null);
    setTaskModalDefaultStatus(options?.defaultStatus || "TODO");
    setTaskModalClientId(
      options?.clientId !== undefined ? options.clientId : currentRouteClientId
    );
    setIsQuickTaskOpen(true);
  }

  function openClientModal(client?: ClientItem | null) {
    setEditingClient(client || null);
    setIsClientModalOpen(true);
  }

  // Helper to get client AP code reliably
  const getClientApNumber = useCallback((c: ClientItem) => {
    if (c.apClientNumber && c.apClientNumber.trim()) return c.apClientNumber.trim();
    if (typeof window !== "undefined") {
      const local = localStorage.getItem(`apflow_apcode_${c.id}`);
      if (local && local.trim()) return local.trim();
      try {
        const f = localStorage.getItem(`apflow_fiche_v4_${c.id}`);
        if (f) {
          const p = JSON.parse(f);
          if (p.apClientNumber) return String(p.apClientNumber).trim();
        }
      } catch {}
    }
    return "";
  }, []);

  // Global search filtering across clients, notes, and visits with Code AP priority
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return null;
    const qClean = q.replace(/^#/, "").replace(/^ap[\s-_:]*/i, "").trim().toLowerCase();

    // Filter clients
    const matchedClients = clients.filter((c) => {
      const apCode = getClientApNumber(c).toLowerCase();
      const postal = (c.postalCode || "").toLowerCase();
      const addr = (c.address || "").toLowerCase();
      const comp = c.company.toLowerCase();
      const contact = (c.contactName || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const city = (c.city || "").toLowerCase();

      // Check direct q and cleaned q on Code AP
      const matchAp =
        Boolean(apCode && (apCode.includes(q) || (qClean && apCode.includes(qClean)))) ||
        Boolean(c.apClientNumber && (c.apClientNumber.toLowerCase().includes(q) || (qClean && c.apClientNumber.toLowerCase().includes(qClean))));

      return (
        matchAp ||
        comp.includes(q) ||
        city.includes(q) ||
        postal.includes(q) ||
        addr.includes(q) ||
        contact.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });

    // Sort client results: boost Code AP matches to the absolute top!
    matchedClients.sort((a, b) => {
      const codeA = getClientApNumber(a).toLowerCase();
      const codeB = getClientApNumber(b).toLowerCase();

      // Exact match on Code AP
      const exactA = Boolean(codeA && (codeA === q || (qClean && codeA === qClean)));
      const exactB = Boolean(codeB && (codeB === q || (qClean && codeB === qClean)));
      if (exactA && !exactB) return -1;
      if (!exactA && exactB) return 1;

      // StartsWith on Code AP
      const startA = Boolean(codeA && (codeA.startsWith(q) || (qClean && codeA.startsWith(qClean))));
      const startB = Boolean(codeB && (codeB.startsWith(q) || (qClean && codeB.startsWith(qClean))));
      if (startA && !startB) return -1;
      if (!startA && startB) return 1;

      // Includes on Code AP
      const incA = Boolean(codeA && (codeA.includes(q) || (qClean && codeA.includes(qClean))));
      const incB = Boolean(codeB && (codeB.includes(q) || (qClean && codeB.includes(qClean))));
      if (incA && !incB) return -1;
      if (!incA && incB) return 1;

      // Company startsWith / includes
      const compA = a.company.toLowerCase();
      const compB = b.company.toLowerCase();
      if (compA.startsWith(q) && !compB.startsWith(q)) return -1;
      if (!compA.startsWith(q) && compB.startsWith(q)) return 1;

      return compA.localeCompare(compB, "fr");
    });

    // Filter tasks & checklists
    const matchedTasks = tasks.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = Boolean(t.description && t.description.toLowerCase().includes(q));
      const matchClient = Boolean(t.client?.company && t.client.company.toLowerCase().includes(q));
      const cl = parseTaskChecklist(t.checklist);
      const matchChecklist = cl.some((item) => item.text.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchClient || matchChecklist;
    });

    // Filter notes
    const matchedNotes = notes.filter(
      (n) =>
        n.content.toLowerCase().includes(q) ||
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.client?.company && n.client.company.toLowerCase().includes(q))
    );

    // Filter visits
    let allVisits: (ClientVisit & { client: ClientItem })[] = [];
    if (typeof window !== "undefined") {
      allVisits = getAllPortfolioVisits(clients);
    }
    const matchedVisits = allVisits.filter(
      (v) =>
        v.summary.toLowerCase().includes(q) ||
        v.interlocutor.toLowerCase().includes(q) ||
        v.client.company.toLowerCase().includes(q)
    );

    return {
      clients: matchedClients.slice(0, 8),
      tasks: matchedTasks.slice(0, 6),
      notes: matchedNotes.slice(0, 5),
      visits: matchedVisits.slice(0, 5),
      totalCount:
        matchedClients.length +
        matchedTasks.length +
        matchedNotes.length +
        matchedVisits.length,
    };
  }, [globalSearch, clients, tasks, notes, getClientApNumber]);

  const isDashboardRoute = pathname === "/" || pathname === "/dashboard";
  const isClientsRoute = pathname?.startsWith("/clients");
  const isProspectsRoute = pathname?.startsWith("/prospects");
  const isMapRoute = pathname?.startsWith("/carte");
  const isVisitesRoute = pathname?.startsWith("/visites");
  const isCaRoute = pathname?.startsWith("/ca");
  const isNotesRoute = pathname?.startsWith("/notes");
  const isTasksRoute = pathname?.startsWith("/taches");
  const isAdminRoute = pathname?.startsWith("/admin");

  const prospectsCount = useMemo(
    () => clients.filter((c) => c.status === "PROSPECT").length,
    [clients]
  );

  // Render standalone layout without navbar if on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <WorkspaceContext.Provider
      value={{
        users,
        activeUser,
        loggedUser,
        clients,
        notes,
        tasks,
        visits,
        loading,
        globalSearch,
        setGlobalSearch,
        refreshWorkspace,
        switchKam,
        logout,
        openQuickNote,
        openQuickTask,
        openClientModal,
      }}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9fb] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        {/* 1. TOP DARK HEADER BAR */}
        <header className="h-14 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 px-3 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 z-20 border-b border-slate-200/90 dark:border-zinc-800 shadow-xs">
          {/* Left: Sidebar toggle + Auto Partner Logo + Divider + Route Title */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            <button
              type="button"
              onClick={toggleSidebar}
              title={
                sidebarExpanded
                  ? "Réduire la barre latérale"
                  : "Développer la barre latérale"
              }
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {/* Mobile hamburger icon */}
              <Menu className="w-5 h-5 md:hidden" />
              {/* Desktop collapse icons */}
              <div className="hidden md:block">
                {sidebarExpanded ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </div>
            </button>

            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white px-2 sm:px-2.5 py-1 rounded-md flex items-center justify-center border border-slate-200/80 shadow-2xs">
                <img
                  src="/autopartner-logo.png"
                  alt="Auto Partner"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
              <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-white hidden md:inline-block">
                APFLOW
              </span>
            </Link>

            <span className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:inline-block" />

            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
              {currentRouteClientId
                ? "Fiche Client"
                : isDashboardRoute
                ? "Tableau de Bord"
                : isProspectsRoute
                ? "Prospects & Pipeline Commercial"
                : isTasksRoute
                ? "Tâches & Kanban"
                : isVisitesRoute
                ? "Visites Terrain"
                : isCaRoute
                ? "Pilotage CA Global & AX"
                : isNotesRoute
                ? "Notes & Mémos"
                : isAdminRoute
                ? "Super Admin & Comptes KAM"
                : "Portefeuille Clients"}
            </span>
          </div>

          {/* Center: Global Search Input + Red Circular Quick Note (+) Button */}
          <div ref={searchContainerRef} className="flex items-center gap-2 flex-1 max-w-[220px] xs:max-w-xs sm:max-w-md lg:max-w-xl mx-2 sm:mx-4 relative">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (globalSearch.trim()) setSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (searchResults?.clients?.length) {
                      router.push(`/clients/${searchResults.clients[0].id}`);
                      setSearchDropdownOpen(false);
                      setGlobalSearch("");
                    } else if (globalSearch.trim()) {
                      router.push(`/clients`);
                      setSearchDropdownOpen(false);
                    }
                  } else if (e.key === "Escape") {
                    setSearchDropdownOpen(false);
                  }
                }}
                placeholder="Rechercher par Code AP (ex: 3306131), client, ville..."
                className="w-full pl-8 sm:pl-9 pr-8 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] transition-colors"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => openQuickNote()}
              title="Ajouter une note rapide"
              className="w-8 h-8 rounded-full bg-[#d90416] hover:bg-[#b80312] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Global Search Results Dropdown Overlay */}
            {searchDropdownOpen && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-3 z-50 text-slate-800 dark:text-zinc-200 max-h-[80vh] overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Résultats trouvés : <strong>{searchResults.totalCount}</strong></span>
                  <button
                    onClick={() => setSearchDropdownOpen(false)}
                    className="hover:text-white"
                  >
                    Fermer
                  </button>
                </div>

                {/* Clients section */}
                {searchResults.clients.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Clients ({searchResults.clients.length})
                    </p>
                    <div className="space-y-1">
                      {searchResults.clients.map((c) => {
                        const apCode = getClientApNumber(c);
                        const isApMatch =
                          Boolean(globalSearch) &&
                          Boolean(apCode) &&
                          (apCode.toLowerCase().includes(globalSearch.trim().toLowerCase()) ||
                            apCode.toLowerCase().includes(globalSearch.trim().replace(/^#/, "").replace(/^ap[\s-_:]*/i, "").toLowerCase()));

                        return (
                          <Link
                            key={c.id}
                            href={`/clients/${c.id}`}
                            onClick={() => {
                              setSearchDropdownOpen(false);
                              setGlobalSearch("");
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition text-xs group ${
                              isApMatch
                                ? "bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/60"
                                : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 flex items-center gap-2 flex-wrap">
                                <span className="truncate">{c.company}</span>
                                {apCode && (
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold tracking-wider ${
                                      isApMatch
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                    }`}
                                  >
                                    Code AP : #{apCode}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                    c.status === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                      : c.status === "INACTIVE"
                                      ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                                  }`}
                                >
                                  {c.status === "ACTIVE"
                                    ? "Actif"
                                    : c.status === "INACTIVE"
                                    ? "Inactif"
                                    : c.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                {c.contactName && <span>{c.contactName}</span>}
                                {c.contactName && c.city && <span>&bull;</span>}
                                {c.city && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {c.postalCode ? `${c.postalCode} ${c.city}` : c.city}
                                  </span>
                                )}
                                {c.phone && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{c.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-blue-600">
                              <span className="text-[10px] font-medium hidden sm:inline">
                                Ouvrir
                              </span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tasks & Checklists section */}
                {searchResults.tasks && searchResults.tasks.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#d90416] flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      Tâches &amp; Checklists ({searchResults.tasks.length})
                    </p>
                    <div className="space-y-1">
                      {searchResults.tasks.map((t) => {
                        const stCfg = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.TODO;
                        const cl = parseTaskChecklist(t.checklist);
                        const doneCount = cl.filter((i) => i.completed).length;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              openQuickTask({ task: t, clientId: t.clientId });
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs group cursor-pointer"
                          >
                            <div className="max-w-[85%] min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#d90416]">
                                  {t.title}
                                </p>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${stCfg.badgeClass}`}
                                >
                                  {stCfg.label}
                                </span>
                                {cl.length > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
                                    Checklist {doneCount}/{cl.length}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {t.client?.company
                                  ? `Client : ${t.client.company}`
                                  : "Tâche générale"}
                                {t.dueDate
                                  ? ` • Échéance : ${new Date(t.dueDate).toLocaleDateString("fr-FR")}`
                                  : ""}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d90416] opacity-0 group-hover:opacity-100 transition shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes section */}
                {searchResults.notes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Notes & Mémos ({searchResults.notes.length})
                    </p>
                    <div className="space-y-1">
                      {searchResults.notes.map((n) => (
                        <Link
                          key={n.id}
                          href={n.clientId ? `/clients/${n.clientId}?tab=notes` : "/notes"}
                          onClick={() => setSearchDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs group"
                        >
                          <div className="max-w-[85%]">
                            <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-amber-600">
                              {n.title || stripMarkdown(n.content).substring(0, 60)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {n.client?.company ? `Client: ${n.client.company}` : "Note libre"}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visits section */}
                {searchResults.visits.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Visites Terrain ({searchResults.visits.length})
                    </p>
                    <div className="space-y-1">
                      {searchResults.visits.map((v) => (
                        <Link
                          key={v.id}
                          href={`/clients/${v.client.id}?tab=visites`}
                          onClick={() => setSearchDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs group"
                        >
                          <div className="max-w-[85%]">
                            <p className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600">
                              {v.client.company} — {v.interlocutor}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {stripMarkdown(v.summary)}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.totalCount === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Aucun résultat correspondant à &quot;{globalSearch}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Dark mode toggle + User Profile (Notice: Bell & Comment icons removed per user request) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Dark mode button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? "Mode clair" : "Mode sombre"}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <span className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:inline-block" />

            {/* User Profile & KAM Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#d90416] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {activeUser ? getInitials(activeUser.name) : "AP"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white leading-tight flex items-center gap-1">
                    <span>{activeUser?.name || "Espace KAM"}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {activeUser?.role === "SUPER_ADMIN"
                      ? "Super Admin"
                      : activeUser?.role === "DIRECTEUR"
                      ? "Directeur des KAM"
                      : "Espace Dédié KAM"}
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-zinc-200">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUserAvatarChange}
                    className="hidden"
                  />
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => avatarInputRef.current?.click()}
                        className="relative group/avatar cursor-pointer shrink-0"
                        title="Cliquer pour changer votre photo de profil"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#d90416] text-white flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden">
                          {loggedUser?.avatar ? (
                            <img src={loggedUser.avatar} alt={loggedUser.name} className="w-full h-full object-cover" />
                          ) : (
                            loggedUser ? getInitials(loggedUser.name) : "AP"
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {loggedUser?.name || activeUser?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {loggedUser?.email || activeUser?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
                            {loggedUser?.role || activeUser?.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="text-[10px] text-[#d90416] hover:underline font-semibold"
                          >
                            Photo profil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switcher: Super Admin & Directeur see all; Manager sees their assigned team */}
                  {(loggedUser?.role === "SUPER_ADMIN" || loggedUser?.role === "DIRECTEUR" || loggedUser?.role === "MANAGER") && (
                    <div className="py-2 border-b border-slate-100 dark:border-zinc-800">
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {loggedUser?.role === "MANAGER" ? "Mon Équipe de KAM" : "Visualiser un Espace KAM"}
                      </p>
                      <button
                        type="button"
                        onClick={() => switchKam("ALL")}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          !localStorage.getItem("apflow_active_kam_id") || localStorage.getItem("apflow_active_kam_id") === "ALL"
                            ? "bg-red-50 dark:bg-zinc-800 text-[#d90416] font-semibold"
                            : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span>{loggedUser?.role === "MANAGER" ? "Vue Globale Équipe" : "Vue Globale (Tous les KAM)"}</span>
                        <span className="text-[10px] text-slate-400">Tout</span>
                      </button>

                      {users
                        .filter((u) => {
                          if (loggedUser?.role === "MANAGER") {
                            return getAssignedManagerIds(u).includes(loggedUser.id) || u.id === loggedUser.id;
                          }
                          return u.role === "KAM";
                        })
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => switchKam(u.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              u.id === activeUser?.id
                                ? "bg-red-50 dark:bg-zinc-800 text-[#d90416] font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {u._count?.clients ?? 0} cl.
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Admin link for Super Admin */}
                  {loggedUser?.role === "SUPER_ADMIN" && (
                    <div className="py-1">
                      <Link
                        href="/admin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-rose-500" />
                        Gérer les identifiants & KAM
                      </Link>
                    </div>
                  )}

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BODY: COLLAPSIBLE LEFT SIDEBAR + MAIN ROUTE CONTENT */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Mobile Drawer Backdrop */}
          {mobileDrawerOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
              onClick={() => setMobileDrawerOpen(false)}
            />
          )}

          {/* Mobile Drawer Panel */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between py-4 shadow-2xl transition-transform duration-200 md:hidden ${
              mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="space-y-3 px-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="bg-white px-2 py-0.5 rounded shadow-xs">
                    <img src="/autopartner-logo.png" alt="Auto Partner" className="h-5 w-auto" />
                  </div>
                  <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-zinc-100">
                    APFLOW
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Action Buttons (Mobile) */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    openQuickNote();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Ajouter une note</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    openQuickTask();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-[#d90416] text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>Ajouter une tâche</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/15 text-white font-bold">
                    +
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    openClientModal(null);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:border-[#d90416] hover:text-[#d90416] text-slate-800 dark:text-zinc-100 font-semibold text-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-[#d90416]" />
                    <span>Ajouter un client</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/10 text-[#d90416] font-bold">
                    +
                  </span>
                </button>
              </div>

              {/* Nav links */}
              <div className="pt-2 space-y-1">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Navigation
                </p>
                <Link
                  href="/"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isDashboardRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Tableau de Bord</span>
                  </div>
                </Link>
                <Link
                  href="/clients"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isClientsRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Mes Clients</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                    {clients.length}
                  </span>
                </Link>

                <Link
                  href="/prospects"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isProspectsRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>Prospects &amp; Pipe</span>
                  </div>
                  {prospectsCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                      {prospectsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/carte"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isMapRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Map className="w-4 h-4 shrink-0" />
                    <span>Carte &amp; Territoires</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                    GPS &amp; CA
                  </span>
                </Link>

                {hasPermission(loggedUser, "add_visits") && (
                  <Link
                    href="/visites"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isVisitesRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Visites Terrain</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                      Terrain
                    </span>
                  </Link>
                )}

                {hasPermission(loggedUser, "view_ca") && (
                  <Link
                    href="/ca"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isCaRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>CA Global &amp; Analyses</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
                      Pilotage
                    </span>
                  </Link>
                )}

                <Link
                  href="/notes"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isNotesRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Notes & Mémos</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                    {notes.length}
                  </span>
                </Link>

                <Link
                  href="/taches"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isTasksRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span>Tâches &amp; Kanban</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                    {tasks.filter((t) => t.status !== "DONE").length}
                  </span>
                </Link>

                {loggedUser?.role === "SUPER_ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isAdminRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Comptes KAM</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold">
                      Admin
                    </span>
                  </Link>
                )}
              </div>
            </div>

            <div className="px-3 border-t border-slate-100 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Déconnexion</span>
              </button>
            </div>
          </aside>

          {/* 2. COLLAPSIBLE LEFT SIDEBAR FOR DESKTOP */}
          <aside
            className={`hidden md:flex ${
              sidebarExpanded ? "w-60" : "w-16"
            } h-full bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-zinc-800 flex-col justify-between py-4 transition-all duration-200 shrink-0 select-none overflow-hidden`}
          >
            <div className="space-y-2 px-2.5">
              {/* 1ST ITEM: AJOUTER UNE NOTE */}
              <button
                type="button"
                onClick={() => openQuickNote()}
                title="Ajouter une note rapide"
                className={`w-full flex items-center ${
                  sidebarExpanded
                    ? "justify-between px-3.5 py-2.5"
                    : "justify-center p-2.5"
                } rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  {sidebarExpanded && <span>Ajouter une note</span>}
                </div>
              </button>

              {/* 2ND QUICK BTN: AJOUTER UNE TÂCHE */}
              <button
                type="button"
                onClick={() => openQuickTask()}
                title="Ajouter une tâche (Panneau latéral / Kanban)"
                className={`w-full flex items-center ${
                  sidebarExpanded
                    ? "justify-between px-3.5 py-2"
                    : "justify-center p-2.5"
                } rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-[#d90416] text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  {sidebarExpanded && <span>Ajouter une tâche</span>}
                </div>
                {sidebarExpanded && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/15 text-white font-bold">
                    +
                  </span>
                )}
              </button>

              {/* 3RD QUICK BTN: AJOUTER UN CLIENT */}
              <button
                type="button"
                onClick={() => openClientModal(null)}
                title="Ajouter un nouveau client"
                className={`w-full flex items-center ${
                  sidebarExpanded
                    ? "justify-between px-3.5 py-2"
                    : "justify-center p-2.5"
                } rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/70 hover:border-[#d90416] hover:text-[#d90416] text-slate-800 dark:text-zinc-100 font-semibold text-xs transition-all cursor-pointer`}
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-[#d90416] shrink-0" />
                  {sidebarExpanded && <span>Ajouter un client</span>}
                </div>
                {sidebarExpanded && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/10 text-[#d90416] font-bold">
                    +
                  </span>
                )}
              </button>

              <div className="pt-2 space-y-1">
                {sidebarExpanded && (
                  <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Navigation
                  </p>
                )}

                {/* ITEM: ROUTE / (Dashboard) */}
                <Link
                  href="/"
                  title="Tableau de Bord (/)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isDashboardRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Tableau de Bord</span>}
                  </div>
                </Link>

                {/* 2ND ITEM: ROUTE /clients */}
                <Link
                  href="/clients"
                  title="Portefeuille Clients (/clients)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isClientsRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Mes Clients</span>}
                  </div>
                  {sidebarExpanded && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                      {clients.length}
                    </span>
                  )}
                </Link>

                {/* PROSPECTS & PIPELINE (/prospects) */}
                <Link
                  href="/prospects"
                  title="Prospects &amp; Pipeline Commercial (/prospects)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isProspectsRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Prospects &amp; Pipe</span>}
                  </div>
                  {sidebarExpanded && prospectsCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                      {prospectsCount}
                    </span>
                  )}
                  {!sidebarExpanded && prospectsCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </Link>

                {/* 3RD ITEM: ROUTE /carte (Cartographie & Analyses Territoriales) */}
                <Link
                  href="/carte"
                  title="Cartographie &amp; Analyses Territoriales (/carte)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isMapRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Map className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Carte &amp; Territoires</span>}
                  </div>
                  {sidebarExpanded && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                      GPS
                    </span>
                  )}
                </Link>

                {/* 3RD ITEM: ROUTE /visites */}
                {hasPermission(loggedUser, "add_visits") && (
                  <Link
                    href="/visites"
                    title="Visites Terrain & Re-visites (/visites)"
                    className={`relative w-full flex items-center ${
                      sidebarExpanded
                        ? "justify-between px-3 py-2.5"
                        : "justify-center py-2.5"
                    } rounded-xl text-xs font-medium transition-colors ${
                      isVisitesRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 shrink-0" />
                      {sidebarExpanded && <span>Visites Terrain</span>}
                    </div>
                    {sidebarExpanded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-zinc-800 text-[#d90416] font-bold">
                        Terrain
                      </span>
                    )}
                  </Link>
                )}

                {/* 4TH ITEM: ROUTE /ca */}
                {hasPermission(loggedUser, "view_ca") && (
                  <Link
                    href="/ca"
                    title="Chiffre d'Affaires Global & Analyses (/ca)"
                    className={`relative w-full flex items-center ${
                      sidebarExpanded
                        ? "justify-between px-3 py-2.5"
                        : "justify-center py-2.5"
                    } rounded-xl text-xs font-medium transition-colors ${
                      isCaRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      {sidebarExpanded && <span>CA Global</span>}
                    </div>
                    {sidebarExpanded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
                        Pilotage
                      </span>
                    )}
                  </Link>
                )}

                {/* 5TH ITEM: ROUTE /notes */}
                <Link
                  href="/notes"
                  title="Notes & Mémos (/notes)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isNotesRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Notes & Mémos</span>}
                  </div>
                  {sidebarExpanded && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                      {notes.length}
                    </span>
                  )}
                </Link>

                {/* ITEM: ROUTE /taches (Trello Kanban & Tasks) */}
                <Link
                  href="/taches"
                  title="Tâches & Kanban Trello (/taches)"
                  className={`relative w-full flex items-center ${
                    sidebarExpanded
                      ? "justify-between px-3 py-2.5"
                      : "justify-center py-2.5"
                  } rounded-xl text-xs font-medium transition-colors ${
                    isTasksRoute
                      ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    {sidebarExpanded && <span>Tâches &amp; Kanban</span>}
                  </div>
                  {sidebarExpanded && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d90416] font-bold">
                      {tasks.filter((t) => t.status !== "DONE").length}
                    </span>
                  )}
                </Link>

                {/* 6TH ITEM: ROUTE /admin (Super Admin only) */}
                {loggedUser?.role === "SUPER_ADMIN" && (
                  <Link
                    href="/admin"
                    title="Espaces KAM (/admin)"
                    className={`relative w-full flex items-center ${
                      sidebarExpanded
                        ? "justify-between px-3 py-2.5"
                        : "justify-center py-2.5"
                    } rounded-xl text-xs font-medium transition-colors ${
                      isAdminRoute
                        ? "bg-red-50/80 dark:bg-red-950/30 text-[#d90416] font-semibold"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-rose-500" />
                      {sidebarExpanded && <span>Comptes KAM</span>}
                    </div>
                    {sidebarExpanded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-zinc-800 text-rose-600 font-bold">
                        Admin
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>

            {/* Bottom Sidebar Controls */}
            <div className="px-2.5 space-y-1 border-t border-slate-100 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={toggleDarkMode}
                title="Basculer le thème Clair / Sombre"
                className={`w-full flex items-center ${
                  sidebarExpanded ? "justify-start gap-3 px-3" : "justify-center"
                } py-2 rounded-xl text-xs text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {sidebarExpanded && (
                  <span>Thème : {darkMode ? "Sombre" : "Clair"}</span>
                )}
              </button>

              <button
                type="button"
                onClick={toggleSidebar}
                className={`w-full flex items-center ${
                  sidebarExpanded ? "justify-start gap-3 px-3" : "justify-center"
                } py-2 rounded-xl text-xs text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors`}
              >
                {sidebarExpanded ? (
                  <>
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span>Réduire le menu</span>
                  </>
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                )}
              </button>
            </div>
          </aside>

          {/* 3. MAIN WORKSPACE AREA */}
          <main
            className={`flex flex-col min-w-0 overflow-y-auto transition-all duration-200 ${
              (isQuickNoteOpen && noteDockMode === "split") || (isQuickTaskOpen && taskDockMode === "split")
                ? "flex-1 md:w-1/2 lg:w-[52%] max-w-[52%] shrink-0"
                : (isQuickNoteOpen && noteDockMode === "dock") || (isQuickTaskOpen && taskDockMode === "dock")
                ? "flex-1 md:pr-[480px] lg:pr-[520px]"
                : "flex-1"
            }`}
          >
            {children}
          </main>
        </div>

        {/* Global Quick Note & Client Modals */}
        {activeUser && (
          <>
            <NoteWorkspaceDrawer
              isOpen={isQuickNoteOpen}
              dockMode={noteDockMode}
              onDockModeChange={(mode: NoteDockMode) => {
                setNoteDockMode(mode);
                localStorage.setItem("apflow_notes_dock_mode", mode);
              }}
              onClose={() => {
                setIsQuickNoteOpen(false);
                setEditingNote(null);
                setNoteModalClientId(null);
              }}
              clients={clients}
              notes={notes}
              activeKamId={activeUser.id}
              defaultClientId={noteModalClientId}
              selectedNote={editingNote}
              onRefresh={() => refreshWorkspace(activeUser.id)}
            />

            <TaskWorkspaceDrawer
              isOpen={isQuickTaskOpen}
              dockMode={taskDockMode}
              onDockModeChange={(mode: TaskDockMode) => {
                setTaskDockMode(mode);
                localStorage.setItem("apflow_tasks_dock_mode", mode);
              }}
              onClose={() => {
                setIsQuickTaskOpen(false);
                setEditingTask(null);
                setTaskModalClientId(null);
              }}
              clients={clients}
              tasks={tasks}
              activeKamId={activeUser.id}
              defaultClientId={taskModalClientId}
              defaultStatus={taskModalDefaultStatus}
              selectedTask={editingTask}
              onRefresh={() => refreshWorkspace(activeUser.id)}
            />

            <ClientFormModal
              isOpen={isClientModalOpen}
              onClose={() => {
                setIsClientModalOpen(false);
                setEditingClient(null);
              }}
              activeKamId={activeUser.id}
              editingClient={editingClient}
              onSaved={() => refreshWorkspace(activeUser.id)}
            />
          </>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
