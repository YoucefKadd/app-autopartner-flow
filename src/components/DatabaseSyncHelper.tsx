"use client";

import React, { useEffect, useState } from "react";
import { CloudUpload, CheckCircle, RefreshCw, X } from "lucide-react";

export function DatabaseSyncHelper() {
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Check if there are local photos or logos in localStorage that are not yet synced
    let photoKeysCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("apflow_photos_v4_") || key.startsWith("apflow_logo_"))) {
        photoKeysCount++;
      }
    }
    if (photoKeysCount > 0 && !localStorage.getItem("apflow_synced_to_cloud_v1")) {
      setHasLocalData(true);
    }
  }, []);

  async function handleSyncNow() {
    if (typeof window === "undefined") return;
    setSyncing(true);
    let totalItems = 0;

    try {
      // 1. Sync Photos
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("apflow_photos_v4_")) {
          const clientId = key.replace("apflow_photos_v4_", "");
          try {
            const photos = JSON.parse(localStorage.getItem(key) || "[]");
            if (Array.isArray(photos) && photos.length > 0) {
              for (const ph of photos) {
                await fetch("/api/photos", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clientId,
                    label: ph.label,
                    category: ph.category,
                    url: ph.url,
                    note: ph.note,
                    sizeKb: ph.sizeKb,
                    originalSizeKb: ph.originalSizeKb,
                    format: ph.format,
                  }),
                }).catch(() => {});
                totalItems++;
              }
            }
          } catch {}
        }
      }

      // 2. Sync Logos
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("apflow_logo_")) {
          const clientId = key.replace("apflow_logo_", "");
          const logo = localStorage.getItem(key);
          if (logo) {
            await fetch(`/api/clients/${clientId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ logo }),
            }).catch(() => {});
            totalItems++;
          }
        }
      }

      localStorage.setItem("apflow_synced_to_cloud_v1", "true");
      setSyncedCount(totalItems);
      setTimeout(() => {
        setHasLocalData(false);
      }, 3500);
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  }

  if (!hasLocalData || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#d90416] shrink-0">
          <CloudUpload className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
            Synchronisation Téléphone &amp; Cloud
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
            Vos photos et logos locaux peuvent être envoyés sur votre base de données Hostinger pour apparaître immédiatement sur votre téléphone.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d90416] hover:bg-[#b80312] text-white text-xs font-bold transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : syncedCount !== null ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{syncedCount} élément(s) synchronisé(s) !</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Envoyer vers le Cloud</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
