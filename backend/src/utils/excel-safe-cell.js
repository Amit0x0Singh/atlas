// CWE-1236 mitigation: a string cell value starting with =, +, -, or @
// becomes a live formula when Excel opens the file. Prefixing an apostrophe
// forces Excel to treat it as literal text.
const FORMULA_TRIGGER_RE = /^[=+\-@]/;

export function excelSafeCell(value) {
  return typeof value === 'string' && FORMULA_TRIGGER_RE.test(value) ? `'${value}` : value;
}
