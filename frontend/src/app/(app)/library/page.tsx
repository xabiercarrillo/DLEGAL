'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery } from '@tanstack/react-query'
import { libraryApi } from '@/lib/api'
import { useState } from 'react'
import { BookOpen, Search, X, ExternalLink, Scale, FileText, Copy, Star, ChevronRight, Landmark, Gavel } from 'lucide-react'

const AREA_LABELS: Record<string,string> = {
  laboral: 'Laboral', civil: 'Civil', penal: 'Penal', comercial: 'Comercial',
  tributario: 'Tributario', familia: 'Familia', administrativo: 'Administrativo', constitucional: 'Constitucional'
}
const AREA_COLORS: Record<string,string> = {
  laboral: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  civil: 'bg-gold-400/12 text-gold-700 ring-1 ring-gold-400/20',
  penal: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  comercial: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  tributario: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  familia: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  administrativo: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
  constitucional: 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10',
}
const CAT_ICON: Record<string,any> = { ley:Scale, codigo:BookOpen, articulo:FileText, decreto:FileText, resolucion:FileText, convenio:Gavel }

/* Links rápidos a recursos oficiales del PY */
const RECURSOS_OFICIALES = [
  { label: 'Poder Judicial', url: 'https://www.pj.gov.py', icon: Scale, desc: 'Expedientes, resoluciones, jurisprudencia' },
  { label: 'SET — e-Kuatia', url: 'https://ekuatia.set.gov.py', icon: FileText, desc: 'Facturación electrónica SET Paraguay' },
  { label: 'Colegio de Abogados PY', url: 'https://capy.org.py', icon: Gavel, desc: 'Matrículas, aranceles, resoluciones' },
  { label: 'Gaceta Oficial', url: 'https://gaceta.py', icon: FileText, desc: 'Leyes, decretos, resoluciones publicadas' },
  { label: 'DGEEC', url: 'https://www.dgeec.gov.py', icon: BookOpen, desc: 'Datos estadísticos oficiales' },
  { label: 'BCP — Tasas', url: 'https://www.bcp.gov.py', icon: Landmark, desc: 'Tasa activa, UF, dólar oficial BCP' },
  { label: 'Congreso Nacional', url: 'https://www.congreso.gov.py', icon: Landmark, desc: 'Leyes aprobadas, proyectos en trámite' },
  { label: 'SENACIT', url: 'https://www.senacit.gov.py', icon: BookOpen, desc: 'Propiedad intelectual y patentes' },
]

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [showRecursos, setShowRecursos] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['library', search, areaFilter],
    queryFn: () => libraryApi.list({ search, area: areaFilter || undefined, limit: 50 }).then(r => r.data),
    staleTime: 60000,
  })
  const { data: normDetail } = useQuery({
    queryKey: ['library-norm', selected?.id],
    queryFn: () => libraryApi.get(selected.id).then(r => r.data),
    enabled: !!selected?.id,
  })

  const items: any[] = data?.items || []
  const areas: string[] = data?.areas || Object.keys(AREA_LABELS)

  return (
    <AppLayout title="Biblioteca Jurídica Paraguay">
      {/* Quick links bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input placeholder="Buscar norma, artículo, código..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setAreaFilter('')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${!areaFilter ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07]'}`}>
              Todas
            </button>
            {areas.map(a => (
              <button key={a} onClick={() => setAreaFilter(a === areaFilter ? '' : a)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition ${areaFilter === a ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07]'}`}>
                {AREA_LABELS[a] || a}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowRecursos(!showRecursos)}
          className={`ml-4 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition flex-shrink-0 ${showRecursos ? 'bg-ink-900 text-white' : 'bg-white ring-1 ring-ink-900/10 text-ink-700 hover:bg-ink-900/5'}`}>
          <Star strokeWidth={1.7} className="w-4 h-4" />
          {showRecursos ? 'Ver normas' : 'Recursos oficiales'}
        </button>
      </div>

      {/* Recursos oficiales panel */}
      {showRecursos && (
        <div className="mb-6">
          <h3 className="font-display text-sm font-semibold text-ink-900 tracking-tight mb-3 flex items-center gap-2"><ExternalLink strokeWidth={1.7} className="w-4 h-4 text-gold-600" /> Recursos oficiales Paraguay</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RECURSOS_OFICIALES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:-translate-y-0.5 hover:shadow-tinted-lg hover:ring-gold-400/40 transition-all duration-300 ease-fluid group">
                <span className="w-9 h-9 rounded-xl bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0">
                  <r.icon strokeWidth={1.7} className="w-4.5 h-4.5 text-ink-900" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 group-hover:text-gold-700 transition">{r.label}</p>
                  <p className="text-xs text-ink-400 mt-0.5 line-clamp-2">{r.desc}</p>
                </div>
                <ExternalLink strokeWidth={1.7} className="w-3.5 h-3.5 text-ink-300 group-hover:text-gold-600 flex-shrink-0 mt-0.5 transition" />
              </a>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_,i)=><div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-16 text-center">
          <BookOpen strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-500 font-medium">Sin resultados</p>
          <p className="text-xs text-ink-400 mt-1">{search ? `No hay normas que coincidan con "${search}"` : 'La biblioteca está vacía'}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-400 mb-3 tnum">{items.length} norma{items.length !== 1 ? 's' : ''} encontrada{items.length !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {items.map(n => { const Ic = CAT_ICON[n.category] || FileText; return (
              <div key={n.id} onClick={() => setSelected(n)}
                className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:-translate-y-0.5 hover:shadow-tinted-lg hover:ring-gold-400/40 transition-all duration-300 ease-fluid cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0">
                    <Ic strokeWidth={1.7} className="w-5 h-5 text-ink-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-ink-900 text-sm">{n.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${AREA_COLORS[n.area] || 'bg-ink-900/[0.04] text-ink-600 ring-1 ring-ink-900/10'}`}>
                        {AREA_LABELS[n.area] || n.area}
                      </span>
                    </div>
                    <p className="font-medium text-ink-900 text-sm">{n.title}</p>
                    {n.summary && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{n.summary}</p>}
                  </div>
                  <ChevronRight strokeWidth={1.7} className="w-4 h-4 text-ink-300 group-hover:text-ink-500 flex-shrink-0 mt-1 transition" />
                </div>
              </div>
            )})}
          </div>
        </>
      )}

      {/* Norm detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-xl h-full flex flex-col shadow-2xl">
            <div className="bg-ink-900 text-white p-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${AREA_COLORS[selected.area]}`}>
                      {AREA_LABELS[selected.area] || selected.area}
                    </span>
                    <span className="text-xs text-white/40 uppercase">{selected.category}</span>
                  </div>
                  <p className="font-mono font-bold text-lg">{selected.code}</p>
                  <p className="text-white/80 text-sm mt-0.5">{selected.title}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/20 rounded-xl flex-shrink-0"><X strokeWidth={1.7} className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selected.summary && (
                <div className="bg-paper rounded-xl p-4">
                  <p className="text-xs font-semibold text-ink-500 mb-2 uppercase">Resumen</p>
                  <p className="text-sm text-ink-700 leading-relaxed">{selected.summary}</p>
                </div>
              )}
              {normDetail?.articles && normDetail.articles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-500 mb-2 uppercase">Artículos relevantes</p>
                  <div className="space-y-2">
                    {normDetail.articles.map((a: any, i: number) => (
                      <div key={i} className="ring-1 ring-ink-900/[0.06] rounded-xl p-3">
                        <p className="text-xs font-mono font-bold text-ink-900 mb-1">Art. {a.number}</p>
                        <p className="text-xs text-ink-600 leading-relaxed">{a.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {normDetail?.full_text && (
                <div className="bg-ink-900/[0.04] rounded-xl p-4">
                  <p className="text-xs font-semibold text-ink-500 mb-2 uppercase">Texto completo</p>
                  <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{normDetail.full_text}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.official_url && (
                  <a href={selected.official_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
                    <ExternalLink strokeWidth={1.7} className="w-4 h-4" /> Ver texto oficial
                  </a>
                )}
                <button onClick={() => { navigator.clipboard.writeText(`${selected.code}: ${selected.title}. ${selected.summary || ''}`); }}
                  className="flex items-center gap-2 px-4 py-2 ring-1 ring-ink-900/10 text-ink-700 rounded-full text-sm hover:bg-ink-900/5 transition">
                  <Copy strokeWidth={1.7} className="w-4 h-4" /> Copiar referencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
