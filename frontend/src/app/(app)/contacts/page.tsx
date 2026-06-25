'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/lib/api'
import { useState } from 'react'
import { Contact2, Plus, X, Star, Phone, Mail, Search, Edit3, Trash2, MapPin, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLORS: Record<string,string> = {
  juez:'bg-gold-400/12 text-gold-700', secretario:'bg-ink-900/[0.05] text-ink-600',
  abogado:'bg-ink-900/[0.06] text-ink-700', notario:'bg-gold-400/12 text-gold-700',
  perito:'bg-ink-900/[0.05] text-ink-600', mediador:'bg-ink-900/[0.05] text-ink-600',
  funcionario:'bg-ink-900/[0.05] text-ink-600', otro:'bg-ink-900/[0.05] text-ink-500',
}
const TYPES = ['juez','secretario','abogado','notario','perito','mediador','funcionario','otro']
const TYPE_LABELS: Record<string,string> = {
  juez:'Juez', secretario:'Secretario/a', abogado:'Abogado/a', notario:'Notario/a',
  perito:'Perito', mediador:'Mediador/a', funcionario:'Funcionario', otro:'Otro',
}
const EMPTY = { full_name:'', contact_type:'juez', institution:'', position:'', phone:'', email:'', city:'Asunción', notes:'' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [typeF, setTypeF]     = useState('')
  const [modal, setModal]     = useState<'create'|'edit'|null>(null)
  const [form, setForm]       = useState<any>({ ...EMPTY })
  const [selected, setSel]    = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, typeF],
    queryFn: () => contactsApi.list({ search, contact_type: typeF||undefined, limit: 100 }).then(r => r.data),
  })
  const items: any[] = data?.items || data || []
  const favs  = items.filter(c => c.is_favorite)
  const rest  = items.filter(c => !c.is_favorite)

  const createMut = useMutation({
    mutationFn: (d: any) => contactsApi.create(d),
    onSuccess: () => { toast.success('Contacto agregado'); qc.invalidateQueries({ queryKey: ['contacts'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => contactsApi.update(id, d),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['contacts'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['contacts'] }) },
    onError: () => toast.error('Error al eliminar'),
  })
  const favMut = useMutation({
    mutationFn: (id: string) => contactsApi.favorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  function openCreate() { setForm({ ...EMPTY }); setSel(null); setModal('create') }
  function openEdit(c: any) { setForm({ ...c }); setSel(c); setModal('edit') }
  function save() {
    if (!form.full_name) return toast.error('Nombre requerido')
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: selected.id, d: form })
  }

  function ContactCard({ c }: { c: any }) {
    return (
      <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm hover:shadow-tinted-lg hover:-translate-y-0.5 transition-all duration-300 ease-fluid group">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-ink-900/[0.06] flex items-center justify-center flex-shrink-0 font-bold text-ink-600 text-sm">
            {c.full_name?.split(' ').slice(0,2).map((n:string)=>n[0]?.toUpperCase()).join('') || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-bold text-ink-900 truncate text-sm">{c.full_name}</p>
              <button onClick={() => favMut.mutate(c.id)} className="flex-shrink-0 ml-auto">
                <Star className={`w-3.5 h-3.5 transition ${c.is_favorite ? 'fill-gold-400 text-gold-400' : 'text-ink-200 hover:text-gold-300'}`} />
              </button>
            </div>
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-lg font-semibold mb-1.5 ${TYPE_COLORS[c.contact_type]||'bg-ink-900/[0.05] text-ink-500'}`}>
              {TYPE_LABELS[c.contact_type] || c.contact_type}
            </span>
            {(c.institution || c.position) && (
              <p className="text-xs text-ink-400 truncate flex items-center gap-1"><Briefcase strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />{[c.position, c.institution].filter(Boolean).join(' — ')}</p>
            )}
            {c.city && <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5"><MapPin strokeWidth={1.7} className="w-3 h-3" />{c.city}</p>}
            <div className="flex items-center gap-3 mt-2">
              {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 transition"><Phone strokeWidth={1.7} className="w-3 h-3" />{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 truncate max-w-[140px] transition"><Mail strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />{c.email}</a>}
            </div>
          </div>
        </div>
        {/* Actions on hover */}
        <div className="flex gap-1 mt-2.5 pt-2.5 border-t border-sand-100 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 rounded-xl transition">
            <Edit3 strokeWidth={1.7} className="w-3.5 h-3.5" />Editar
          </button>
          {c.phone && (
            <a href={`https://wa.me/595${c.phone.replace(/^0/,'')}`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gold-700 hover:bg-gold-400/10 rounded-xl transition">
              <Phone strokeWidth={1.7} className="w-3.5 h-3.5" />WhatsApp
            </a>
          )}
          <button onClick={() => { if (confirm(`¿Eliminar a ${c.full_name}?`)) deleteMut.mutate(c.id) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-ink-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition">
            <Trash2 strokeWidth={1.7} className="w-3.5 h-3.5" />Eliminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout title="Contactos Profesionales">
      {/* Filters + New */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input placeholder="Buscar por nombre, institución…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
        </div>
        <select className="px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
          value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={openCreate} className="ml-auto flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
          <Plus strokeWidth={1.7} className="w-4 h-4" />Agregar Contacto
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_,i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Contact2 strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Sin contactos profesionales</p>
          <button onClick={openCreate} className="mt-3 text-sm text-gold-700 hover:text-gold-800 hover:underline font-medium">+ Agregar primer contacto</button>
        </div>
      ) : (
        <div className="space-y-6">
          {favs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gold-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />Favoritos ({favs.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{favs.map(c => <ContactCard key={c.id} c={c} />)}</div>
            </div>
          )}
          <div>
            {favs.length > 0 && <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Todos los contactos ({rest.length})</h3>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{(favs.length > 0 ? rest : items).map(c => <ContactCard key={c.id} c={c} />)}</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold tracking-tight text-white">{modal==='create'?'Nuevo Contacto Profesional':'Editar Contacto'}</h2>
                <p className="text-xs text-white/50 mt-0.5">Jueces, secretarios, peritos y otros colegas</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className={lbl}>Nombre completo *</label><input className={inp} value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Dr. Roberto Díaz Alonso" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Tipo de contacto</label>
                  <select className={inp} value={form.contact_type||'juez'} onChange={e=>setForm({...form,contact_type:e.target.value})}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Ciudad</label><input className={inp} value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})} /></div>
              </div>
              <div><label className={lbl}>Institución / Juzgado</label><input className={inp} value={form.institution||''} onChange={e=>setForm({...form,institution:e.target.value})} placeholder="1er Juzgado Civil y Comercial" /></div>
              <div><label className={lbl}>Cargo</label><input className={inp} value={form.position||''} onChange={e=>setForm({...form,position:e.target.value})} placeholder="Juez de Primera Instancia" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Teléfono</label><input className={inp} value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="0981 234 567" /></div>
                <div><label className={lbl}>Email</label><input type="email" className={inp} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              </div>
              <div><label className={lbl}>Notas</label><textarea rows={2} className={`${inp} resize-none`} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Sala 3, Palacio de Justicia, atiende lunes a viernes…" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-sand-200">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Guardar Contacto' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
