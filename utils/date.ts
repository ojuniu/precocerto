const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--/--/----';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--/--/----';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export function startOfMonthISO(reference = new Date()): string {
  return new Date(reference.getFullYear(), reference.getMonth(), 1).toISOString();
}
