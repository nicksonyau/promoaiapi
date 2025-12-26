export const extractPhone = (t: string) =>
  (t.match(/(\+?6?01\d{8,9})/) || [])[1]?.replace(/\s+/g, "") || null;

export const extractEmail = (t: string) =>
  (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;

export function extractName(text: string): string | null {
  const patterns = [
    /my name is\s+([a-zA-Z\s]{2,30})/i,
    /i am\s+([a-zA-Z\s]{2,30})/i,
    /this is\s+([a-zA-Z\s]{2,30})/i,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1].trim();
  }

  return null;
}
