import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#d90416] flex items-center justify-center mb-4 shadow-sm text-2xl font-black">
        404
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">
        Page introuvable
      </h2>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-6">
        La ressource ou la page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/clients"
        className="px-4 py-2 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-semibold shadow-sm transition"
      >
        Retour au Portefeuille Clients
      </Link>
    </div>
  );
}
