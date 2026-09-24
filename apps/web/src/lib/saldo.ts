export const saldoValueClassName = (value: string | number | null | undefined): string => {
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(numeric) || numeric === 0) return "";
  return numeric < 0 ? "text-destructive" : "text-success";
};
