'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect, useRef } from 'react'
import { searchApi } from '@/lib/api'
import { Briefcase, Users, Clock, CheckSquare, Phone, Search, ArrowRight, X, History, FileText, CalendarDays } from 'lucide-react'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  case:        { label: 'Caso',       icon: Briefcase,    color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  client:      { label: 'Cliente',    icon: Users,        color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  deadline:    { label: 'Plazo',      icon: Clock,        color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  task:        { label: 'Tarea',      icon: CheckSquare,  color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  contact:     { label: 'Contacto',   icon: Phone,        color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  document:    { label: 'Documento',  icon: FileText,     color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
  appointment: { label: 'Cita',       icon: CalendarDays, color: 'text-gold-600',   bg: 'bg-ink-900/[0.05]' },
}

const RECENT_KEY = 'xlegal_recent_searches'
const MAX_RECENT = 8

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(q: string) {
  const prev = getRecent().filter(s => s !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)))
}
function clearRecent() { localStorage.setItem(RECENT_KEY, '[]') }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    setRecent(getRecent())
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) { setResults([]); setSearched(false); return }
      setLoading(true)
      try {
        const { data } = await searchApi.search(query)
        setResults(data.results || [])
        setSearched(true)
        saveRecent(query)
        setRecent(getRecent())
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const allTypes = [...new Set(results.map(r => r.type))]
  const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results
  const byType = filtered.reduce((acc: any, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const SUGGESTIONS = [
    { icon: Briefcase, text: 'Casos activos', q: 'activo',   color: 'text-gold-600' },
    { icon: Users,     text: 'Clientes empresa', q: 'empresa', color: 'text-gold-600' },
    { icon: Clock,     text: 'Plazos urgentes',  q: 'urgente', color: 'text-gold-600' },
    { icon: CheckSquare, text: 'Tareas pendientes', q: 'pendiente', color: 'text-gold-600' },
    { icon: FileText,  text: 'Contratos',        q: 'contrato', color: 'text-gold-600' },
    { icon: Phone,     text: 'Contactos judiciales', q: 'judicial', color: 'text-gold-600' },
  ]

  function handleSuggestion(q: string) { setQuery(q); inputRef.current?.focus() }

  return (
    <AppLayout title="Búsqueda Global">
      <div className="max-w-2xl mx-auto">
        {/* Search input */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
          )}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); setTypeFilter('') }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
            placeholder="Buscar casos, clientes, plazos, tareas, documentos..."
            className="w-full pl-12 pr-12 py-4 text-base bg-white border-0 ring-1 ring-ink-900/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition shadow-tinted-sm"
          />
        </div>

        {/* Type filter pills — only when there are results */}
        {results.length > 0 && allTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button onClick={() => setTypeFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ring-1 ${!typeFilter ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-900/10 hover:ring-ink-900/20'}`}>
              Todos ({results.length})
            </button>
            {allTypes.map(t => {
              const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.case
              return (
                <button key={t} onClick={() => setTypeFilter(t === typeFilter ? '' : t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ring-1 ${typeFilter === t ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-900/10 hover:ring-ink-900/20'}`}>
                  {cfg.label}s ({results.filter(r => r.type === t).length})
                </button>
              )
            })}
          </div>
        )}

        {/* Empty state — suggestions + recent */}
        {!query && (
          <div className="space-y-6">
            {recent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-ink-400 uppercase flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Búsquedas recientes</p>
                  <button onClick={() => { clearRecent(); setRecent([]) }} className="text-xs text-ink-400 hover:text-ink-600 transition">Limpiar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((q, i) => (
                    <button key={i} onClick={() => handleSuggestion(q)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full ring-1 ring-ink-900/10 hover:ring-gold-400/60 transition text-sm text-ink-600">
                      <Clock className="w-3.5 h-3.5 text-ink-400" />{q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase mb-3">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => handleSuggestion(s.q)}
                    className="flex items-center gap-3 p-4 bg-white rounded-xl ring-1 ring-ink-900/[0.06] hover:ring-gold-400/60 hover:shadow-tinted-sm transition text-left">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                    <span className="text-sm text-ink-600">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-paper rounded-2xl p-4 text-center">
              <p className="text-xs text-ink-400">Presioná <kbd className="px-1.5 py-0.5 bg-white rounded ring-1 ring-ink-900/10 text-xs font-mono">Esc</kbd> para limpiar · Mínimo 2 caracteres para buscar</p>
            </div>
          </div>
        )}

        {/* No results */}
        {searched && results.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-ink-200 mx-auto mb-3" />
            <p className="text-ink-500 font-medium">Sin resultados para "{query}"</p>
            <p className="text-sm text-ink-400 mt-1">Probá con otro término o verificá la ortografía</p>
          </div>
        )}

        {/* Results grouped by type */}
        {filtered.length > 0 && (
          <div className="space-y-5">
            <p className="text-sm text-ink-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para <strong>"{query}"</strong>
              {typeFilter && ` en ${TYPE_CONFIG[typeFilter]?.label || typeFilter}s`}
            </p>
            {Object.entries(byType).map(([type, items]: [string, any]) => {
              const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.case
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${cfg.bg}`}>
                      <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-ink-500 uppercase">{cfg.label}s ({(items as any[]).length})</p>
                  </div>
                  <div className="space-y-1.5">
                    {(items as any[]).map((r: any) => (
                      <Link key={r.id} href={r.url || '#'}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl ring-1 ring-ink-900/[0.06] hover:ring-gold-400/60 hover:shadow-tinted-sm transition group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-900 truncate">{r.title}</p>
                          {r.subtitle && <p className="text-xs text-ink-400 mt-0.5 truncate">{r.subtitle}</p>}
                        </div>
                        {r.status && (
                          <span className="text-xs px-2 py-0.5 bg-ink-900/[0.05] text-ink-500 rounded-lg flex-shrink-0">{r.status}</span>
                        )}
                        <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 flex-shrink-0 transition" />
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
