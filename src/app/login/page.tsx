"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Échec de connexion.");
        setLoading(false);
        return;
      }

      // Store logged-in user in localStorage for instant access across tabs
      if (typeof window !== "undefined") {
        localStorage.setItem("apflow_user", JSON.stringify(data.user));
        // For supervisory roles (SUPER_ADMIN, DIRECTEUR, MANAGER), default to "ALL" so all team/network clients are immediately visible!
        if (data.user.role === "KAM") {
          localStorage.setItem("apflow_active_kam_id", data.user.id);
        } else {
          localStorage.setItem("apflow_active_kam_id", "ALL");
        }
      }

      // Route based on role
      if (data.user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (data.user.role === "DIRECTEUR" || data.user.role === "MANAGER") {
        router.push("/clients");
      } else {
        router.push("/clients");
      }
    } catch (err: any) {
      setErrorMessage("Erreur de communication avec le serveur.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5 mb-2">
            <span className="w-9 h-9 rounded-xl bg-[#d90416] flex items-center justify-center text-white font-black text-xl shadow-md shadow-red-500/20 tracking-tighter">
              AP
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              FLOW
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d90416]">
            Plateforme KAM &amp; Réseau Auto Partner
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-red-50 text-[#d90416]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Connexion à votre espace</h2>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#d90416]" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Identifiant / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@autopartner.fr"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d90416] focus:bg-white focus:ring-1 focus:ring-[#d90416] transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#d90416] focus:bg-white focus:ring-1 focus:ring-[#d90416] transition-all font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#d90416] hover:bg-[#b80312] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <span>Vérification en cours...</span>
              ) : (
                <>
                  <span>Accéder à mon espace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge footer */}
        <div className="text-center mt-6 text-xs text-slate-400 font-medium">
          Système sécurisé Auto Partner &bull; Cloisonnement strict des portefeuilles
        </div>
      </div>
    </div>
  );
}
