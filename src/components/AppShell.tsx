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
} from "lucide-react";
import { ClientItem, KamUser, NoteItem, ClientVisit, getInitials, hasPermission } from "@/types/kam";
import { QuickNoteModal } from "@/components/QuickNoteModal";
import { NoteWorkspaceDrawer, NoteDockMode } from "@/components/NoteWorkspaceDrawer";
import { ClientFormModal } from "@/components/ClientFormModal";
import { getAllPortfolioVisits } from "@/lib/visits";

interface WorkspaceContextValue {
  users: KamUser[];
  activeUser: KamUser | null;
  loggedUser: KamUser | null;
  clients: ClientItem[];
  notes: NoteItem[];
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
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [noteModalClientId, setNoteModalClientId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [noteDockMode, setNoteDockMode] = useState<NoteDockMode>("dock");

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

  // Extract current client ID if on /clients/[id]
  const currentClientMatch = pathname?.match(/^\/clients\/([^/]+)$/);
  const currentRouteClientId = currentClientMatch ? currentClientMatch[1] : null;

  // Keyboard shortcut: press "/" or "n" when not typing in an input to open Quick Note
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (
        e.key === "/" ||
        (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey)
      ) {
        e.preventDefault();
        setEditingNote(null);
        setNoteModalClientId(currentRouteClientId);
        setIsQuickNoteOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentRouteClientId]);

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
    setEditingNote(options?.note || null);
    setNoteModalClientId(
      options?.clientId !== undefined ? options.clientId : currentRouteClientId
    );
    setIsQuickNoteOpen(true);
  }

  function openClientModal(client?: ClientItem | null) {
    setEditingClient(client || null);
    setIsClientModalOpen(true);
  }

  // Global search filtering across clients, notes, and visits
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    // Filter clients
    const matchedClients = clients.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        (c.apClientNumber && c.apClientNumber.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q) ||
        (c.postalCode && c.postalCode.toLowerCase().includes(q)) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );

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
      clients: matchedClients.slice(0, 5),
      notes: matchedNotes.slice(0, 5),
      visits: matchedVisits.slice(0, 5),
      totalCount: matchedClients.length + matchedNotes.length + matchedVisits.length,
    };
  }, [globalSearch, clients, notes]);

  const isClientsRoute = pathname === "/" || pathname?.startsWith("/clients");
  const isVisitesRoute = pathname?.startsWith("/visites");
  const isCaRoute = pathname?.startsWith("/ca");
  const isNotesRoute = pathname?.startsWith("/notes");
  const isAdminRoute = pathname?.startsWith("/admin");

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
        loading,
        globalSearch,
        setGlobalSearch,
        refreshWorkspace,
        switchKam,
        logout,
        openQuickNote,
        openClientModal,
      }}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9fb] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        {/* 1. TOP DARK HEADER BAR */}
        <header className="h-14 bg-[#161920] text-white px-3 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 border-b border-slate-800">
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
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
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

            <Link href="/clients" className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white px-2 sm:px-2.5 py-1 rounded-md flex items-center justify-center shadow-sm">
                <img
                  src="/autopartner-logo.png"
                  alt="Auto Partner"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
              <span className="font-bold text-sm tracking-wider text-white hidden md:inline-block">
                APFLOW
              </span>
            </Link>

            <span className="h-5 w-[1px] bg-slate-700/80 hidden sm:inline-block" />

            <span className="text-sm font-medium text-slate-200 hidden sm:inline-block">
              {currentRouteClientId
                ? "Fiche Client"
                : isVisitesRoute
                ? "Visites Terrain"
                : isCaRoute
                ? "Pilotage CA Global"
                : isNotesRoute
                ? "Notes & Mémos"
                : isAdminRoute
                ? "Super Admin & Comptes KAM"
                : "Portefeuille Clients"}
            </span>
          </div>

          {/* Center: Global Search Input + Red Circular Quick Note (+) Button */}
          <div className="flex items-center gap-2 flex-1 max-w-[200px] xs:max-w-xs sm:max-w-md lg:max-w-lg mx-2 sm:mx-4 relative">
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
                onFocus={() => setSearchDropdownOpen(true)}
                placeholder="Rechercher clients, code AP, notes, visites..."
                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 rounded-full bg-[#252932] border border-slate-700/70 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] transition-colors"
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
              title="Ajouter une note rapide (Raccourci : / ou N)"
              className="w-8 h-8 rounded-full bg-[#d90416] hover:bg-[#b80312] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Global Search Results Dropdown Overlay */}
            {searchDropdownOpen && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-3 z-50 text-slate-100 max-h-[80vh] overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
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
                      {searchResults.clients.map((c) => (
                        <Link
                          key={c.id}
                          href={`/clients/${c.id}`}
                          onClick={() => setSearchDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 transition text-xs group"
                        >
                          <div>
                            <div className="font-semibold text-white group-hover:text-blue-400 flex items-center gap-1.5">
                              <span>{c.company}</span>
                              {c.apClientNumber && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                                  #{c.apClientNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{c.contactName}</span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {c.city}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes section */}
                {searchResults.notes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
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
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 transition text-xs group"
                        >
                          <div className="max-w-[85%]">
                            <p className="font-medium text-slate-200 line-clamp-1 group-hover:text-amber-400">
                              {n.title || n.content.substring(0, 60)}
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
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
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
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 transition text-xs group"
                        >
                          <div className="max-w-[85%]">
                            <p className="font-semibold text-white group-hover:text-emerald-400">
                              {v.client.company} — {v.interlocutor}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {v.summary}
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
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <span className="h-5 w-[1px] bg-slate-700/80 hidden sm:inline-block" />

            {/* User Profile & KAM Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#d90416] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {activeUser ? getInitials(activeUser.name) : "AP"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                    <span>{activeUser?.name || "Espace KAM"}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
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
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{loggedUser?.name || activeUser?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {loggedUser?.email || activeUser?.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
                      Rôle : {loggedUser?.role || activeUser?.role}
                    </span>
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
                            return u.managerId === loggedUser.id || u.id === loggedUser.id;
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

              {/* Quick Note Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  openQuickNote();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white font-semibold text-xs shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Ajouter une note</span>
                </div>
              </button>

              {/* Nav links */}
              <div className="pt-2 space-y-1">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Navigation
                </p>
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
                title="Ajouter une note rapide (Raccourci : / ou N)"
                className={`w-full flex items-center ${
                  sidebarExpanded
                    ? "justify-between px-3.5 py-2.5"
                    : "justify-center p-2.5"
                } rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white font-semibold text-xs shadow-sm transition-all`}
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  {sidebarExpanded && <span>Ajouter une note</span>}
                </div>
                {sidebarExpanded && (
                  <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/20 text-white font-mono">
                    N
                  </kbd>
                )}
              </button>

              <div className="pt-2 space-y-1">
                {sidebarExpanded && (
                  <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Navigation
                  </p>
                )}

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
              isQuickNoteOpen && noteDockMode === "split"
                ? "flex-1 md:w-1/2 lg:w-[52%] max-w-[52%] shrink-0"
                : isQuickNoteOpen && noteDockMode === "dock"
                ? "flex-1 md:pr-[480px] lg:pr-[500px]"
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
