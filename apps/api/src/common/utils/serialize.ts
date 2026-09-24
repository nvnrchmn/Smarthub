type DecimalLike = { toString(): string } | string | number | null | undefined;

export const toMoney = (value: DecimalLike): string => {
  if (value === null || value === undefined) return "0.00";
  const numeric = typeof value === "string" ? Number(value) : Number(value.toString());
  if (Number.isNaN(numeric)) return "0.00";
  return numeric.toFixed(2);
};

export const toNumber = (value: DecimalLike): number => {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "string" ? Number(value) : Number(value.toString());
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const toDateOnly = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
