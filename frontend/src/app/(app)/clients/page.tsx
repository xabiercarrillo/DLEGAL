'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, portalApi } from '@/lib/api'
import { CASE_STATUS, MATTER, formatDate, formatPYG } from '@/lib/utils'
import { useState } from 'react'
import { Users, Plus, Phone, Mail, Building2, User, X, Search, ChevronRight, Briefcase, DollarSign, ExternalLink, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const CLIENT_TYPE: Record<string,string> = { natural: 'Persona Natural', empresa: 'Empresa', gobierno: 'Gobierno', otro: 'Otro' }
const EMPTY = { full_name: '', client_type: 'natural', email: '', phone: '', ruc: '', ci: '', city: 'Asuncion', address: '', notes: '' }

export default function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'create'|'edit'|null>(null)
  const [form, setForm] = useState<any>({...EMPTY})
  const [selected, setSelected] = useState<any>(null)
  const [detailClient, setDetailClient] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search, limit: 50 }).then(r => r.data),
  })
  const { data: clientDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['client-detail', detailClient?.id],
    queryFn: () => clientsApi.detail(detailClient.id).then(r => r.data),
    enabled: !!detailClient?.id,
  })
  const items: any[] = data?.items || data || []

  const createMut = useMutation({
    mutationFn: (d: any) => clientsApi.create(d),
    onSuccess: () => { toast.success('Cliente creado'); qc.invalidateQueries({ queryKey: ['clients'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => clientsApi.update(id, d),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['client-detail'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const save = () => {
    if (!form.full_name) return toast.error('Nombre requerido')
    if (modal === 'create') createMut.mutate(form)
    else if (selected) updateMut.mutate({ id: selected.id, d: form })
  }

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const lbl = 'block text-xs font-semibold text-ink-600 mb-1'
  const pending = createMut.isPending || updateMut.isPending

  return (
    <AppLayout title="Clientes">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input placeholder="Buscar por nombre, email, CI, RUC..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
        </div>
        <button onClick={() => { setSelected(null); setForm({...EMPTY}); setModal('create') }}
          className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
          <Plus strokeWidth={1.7} className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Users strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Sin clientes registrados</p>
          <button onClick={() => { setSelected(null); setForm({...EMPTY}); setModal('create') }}
            className="mt-4 text-sm text-gold-700 hover:text-gold-800 hover:underline font-medium">+ Agregar primer cliente</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(c => (
            <div key={c.id} onClick={() => setDetailClient(c)}
              className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:shadow-tinted-lg hover:-translate-y-0.5 transition-all duration-300 ease-fluid cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.client_type==='empresa'?'bg-gold-400/12':'bg-ink-900/[0.06]'}`}>
                  {c.client_type==='empresa'?<Building2 strokeWidth={1.7} className="w-5 h-5 text-gold-700"/>:<User strokeWidth={1.7} className="w-5 h-5 text-ink-700"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{c.full_name}</p>
                  <p className="text-xs text-ink-400 mb-2">{CLIENT_TYPE[c.client_type]||c.client_type}{c.ci?` · CI ${c.ci}`:''}{c.ruc?` · RUC ${c.ruc}`:''}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.email&&<span className="flex items-center gap-1 text-xs text-ink-500"><Mail strokeWidth={1.7} className="w-3 h-3"/>{c.email}</span>}
                    {c.phone&&<span className="flex items-center gap-1 text-xs text-ink-500"><Phone strokeWidth={1.7} className="w-3 h-3"/>{c.phone}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active!==false?'bg-gold-400/12 text-gold-700':'bg-ink-900/[0.05] text-ink-500'}`}>
                    {c.is_active!==false?'Activo':'Inactivo'}
                  </span>
                  <ChevronRight strokeWidth={1.7} className="w-4 h-4 text-ink-200 group-hover:text-ink-400 transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold tracking-tight text-ink-900 text-lg">{modal==='create'?'Nuevo Cliente':'Editar Cliente'}</h2>
              <button onClick={() => setModal(null)}><X strokeWidth={1.7} className="w-5 h-5 text-ink-400 hover:text-ink-600" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Nombre / Razon Social *</label><input className={inp} value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Juan Gonzalez / ACME S.A."/></div>
              <div><label className={lbl}>Tipo</label>
                <select className={inp} value={form.client_type||'natural'} onChange={e=>setForm({...form,client_type:e.target.value})}>
                  {Object.entries(CLIENT_TYPE).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Ciudad</label><input className={inp} value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Asuncion"/></div>
              <div><label className={lbl}>CI</label><input className={inp} value={form.ci||''} onChange={e=>setForm({...form,ci:e.target.value})} placeholder="1234567"/></div>
              <div><label className={lbl}>RUC</label><input className={inp} value={form.ruc||''} onChange={e=>setForm({...form,ruc:e.target.value})} placeholder="80123456-7"/></div>
              <div><label className={lbl}>Email</label><input type="email" className={inp} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="cliente@email.com"/></div>
              <div><label className={lbl}>Telefono</label><input className={inp} value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="0981234567"/></div>
              <div className="col-span-2"><label className={lbl}>Direccion</label><input className={inp} value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Av. Mariscal Lopez 1234"/></div>
              <div className="col-span-2"><label className={lbl}>Notas internas</label><textarea rows={2} className={inp} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notas privadas..."/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={pending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {pending?'Guardando...':modal==='create'?'Crear Cliente':'Guardar Cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Slide Panel */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailClient(null)} />
          <div className="relative bg-white w-full max-w-xl h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="bg-[#1a1a2e] text-white p-5 flex-shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {(clientDetail?.client_type||detailClient.client_type)==='empresa'
                    ? <Building2 className="w-7 h-7 text-white/80" />
                    : <span>{detailClient.full_name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-xl">{detailClient.full_name}</h2>
                  <p className="text-white/50 text-sm">{CLIENT_TYPE[(clientDetail?.client_type||detailClient.client_type)] || detailClient.client_type}</p>
                  {clientDetail && (
                    <div className="flex gap-3 mt-2 text-xs text-white/50">
                      {clientDetail.ci && <span>CI {clientDetail.ci}</span>}
                      {clientDetail.ruc && <span>RUC {clientDetail.ruc}</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setSelected(clientDetail || detailClient); setForm({...(clientDetail || detailClient)}); setModal('edit'); setDetailClient(null) }}
                    className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition">Editar</button>
                  <button onClick={() => setDetailClient(null)} className="p-2 hover:bg-white/20 rounded-xl"><X strokeWidth={1.7} className="w-5 h-5" /></button>
                </div>
              </div>

              {clientDetail && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold tnum">{clientDetail.cases_count || 0}</p>
                    <p className="text-white/50 text-xs">Casos</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gold-300 tnum">{formatPYG(clientDetail.total_income || 0)}</p>
                    <p className="text-white/50 text-xs">Cobrado</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gold tnum">{formatPYG(clientDetail.pending_amount || 0)}</p>
                    <p className="text-white/50 text-xs">Por cobrar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact info */}
            {clientDetail && (
              <div className="flex gap-3 p-4 border-b border-sand-200 flex-shrink-0 flex-wrap">
                {clientDetail.phone && <a href={`tel:${clientDetail.phone}`} className="flex items-center gap-2 px-3 py-2 bg-paper hover:bg-sand-100 rounded-xl text-sm text-ink-700 transition"><Phone strokeWidth={1.7} className="w-4 h-4 text-ink-400"/>{clientDetail.phone}</a>}
                {clientDetail.email && <a href={`mailto:${clientDetail.email}`} className="flex items-center gap-2 px-3 py-2 bg-paper hover:bg-sand-100 rounded-xl text-sm text-ink-700 transition"><Mail strokeWidth={1.7} className="w-4 h-4 text-ink-400"/>{clientDetail.email}</a>}
                {clientDetail.city && <span className="flex items-center gap-2 px-3 py-2 bg-paper rounded-xl text-sm text-ink-500"><MapPin strokeWidth={1.7} className="w-4 h-4 text-ink-400"/> {clientDetail.city}</span>}
              </div>
            )}

            {/* Portal del Cliente */}
            {clientDetail?.email && (
              <div className="px-4 pb-3">
                <button
                  onClick={async () => {
                    try {
                      const { data } = await portalApi.invite(clientDetail.id)
                      toast.success(`Acceso al portal enviado a ${clientDetail.email}\nContraseña temporal: ${data.temp_password}`)
                    } catch (err: any) {
                      toast.error(err.response?.data?.detail || 'Error al invitar')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink-900/5 hover:bg-ink-900/10 ring-1 ring-ink-900/15 text-ink-800 rounded-full text-sm font-medium transition"
                >
                  <ExternalLink strokeWidth={1.7} className="w-4 h-4" />
                  Dar acceso al Portal del Cliente
                </button>
              </div>
            )}

            {/* Cases list */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="h-14 bg-sand-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-ink-600 mb-3 flex items-center gap-2">
                    <Briefcase strokeWidth={1.7} className="w-4 h-4" /> Casos ({clientDetail?.cases?.length || 0})
                  </h3>
                  {!clientDetail?.cases?.length ? (
                    <div className="text-center py-8 text-ink-400">
                      <Briefcase strokeWidth={1.7} className="w-8 h-8 mx-auto mb-2 text-ink-200" />
                      <p className="text-sm">Sin casos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientDetail.cases.map((c: any) => {
                        const st = CASE_STATUS[c.status]
                        return (
                          <div key={c.id} className="bg-paper rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0">
                                <Briefcase strokeWidth={1.7} className="w-4 h-4 text-ink-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-ink-900 truncate">{c.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-xs text-ink-400">{c.reference}</span>
                                  {st && <span className={`text-xs px-2 py-0.5 rounded-lg ${st.cls}`}>{st.label}</span>}
                                  <span className="text-xs text-ink-400">{MATTER[c.matter]||c.matter}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {clientDetail?.notes && (
                    <div className="mt-4 bg-gold-400/[0.08] rounded-xl p-4 ring-1 ring-gold-400/20">
                      <p className="text-xs font-semibold text-ink-600 mb-1">Notas internas</p>
                      <p className="text-sm text-ink-700">{clientDetail.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
