// Spreadsheet clipboard text can contain quoted cells with embedded newlines.
export function parseTable(value: string): string[][] {
 const rows: string[][] = [];
 let row: string[] = [], cell = '', quoted = false;
 const text = value.replace(/\r\n?/g, '\n');
 for (let i = 0; i < text.length; i++) {
  const char = text[i];
  if (char === '"' && (quoted || cell === '')) {
   if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
   else quoted = !quoted;
  } else if (!quoted && (char === '\t' || char === '\n')) {
   row.push(cell); cell = '';
   if (char === '\n') { rows.push(row); row = []; }
  } else cell += char;
 }
 if (cell !== '' || row.length || !rows.length) { row.push(cell); rows.push(row); }
 return rows;
}
export function serializeTable(rows: string[][]): string {
 return rows.map(row => row.map(cell => /[\t\n\r"]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell).join('\t')).join('\n');
}
export function isTableResult(value: string): boolean {
 const rows = parseTable(value);
 return rows.length > 1 && rows[0].length > 1 && rows.slice(1).some(row => row.some(cell => cell.trim()));
}
