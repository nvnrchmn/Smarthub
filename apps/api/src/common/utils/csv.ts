/** Parser CSV minimal (mendukung kutip ganda dan baris CRLF). */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
};

export const csvToRecords = (text: string): Record<string, string>[] => {
  const rows = parseCsv(text);
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) return [];

  const headers = headerRow.map((header) => header.trim());

  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      const value = cells[index]?.trim();
      if (header && value !== undefined && value !== "") {
        record[header] = value;
      }
    });
    return record;
  });
};

const escapeCsv = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
};

export const resolveImporRows = (payload: { data?: unknown[]; csv?: string }): unknown[] => {
  if (payload.data && payload.data.length > 0) return payload.data;
  if (payload.csv) return csvToRecords(payload.csv);
  return [];
};
