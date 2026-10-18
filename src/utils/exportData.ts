/**
 * Client-side exports for report tables.
 *
 * Any figure in an exported file must come from the same derived data the screen shows, so the
 * export helpers accept already-rendered rows. Exports never included placeholder values.
 */

export interface ExportColumn<Row> {
  header: string;
  value: (row: Row) => string | number | null | undefined;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildCsv<Row>(columns: ExportColumn<Row>[], rows: Row[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

export function downloadCsv<Row>(filename: string, columns: ExportColumn<Row>[], rows: Row[]): void {
  const csv = buildCsv(columns, rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timestampedFilename(prefix: string, extension = 'csv'): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${prefix}-${stamp}.${extension}`;
}
