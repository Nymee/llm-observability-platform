"use client";

export type Provider = "google" | "openai" | "anthropic";

const PROVIDERS: { value: Provider; label: string; model: string }[] = [
  { value: "google",    label: "Gemini",      model: "gemini-2.5-flash" },
  { value: "openai",    label: "GPT-4o Mini", model: "gpt-4o-mini"      },
  { value: "anthropic", label: "Claude Haiku", model: "claude-haiku-4-5-20251001" },
];

interface Props {
  value: Provider;
  onChange: (provider: Provider, model: string) => void;
}

export default function ProviderSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const selected = PROVIDERS.find((p) => p.value === e.target.value)!;
        onChange(selected.value, selected.model);
      }}
      className="text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {PROVIDERS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
