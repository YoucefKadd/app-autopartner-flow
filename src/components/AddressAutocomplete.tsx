"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Check, Loader2, Search, X } from "lucide-react";

export interface AddressSuggestion {
  label: string;
  street: string;
  postalCode: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
  context: string;
}

interface AddressAutocompleteProps {
  value?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  onSelectAddress: (address: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function AddressAutocomplete({
  value,
  initialValue = "",
  onChange,
  onSelectAddress,
  placeholder = "Ex: 14 Rue de l'Industrie, Toulouse...",
  className = "",
  required = false,
}: AddressAutocompleteProps) {
  const [internalValue, setInternalValue] = useState<string>(value ?? initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVerified, setSelectedVerified] = useState(false);

  // Sync internal state if value is provided from outside
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const currentValue = value !== undefined ? value : internalValue;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setInternalValue(query);
    if (typeof onChange === "function") {
      onChange(query);
    }
    setSelectedVerified(false);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            query
          )}&limit=5`
        );
        if (!res.ok) throw new Error("Erreur recherche adresse");
        const data = await res.json();

        if (data.features && Array.isArray(data.features)) {
          const list: AddressSuggestion[] = data.features.map((f: any) => ({
            label: f.properties.label,
            street: f.properties.name || f.properties.street || "",
            postalCode: f.properties.postcode || "",
            city: f.properties.city || "",
            coordinates: f.geometry?.coordinates || [0, 0],
            context: f.properties.context || "",
          }));
          setSuggestions(list);
          setIsOpen(list.length > 0);
        }
      } catch (err) {
        console.error("Erreur API Adresse BAN:", err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function handleSelect(suggestion: AddressSuggestion) {
    const text = suggestion.street || suggestion.label;
    setInternalValue(text);
    if (typeof onChange === "function") {
      onChange(text);
    }
    setSelectedVerified(true);
    setIsOpen(false);
    onSelectAddress(suggestion);
  }

  function handleClear() {
    setInternalValue("");
    if (typeof onChange === "function") {
      onChange("");
    }
    setSuggestions([]);
    setIsOpen(false);
    setSelectedVerified(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin
          className={`w-3.5 h-3.5 absolute left-3 transition-colors ${
            selectedVerified
              ? "text-emerald-500"
              : "text-slate-400 dark:text-zinc-500"
          }`}
        />
        <input
          type="text"
          value={currentValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#d90416] transition-colors ${
            selectedVerified
              ? "border-emerald-500/70 dark:border-emerald-500/50"
              : "border-slate-200 dark:border-zinc-800"
          } ${className}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          )}
          {selectedVerified && !loading && (
            <span
              title="Adresse certifiée Base Adresse Nationale (BAN)"
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded"
            >
              <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
              BAN
            </span>
          )}
          {currentValue && !loading && !selectedVerified && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden py-1 divide-y divide-slate-100 dark:divide-zinc-800/80 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
            <span>Adresses officielles (France BAN)</span>
            <span className="text-emerald-600 font-semibold text-[9px]">Géo-référencée</span>
          </div>
          {suggestions.map((s, idx) => (
            <div
              key={`${s.label}_${idx}`}
              onClick={() => handleSelect(s)}
              className="px-3.5 py-2.5 text-xs cursor-pointer hover:bg-red-50/60 dark:hover:bg-zinc-800/70 transition-colors flex items-start justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                  {s.label}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {s.context || `${s.postalCode} ${s.city}`}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                {s.postalCode}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
