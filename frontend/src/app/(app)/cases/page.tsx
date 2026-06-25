'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesApi, clientsApi } from '@/lib/api'
import { CASE_STATUS, MATTER, formatDate, formatPYG, daysUntil, urgencyBadge } from '@/lib/utils'
import { useState } from 'react'
import { Briefcase, Plus, X, Search, ChevronRight, Scale, Clock, CheckSquare, DollarSign, AlertTriangle, Archive, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTS = Object.entries(CASE_STATUS)
const MATTER_OPTS = Object.entries(MATTER)
const EMPTY = { title: '', matter: 'civil', status: 'new', client_id: '', description: '', court: '', court_file_number: '', opposing_party: '', agreed_fee: '', notes: '' }

export default function CasesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [matterFilter, setMatterFilter] = useState('')
  const [modal, setModal] = useState<'create'|'edit'|null>(null)
  const [form, setForm] = useState<any>({...EMPTY})
  const [selected, setSelected] = useState<any>(null)
  const [detailCase, setDetailCase] = useState<any>(null)
  const [detailTab, setDetailTab] = useState('info')

  const { data, isLoading } = useQuery({
    queryKey: ['cases', search, statusFilter, matterFilter],
    queryFn: () => casesApi.list({ search, status: statusFilter||undefined, matter: matterFilter||undefined, limit: 50 }).then(r => r.data),
  })
  const { data: clientsData } = useQuery({ queryKey: ['clients-sel'], queryFn: () => clientsApi.list({ limit: 200 }).then(r => r.data) })
  const { data: caseDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['case-detail', detailCase?.id],
    queryFn: () => casesApi.detail(detailCase.id).then(r => r.data),
    enabled: !!detailCase?.id,
  })

  const items: any[] = data?.items || data || []
  const clients: any[] = clientsData?.items || clientsData || []

  const createMut = useMutation({
    mutationFn: (d: any) => casesApi.create(d),
    onSuccess: () => { toast.success('Caso creado'); qc.invalidateQueries({ queryKey: ['cases'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => casesApi.update(id, d),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const archiveMut = useMutation({
    mutationFn: (id: string) => casesApi.archive(id),
    onSuccess: () => { toast.success('Caso archivado'); qc.invalidateQueries({ queryKey: ['cases'] }); setDetailCase(null) },
  })

  const save = () => {
    if (!form.title) return toast.error('Titulo requerido')
    const payload = { ...form, agreed_fee: form.agreed_fee ? parseFloat(form.agreed_fee) : undefined }
    if (modal === 'create') createMut.mutate(payload)
    else if (selected) updateMut.mutate({ id: selected.id, d: payload })
  }

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const lbl = 'block text-xs font-semibold text-ink-600 mb-1'
  const pending = createMut.isPending || updateMut.isPending

  const DTABS = [
    { id: 'info', label: 'Información' },
    { id: 'hearings', label: `Audiencias ${caseDetail?.hearings?.length ? `(${caseDetail.hearings.length})` : ''}` },
    { id: 'deadlines', label: `Plazos ${caseDetail?.deadlines?.length ? `(${caseDetail.deadlines.length})` : ''}` },
    { id: 'tasks', label: `Tareas ${caseDetail?.tasks?.length ? `(${caseDetail.tasks.length})` : ''}` },
  ]

  return (
    <AppLayout title="Casos">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-40">
          <Search strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input placeholder="Buscar caso..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
          <option value="">Todos los estados</option>
          {STATUS_OPTS.map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={matterFilter} onChange={e => setMatterFilter(e.target.value)} className="px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
          <option value="">Todas las materias</option>
          {MATTER_OPTS.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => { setSelected(null); setForm({...EMPTY}); setModal('create') }}
          className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid ml-auto">
          <Plus strokeWidth={1.7} className="w-4 h-4" /> Nuevo Caso
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-24 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Briefcase strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400">Sin casos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(c => {
            const st = CASE_STATUS[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div key={c.id} onClick={() => { setDetailCase(c); setDetailTab('info') }}
                className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:shadow-tinted-lg hover:-translate-y-0.5 transition-all duration-300 ease-fluid cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0">
                    <Briefcase strokeWidth={1.7} className="w-5 h-5 text-ink-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className="font-semibold text-ink-900">{c.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${st.cls}`}>{st.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-gold-400/12 text-gold-700">{MATTER[c.matter]||c.matter}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-400">
                      {c.reference && <span className="font-mono">{c.reference}</span>}
                      {c.court && <span>{c.court}</span>}
                      {c.client && <span>Cliente: {c.client.full_name}</span>}
                      {c.opposing_party && <span>vs. {c.opposing_party}</span>}
                    </div>
                  </div>
                  <ChevronRight strokeWidth={1.7} className="w-5 h-5 text-ink-300 group-hover:text-ink-500 flex-shrink-0 transition" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Case Form Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold tracking-tight text-ink-900 text-lg">{modal==='create'?'Nuevo Caso':'Editar Caso'}</h2>
              <button onClick={() => setModal(null)}><X strokeWidth={1.7} className="w-5 h-5 text-ink-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Título del Caso *</label><input className={inp} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej: González c/ Empresa XYZ — Laboral"/></div>
              <div><label className={lbl}>Materia</label>
                <select className={inp} value={form.matter||'civil'} onChange={e=>setForm({...form,matter:e.target.value})}>
                  {MATTER_OPTS.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Estado</label>
                <select className={inp} value={form.status||'new'} onChange={e=>setForm({...form,status:e.target.value})}>
                  {STATUS_OPTS.map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Cliente</label>
                <select className={inp} value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">Sin cliente asignado</option>
                  {clients.map((cl:any)=><option key={cl.id} value={cl.id}>{cl.full_name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Parte contraria</label><input className={inp} value={form.opposing_party||''} onChange={e=>setForm({...form,opposing_party:e.target.value})} placeholder="Empresa ABC S.A."/></div>
              <div><label className={lbl}>Juzgado / Tribunal</label><input className={inp} value={form.court||''} onChange={e=>setForm({...form,court:e.target.value})} placeholder="1er Juzgado Civil"/></div>
              <div><label className={lbl}>Nro. Expediente</label><input className={inp} value={form.court_file_number||''} onChange={e=>setForm({...form,court_file_number:e.target.value})} placeholder="EXP-2024-0001"/></div>
              <div className="col-span-2"><label className={lbl}>Honorario acordado (Gs.)</label><input type="number" className={inp} value={form.agreed_fee||''} onChange={e=>setForm({...form,agreed_fee:e.target.value})} placeholder="0"/></div>
              <div className="col-span-2"><label className={lbl}>Descripción</label><textarea rows={3} className={inp} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripcion del caso..."/></div>
              <div className="col-span-2"><label className={lbl}>Notas internas</label><textarea rows={2} className={inp} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={pending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {pending?'Guardando...':modal==='create'?'Crear Caso':'Guardar Cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Case Detail Slide Panel */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailCase(null)} />
          <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Panel Header */}
            <div className="bg-[#1a1a2e] text-white p-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const st = CASE_STATUS[caseDetail?.status || detailCase.status]
                      return st ? <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${st.cls}`}>{st.label}</span> : null
                    })()}
                    <span className="text-xs text-white/40 font-mono">{caseDetail?.reference || detailCase.reference}</span>
                  </div>
                  <h2 className="font-bold text-xl leading-tight">{caseDetail?.title || detailCase.title}</h2>
                  {(caseDetail?.client || detailCase.client) && (
                    <p className="text-white/60 text-sm mt-1">Cliente: {(caseDetail?.client || detailCase.client)?.full_name}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setSelected(caseDetail || detailCase); setForm({...(caseDetail || detailCase), agreed_fee: (caseDetail || detailCase).agreed_fee || ''}); setModal('edit'); setDetailCase(null) }}
                    className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-medium transition">Editar</button>
                  <button onClick={() => setDetailCase(null)} className="p-2 hover:bg-white/20 rounded-xl transition"><X strokeWidth={1.7} className="w-5 h-5" /></button>
                </div>
              </div>
              {caseDetail && (
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/50">
                  {caseDetail.court && <span className="flex items-center gap-1"><Scale strokeWidth={1.7} className="w-3 h-3" /> {caseDetail.court}</span>}
                  {caseDetail.opposing_party && <span>vs. {caseDetail.opposing_party}</span>}
                  {caseDetail.agreed_fee > 0 && <span className="flex items-center gap-1 text-gold tnum"><DollarSign strokeWidth={1.7} className="w-3 h-3" /> {formatPYG(caseDetail.agreed_fee)}</span>}
                  {caseDetail.total_income > 0 && <span className="flex items-center gap-1 text-gold-300 tnum"><CheckSquare strokeWidth={1.7} className="w-3 h-3" /> Cobrado: {formatPYG(caseDetail.total_income)}</span>}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-sand-200 bg-white flex-shrink-0">
              {DTABS.map(t => (
                <button key={t.id} onClick={() => setDetailTab(t.id)}
                  className={`flex-1 py-3 text-xs font-semibold transition ${detailTab===t.id?'border-b-2 border-ink-900 text-ink-900':'text-ink-400 hover:text-ink-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingDetail ? (
                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-12 bg-sand-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  {detailTab === 'info' && caseDetail && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-paper rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">Materia</p><p className="font-semibold text-ink-800">{MATTER[caseDetail.matter]||caseDetail.matter}</p></div>
                        <div className="bg-paper rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">Estado</p><span className={`text-sm font-semibold ${CASE_STATUS[caseDetail.status]?.cls||''} px-2 py-0.5 rounded-lg`}>{CASE_STATUS[caseDetail.status]?.label||caseDetail.status}</span></div>
                        {caseDetail.court && <div className="bg-paper rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">Juzgado</p><p className="font-medium text-sm text-ink-800">{caseDetail.court}</p></div>}
                        {caseDetail.court_file_number && <div className="bg-paper rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">N° Expediente</p><p className="font-mono text-sm text-ink-800">{caseDetail.court_file_number}</p></div>}
                        {caseDetail.opposing_party && <div className="bg-paper rounded-xl p-4 col-span-2"><p className="text-xs text-ink-400 mb-1">Parte Contraria</p><p className="font-medium text-ink-800">{caseDetail.opposing_party}</p></div>}
                        {caseDetail.agreed_fee > 0 && <div className="bg-ink-900/[0.05] rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">Honorario Acordado</p><p className="font-bold text-ink-900 tnum">{formatPYG(caseDetail.agreed_fee)}</p></div>}
                        {caseDetail.total_income > 0 && <div className="bg-gold-400/12 rounded-xl p-4"><p className="text-xs text-ink-400 mb-1">Total Cobrado</p><p className="font-bold text-gold-700 tnum">{formatPYG(caseDetail.total_income)}</p></div>}
                      </div>
                      {caseDetail.description && <div className="bg-paper rounded-xl p-4"><p className="text-xs text-ink-400 mb-2">Descripción</p><p className="text-sm text-ink-700 whitespace-pre-wrap">{caseDetail.description}</p></div>}
                      {caseDetail.notes && <div className="bg-gold-400/[0.08] rounded-xl p-4"><p className="text-xs text-ink-400 mb-2">Notas internas</p><p className="text-sm text-ink-700 whitespace-pre-wrap">{caseDetail.notes}</p></div>}
                      <p className="text-xs text-ink-400 text-right">Creado: {formatDate(caseDetail.created_at)}</p>
                    </div>
                  )}

                  {detailTab === 'hearings' && (
                    <div className="space-y-3">
                      {!caseDetail?.hearings?.length ? (
                        <div className="text-center py-8 text-ink-400"><Scale strokeWidth={1.7} className="w-8 h-8 mx-auto mb-2 text-ink-200"/><p>Sin audiencias registradas</p></div>
                      ) : caseDetail.hearings.map((h: any) => (
                        <div key={h.id} className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-xl p-4 hover:shadow-tinted-lg transition-all duration-300 ease-fluid">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-ink-900 text-white rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0">
                              <span className="tnum">{h.scheduled_at ? new Date(h.scheduled_at).getDate() : '--'}</span>
                              <span className="text-gold text-[9px]">{h.scheduled_at ? new Date(h.scheduled_at).toLocaleString('es-PY',{month:'short'}).toUpperCase() : ''}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm capitalize text-ink-800">{h.hearing_type}</p>
                              <p className="text-xs text-ink-400">{h.location || 'Sin lugar especificado'}</p>
                              {h.result && <p className="text-xs text-gold-700 mt-1 flex items-center gap-1"><CheckSquare strokeWidth={1.7} className="w-3 h-3" /> {h.result}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-lg ${h.status==='completed'?'bg-gold-400/12 text-gold-700':h.status==='cancelled'?'bg-rose-500/10 text-rose-600':'bg-ink-900/[0.05] text-ink-600'}`}>{h.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === 'deadlines' && (
                    <div className="space-y-2">
                      {!caseDetail?.deadlines?.length ? (
                        <div className="text-center py-8 text-ink-400"><Clock strokeWidth={1.7} className="w-8 h-8 mx-auto mb-2 text-ink-200"/><p>Sin plazos registrados</p></div>
                      ) : caseDetail.deadlines.map((d: any) => {
                        const days = d.due_date ? daysUntil(d.due_date) : null
                        const badge = days !== null && d.status !== 'completed' ? urgencyBadge(days) : null
                        return (
                          <div key={d.id} className={`flex items-center gap-3 bg-white ring-1 ring-ink-900/[0.06] rounded-xl px-4 py-3 ${d.status==='completed'?'opacity-50':''}`}>
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.status==='completed'?'bg-gold-500':d.priority==='critical'?'bg-rose-500':d.priority==='high'?'bg-gold-500':'bg-ink-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-ink-800 ${d.status==='completed'?'line-through text-ink-400':''}`}>{d.title}</p>
                              <p className="text-xs text-ink-400">{formatDate(d.due_date)}{d.legal_basis ? ` · ${d.legal_basis}` : ''}</p>
                            </div>
                            {badge && <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${badge.cls}`}>{badge.label}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {detailTab === 'tasks' && (
                    <div className="space-y-2">
                      {!caseDetail?.tasks?.length ? (
                        <div className="text-center py-8 text-ink-400"><CheckSquare strokeWidth={1.7} className="w-8 h-8 mx-auto mb-2 text-ink-200"/><p>Sin tareas registradas</p></div>
                      ) : caseDetail.tasks.map((t: any) => (
                        <div key={t.id} className={`flex items-center gap-3 bg-white ring-1 ring-ink-900/[0.06] rounded-xl px-4 py-3 ${t.status==='completed'?'opacity-50':''}`}>
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${t.status==='completed'?'bg-gold-500 border-gold-500':'border-ink-300'}`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium text-ink-800 ${t.status==='completed'?'line-through text-ink-400':''}`}>{t.title}</p>
                            {t.due_date && <p className="text-xs text-ink-400">{formatDate(t.due_date)}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${t.priority==='high'||t.priority==='critical'?'bg-gold-400/12 text-gold-700':'bg-ink-900/[0.05] text-ink-500'}`}>{t.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer action */}
            <div className="p-4 border-t border-sand-200 flex gap-2 flex-shrink-0 bg-white">
              <button onClick={() => archiveMut.mutate(detailCase.id)}
                className="flex items-center gap-2 px-4 py-2 ring-1 ring-ink-900/10 text-ink-600 rounded-full text-sm hover:bg-ink-900/5 transition">
                <Archive strokeWidth={1.7} className="w-4 h-4"/> Archivar
              </button>
              <button onClick={() => { setSelected(caseDetail || detailCase); setForm({...(caseDetail || detailCase), agreed_fee: (caseDetail || detailCase).agreed_fee || '', client_id: (caseDetail || detailCase).client_id || ''}); setModal('edit'); setDetailCase(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
                <Edit3 strokeWidth={1.7} className="w-4 h-4" /> Editar Caso
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
