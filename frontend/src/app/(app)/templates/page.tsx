'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '@/lib/api'
import { useState } from 'react'
import { FileText, Plus, Search, X, Copy, Eye, Trash2, Globe, Lock, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

const CATS: Record<string,string> = { demanda: 'Demanda', contestacion: 'Contestación', recurso: 'Recurso', contrato: 'Contrato', nota: 'Nota', general: 'General', otro: 'Otro' }
const AREAS: Record<string,string> = { civil: 'Civil', laboral: 'Laboral', penal: 'Penal', familia: 'Familia', comercial: 'Comercial', tributario: 'Tributario' }
const AREA_COLORS: Record<string,string> = {
  civil: 'bg-gold-400/12 text-gold-700', laboral: 'bg-ink-900/[0.04] text-ink-600',
  penal: 'bg-ink-900/[0.04] text-ink-600', familia: 'bg-ink-900/[0.04] text-ink-600',
  comercial: 'bg-ink-900/[0.04] text-ink-600', tributario: 'bg-ink-900/[0.04] text-ink-600'
}

const EMPTY_FORM = { title: '', category: 'general', area: 'civil', description: '', content: '' }

export default function TemplatesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [modal, setModal] = useState<'create'|'edit'|null>(null)
  const [form, setForm] = useState<any>({...EMPTY_FORM})
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['templates', search, catFilter],
    queryFn: () => templatesApi.list({ search, category: catFilter||undefined }).then(r => r.data),
    staleTime: 30000,
  })
  const { data: tplDetail } = useQuery({
    queryKey: ['template-detail', selected?.id],
    queryFn: () => templatesApi.get(selected.id).then(r => r.data),
    enabled: !!selected?.id,
  })

  const items: any[] = data?.items || []

  const createMut = useMutation({
    mutationFn: (d: any) => templatesApi.create(d),
    onSuccess: () => { toast.success('Modelo creado'); qc.invalidateQueries({ queryKey: ['templates'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => templatesApi.update(id, d),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['templates'] }); qc.invalidateQueries({ queryKey: ['template-detail'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['templates'] }); setSelected(null) },
  })

  const save = () => {
    if (!form.title || !form.content) return toast.error('Título y contenido son requeridos')
    if (modal === 'create') createMut.mutate(form)
    else if (editing) updateMut.mutate({ id: editing.id, d: form })
  }

  // Abre el modal de edición cargando el contenido completo del modelo
  const openEdit = async (t: any) => {
    setEditing(t)
    setForm({ title: t.title, category: t.category, area: t.area, description: t.description || '', content: t.content || '' })
    setModal('edit')
    if (!t.content) {
      try {
        const full = await templatesApi.get(t.id).then(r => r.data)
        setForm((f: any) => ({ ...f, content: full.content || '' }))
      } catch { toast.error('No se pudo cargar el contenido del modelo') }
    }
  }

  const copyContent = (content: string) => { navigator.clipboard.writeText(content); toast.success('Copiado al portapapeles') }

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const lbl = 'block text-xs font-semibold text-ink-600 mb-1'

  return (
    <AppLayout title="Modelos de Escritos">
      <PageHeader
        icon={FileText}
        title="Modelos de Escritos"
        description="Plantillas de escritos y documentos reutilizables."
        actions={
          <button onClick={() => { setForm({...EMPTY_FORM}); setEditing(null); setModal('create') }}
            className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
            <Plus strokeWidth={1.7} className="w-4 h-4" /> Nuevo modelo
          </button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(CATS).map(([k, v]) => (
            <button key={k} onClick={() => setCatFilter(k === catFilter ? '' : k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${catFilter === k ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07]'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_,i)=>(
          <div key={i} className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
            <div className="w-10 h-10 rounded-xl bg-ink-900/[0.04] animate-pulse mb-3" />
            <div className="h-4 w-3/4 rounded bg-ink-900/[0.04] animate-pulse mb-2" />
            <div className="h-3 w-full rounded bg-ink-900/[0.04] animate-pulse mb-1.5" />
            <div className="h-3 w-2/3 rounded bg-ink-900/[0.04] animate-pulse mb-4" />
            <div className="flex gap-2">
              <div className="h-5 w-14 rounded-lg bg-ink-900/[0.04] animate-pulse" />
              <div className="h-5 w-16 rounded-lg bg-ink-900/[0.04] animate-pulse" />
            </div>
          </div>
        ))}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || catFilter ? 'Sin resultados' : 'Sin modelos de escritos'}
          description={search || catFilter ? 'No encontramos modelos que coincidan con los filtros aplicados.' : 'Creá tu primer modelo de escrito reutilizable para agilizar la redacción de tus documentos.'}
          action={
            <button onClick={() => { setForm({...EMPTY_FORM}); setEditing(null); setModal('create') }}
              className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
              <Plus strokeWidth={1.7} className="w-4 h-4" /> Crear primer modelo
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(t => (
            <div key={t.id} className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:-translate-y-0.5 hover:shadow-tinted-lg hover:ring-gold-400/40 transition-all duration-300 ease-fluid group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0">
                  <FileText strokeWidth={1.7} className="w-5 h-5 text-ink-900" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setSelected(t)} title="Ver" className="p-1.5 hover:bg-ink-900/5 rounded-lg transition"><Eye strokeWidth={1.7} className="w-3.5 h-3.5 text-ink-500" /></button>
                  {t.is_own !== false && (
                    <>
                      <button onClick={() => openEdit(t)} title="Editar"
                        className="p-1.5 hover:bg-ink-900/5 rounded-lg transition"><Edit strokeWidth={1.7} className="w-3.5 h-3.5 text-ink-500" /></button>
                      <button onClick={() => deleteMut.mutate(t.id)} title="Eliminar" className="p-1.5 hover:bg-rose-500/10 rounded-lg transition"><Trash2 strokeWidth={1.7} className="w-3.5 h-3.5 text-rose-500" /></button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-ink-900 text-sm leading-tight mb-2">{t.title}</h3>
              {t.description && <p className="text-xs text-ink-500 mb-3 line-clamp-2">{t.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-lg ${AREA_COLORS[t.area] || 'bg-ink-900/[0.04] text-ink-600'}`}>{AREAS[t.area] || t.area}</span>
                <span className="text-xs px-2 py-0.5 rounded-lg bg-ink-900/[0.04] text-ink-600">{CATS[t.category] || t.category}</span>
                {t.is_public && <span className="text-xs text-ink-400 flex items-center gap-1"><Globe strokeWidth={1.7} className="w-3 h-3"/>Público</span>}
                {!t.is_public && t.is_own !== false && <span className="text-xs text-ink-400 flex items-center gap-1"><Lock strokeWidth={1.7} className="w-3 h-3"/>Propio</span>}
                {t.use_count > 0 && <span className="text-xs text-ink-400 ml-auto tnum">{t.use_count} usos</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <div className="bg-ink-900 text-white p-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${AREA_COLORS[selected.area] || 'bg-white/10 text-white'}`}>{AREAS[selected.area] || selected.area}</span>
                    <span className="text-xs text-white/40">{CATS[selected.category] || selected.category}</span>
                  </div>
                  <h2 className="font-display font-semibold text-lg leading-tight tracking-tight">{selected.title}</h2>
                  {selected.description && <p className="text-white/60 text-sm mt-1">{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/20 rounded-xl flex-shrink-0"><X strokeWidth={1.7} className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {tplDetail?.content ? (
                <div>
                  <div className="flex justify-end mb-3">
                    <button onClick={() => copyContent(tplDetail.content)}
                      className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
                      <Copy strokeWidth={1.7} className="w-4 h-4" /> Copiar al portapapeles
                    </button>
                  </div>
                  <pre className="bg-paper rounded-xl p-4 text-sm text-ink-700 font-mono whitespace-pre-wrap leading-relaxed ring-1 ring-ink-900/[0.06]">
                    {tplDetail.content}
                  </pre>
                  <p className="text-xs text-ink-400 mt-3 text-center">Los marcadores [ENTRE CORCHETES] deben reemplazarse con los datos del caso</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="h-9 w-44 rounded-full bg-ink-900/[0.04] animate-pulse ml-auto" />
                  <div className="rounded-xl bg-ink-900/[0.04] animate-pulse h-72" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-tinted-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-ink-900 text-lg tracking-tight">{modal === 'create' ? 'Nuevo modelo de escrito' : 'Editar modelo'}</h2>
              <button onClick={() => setModal(null)}><X strokeWidth={1.7} className="w-5 h-5 text-ink-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Título *</label>
                <input className={inp} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ej: Demanda Ordinaria por Daños y Perjuicios" />
              </div>
              <div><label className={lbl}>Categoría</label>
                <select className={inp} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Área</label>
                <select className={inp} value={form.area} onChange={e => setForm({...form, area: e.target.value})}>
                  {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className={lbl}>Descripción</label>
                <input className={inp} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Breve descripción del modelo" />
              </div>
              <div className="col-span-2"><label className={lbl}>Contenido * <span className="text-ink-400 font-normal">(usá [MARCADORES] para los campos variables)</span></label>
                <textarea rows={12} className={inp + ' font-mono text-xs'} value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  placeholder="SEÑOR JUEZ...&#10;&#10;[ACTOR], paraguayo/a, mayor de edad..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {createMut.isPending || updateMut.isPending ? 'Guardando...' : modal === 'create' ? 'Crear modelo' : 'Guardar cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 text-ink-700 hover:bg-ink-900/5 rounded-full text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
