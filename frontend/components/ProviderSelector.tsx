"use client";

import { useState, useRef, useEffect } from "react";

export type Provider = "google" | "openai" | "anthropic" | "groq";

const PROVIDERS: { value: Provider; label: string; model: string; badge: string }[] = [
  { value: "google", label: "Gemini 2.5 Flash",  model: "gemini-2.5-flash",        badge: "Google"      },
  { value: "groq",   label: "Llama 3.3 70B",     model: "llama-3.3-70b-versatile", badge: "Groq · Free" },
  { value: "groq",   label: "Llama 3 8B",        model: "llama3-8b-8192",          badge: "Groq · Free" },
];

interface Props {
  value: Provider;
  onChange: (provider: Provider, model: string) => void;
}

export default function ProviderSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = PROVIDERS.find((p) => p.value === value) ?? PROVIDERS[1];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 rounded-lg px-3 py-1.5 transition-all"
      >
        <span>{selected.label}</span>
        <span className="text-white/30 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {PROVIDERS.map((p, i) => (
            <button
              key={i}
              onClick={() => { onChange(p.value, p.model); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-white/90">{p.label}</span>
              <span className="text-xs text-indigo-300/60">{p.badge}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
