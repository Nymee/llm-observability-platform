//Do not store private data for observability. this redacts any phone number, email etc

const REDACTION_RULES: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: "EMAIL",
  },
  {
    pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    label: "PHONE",
  },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN" },
  { pattern: /\b(?:\d[ -]?){13,16}\b/g, label: "CARD" },
];

export function redactPII(text: string): string {
  return REDACTION_RULES.reduce(
    (acc, { pattern, label }) => acc.replace(pattern, `[${label}]`),
    text,
  );
}
