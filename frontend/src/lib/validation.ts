// Validación client-side para formularios DLEGAL (Paraguay)
// Funciones puras: cada validador devuelve boolean. validate() devuelve un map de errores en castellano.

// --- Normalizadores ---
const onlyDigits = (v: string) => (v || '').replace(/\D/g, '')

// --- Validadores base ---

/** Email con formato estándar. */
export function isEmail(v: string): boolean {
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

/** Cédula paraguaya: 6 a 8 dígitos numéricos. Permite puntos y espacios (se normalizan). */
export function isCI(v: string): boolean {
  if (!v) return false
  const d = onlyDigits(v)
  return /^\d{6,8}$/.test(d)
}

/** RUC paraguayo: dígitos + guion + dígito verificador (NNNNNNN-N). */
export function isRUC(v: string): boolean {
  if (!v) return false
  const s = (v || '').trim().replace(/\s/g, '')
  return /^\d{5,9}-\d$/.test(s)
}

/** Teléfono paraguayo: 09xx xxx xxx (móvil local) o +5959xxxxxxxx / 5959xxxxxxxx. Flexible con espacios y guiones. */
export function isPhonePY(v: string): boolean {
  if (!v) return false
  const d = onlyDigits(v)
  // Local móvil: 09 + 8 dígitos = 10 dígitos comenzando en 09
  if (/^09\d{8}$/.test(d)) return true
  // Internacional: 595 + 9 + 8 dígitos (móvil) => 595 9 xxxxxxxx
  if (/^5959\d{8}$/.test(d)) return true
  // Internacional genérico Paraguay: 595 + 8 a 9 dígitos (fijos/otros)
  if (/^595\d{8,9}$/.test(d)) return true
  // Fijo local: 0 + área + número, entre 7 y 11 dígitos comenzando en 0
  if (/^0\d{6,10}$/.test(d)) return true
  return false
}

/** Campo requerido: no vacío tras trim. */
export function required(v: any): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  return true
}

/** Longitud mínima n (tras trim para strings). */
export function minLen(v: string, n: number): boolean {
  if (v === null || v === undefined) return false
  return String(v).trim().length >= n
}

/** Número positivo (> 0). Acepta strings numéricos. */
export function isPositiveNumber(v: any): boolean {
  if (v === '' || v === null || v === undefined) return false
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return !isNaN(n) && n > 0
}

// --- Motor de reglas ---

export type RuleFn = (value: any) => boolean
export type FieldRule = {
  value: any
  rules: { test: RuleFn; message: string }[]
}

/**
 * Recibe un objeto { campo: { value, rules: [{ test, message }] } }.
 * Devuelve un map { campo: mensaje } con el primer error de cada campo, o {} si todo OK.
 */
export function validate(fields: Record<string, FieldRule>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, def] of Object.entries(fields)) {
    for (const rule of def.rules) {
      if (!rule.test(def.value)) {
        errors[field] = rule.message
        break
      }
    }
  }
  return errors
}

// --- Helpers de reglas reutilizables (azúcar para los formularios) ---

/** Regla: requerido. */
export const ruleRequired = (message = 'Este campo es requerido') => ({ test: (v: any) => required(v), message })
/** Regla: email (sólo valida si hay valor; usar junto a ruleRequired si es obligatorio). */
export const ruleEmailOptional = (message = 'Email inválido') => ({ test: (v: any) => !v || isEmail(v), message })
/** Regla: CI opcional. */
export const ruleCIOptional = (message = 'CI inválida (6 a 8 dígitos)') => ({ test: (v: any) => !v || isCI(v), message })
/** Regla: RUC opcional. */
export const ruleRUCOptional = (message = 'RUC inválido (formato 80123456-7)') => ({ test: (v: any) => !v || isRUC(v), message })
/** Regla: teléfono PY opcional. */
export const rulePhoneOptional = (message = 'Teléfono inválido (ej: 0981234567)') => ({ test: (v: any) => !v || isPhonePY(v), message })
/** Regla: longitud mínima. */
export const ruleMinLen = (n: number, message?: string) => ({ test: (v: any) => minLen(v, n), message: message || `Mínimo ${n} caracteres` })
/** Regla: número positivo (> 0). */
export const rulePositive = (message = 'Debe ser mayor a 0') => ({ test: (v: any) => isPositiveNumber(v), message })
/** Regla: número ≥ 0 opcional (acepta vacío). */
export const ruleNonNegativeOptional = (message = 'No puede ser negativo') => ({
  test: (v: any) => {
    if (v === '' || v === null || v === undefined) return true
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    return !isNaN(n) && n >= 0
  },
  message,
})
