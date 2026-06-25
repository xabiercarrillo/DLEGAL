'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { useState } from 'react'
import {
  Users, Plus, X, Mail, Phone, Shield, ToggleLeft,
  ToggleRight, Key, UserCheck, ChevronRight, Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { v:'firm_admin',  l:'Administrador del estudio', desc:'Acceso total + gestión de usuarios y configuración', badge:'bg-gold-400/12 text-gold-700' },
  { v:'lawyer',      l:'Abogado/a',                 desc:'Gestiona sus propios casos, clientes y agenda',       badge:'bg-ink-900/[0.05] text-ink-600' },
  { v:'secretary',   l:'Secretaria/o',              desc:'Agenda, citas, tareas administrativas',               badge:'bg-ink-900/[0.05] text-ink-600' },
  { v:'solo_lawyer', l:'Abogado independiente',     desc:'Acceso completo sin gestionar equipo',                badge:'bg-ink-900/[0.05] text-ink-600' },
]
const ROLE_MAP: Record<string,typeof ROLES[0]> = Object.fromEntries(ROLES.map(r => [r.v, r]))

const EMPTY = { full_name:'', email:'', password:'', role:'lawyer', phone:'', bar_number:'', specialties:'' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

export default function TeamPage() {
  const qc = useQueryClient()
  const [modal, setModal]   = useState<'create'|'edit'|null>(null)
  const [form, setForm]     = useState<any>({ ...EMPTY })
  const [selected, setSel]  = useState<any>(null)
  const [pwModal, setPwModal] = useState(false)
  const [pwUser, setPwUser]   = useState<any>(null)
  const [newPw, setNewPw]     = useState('')
  const [filterRole, setFilterRole] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['team'], queryFn: () => usersApi.list().then(r => r.data) })
  const allMembers: any[] = data?.items || data || []
  const members = filterRole ? allMembers.filter(m => m.role === filterRole) : allMembers

  const createMut = useMutation({
    mutationFn: (d: any) => usersApi.create(d),
    onSuccess: () => { toast.success('✓ Usuario creado. Email de bienvenida enviado.'); qc.invalidateQueries({ queryKey: ['team'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => usersApi.update(id, d),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({ queryKey: ['team'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const deactivateMut = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { toast.success('Usuario desactivado'); qc.invalidateQueries({ queryKey: ['team'] }) },
    onError: () => toast.error('Error al desactivar'),
  })
  const pwMut = useMutation({
    mutationFn: ({ password }: any) => usersApi.changeMyPassword({ current_password: '', new_password: password }),
    onSuccess: () => { toast.success('Contraseña actualizada'); setPwModal(false); setNewPw('') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })

  function openCreate() { setForm({ ...EMPTY }); setSel(null); setModal('create') }
  function openEdit(m: any) { setForm({ ...m, password: '' }); setSel(m); setModal('edit') }
  function save() {
    if (!form.full_name || !form.email) return toast.error('Nombre y email son obligatorios')
    if (modal === 'create') {
      if (!form.password) return toast.error('La contraseña es obligatoria')
      createMut.mutate(form)
    } else {
      const { password, ...rest } = form
      updateMut.mutate({ id: selected.id, d: rest })
    }
  }

  // Summary by role
  const roleCounts = ROLES.map(r => ({ ...r, count: allMembers.filter(m => m.role === r.v).length }))

  function MemberCard({ m }: { m: any }) {
    const role = ROLE_MAP[m.role]
    return (
      <div className={`bg-white rounded-2xl ring-1 shadow-tinted-sm transition-all duration-300 ease-fluid hover:-translate-y-0.5 hover:shadow-tinted-lg hover:ring-gold-400/40 ${m.is_active===false ? 'opacity-50 ring-ink-900/[0.06]' : 'ring-ink-900/[0.06]'}`}>
        <div className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center flex-shrink-0 text-lg font-bold text-white">
            {m.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-ink-900 truncate">{m.full_name}</p>
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-lg font-semibold mt-0.5 ${role?.badge || 'bg-ink-900/[0.05] text-ink-600'}`}>
                  {role?.l || m.role}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-ink-900/5 text-ink-400 hover:text-ink-700 transition"><Edit3 strokeWidth={1.7} className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setPwUser(m); setPwModal(true) }} className="p-1.5 rounded-lg hover:bg-gold-400/12 text-ink-400 hover:text-gold-700 transition" title="Cambiar contraseña"><Key strokeWidth={1.7} className="w-3.5 h-3.5" /></button>
                {m.is_active !== false && (
                  <button onClick={() => { if (confirm(`¿Desactivar a ${m.full_name}?`)) deactivateMut.mutate(m.id) }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-400 hover:text-rose-500 transition" title="Desactivar">
                    <ToggleRight strokeWidth={1.7} className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <Mail strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{m.email}</span>
              </div>
              {m.phone && (
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Phone strokeWidth={1.7} className="w-3 h-3" />{m.phone}
                </div>
              )}
              {m.bar_number && (
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Shield strokeWidth={1.7} className="w-3 h-3" />Matrícula: {m.bar_number}
                </div>
              )}
              {m.specialties && (
                <p className="text-xs text-ink-400 truncate flex items-center gap-1.5"><UserCheck strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />{m.specialties}</p>
              )}
            </div>
          </div>
        </div>
        {m.is_active === false && (
          <div className="px-5 pb-3">
            <span className="text-xs bg-ink-900/[0.05] text-ink-600 px-2 py-0.5 rounded-lg">Inactivo</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout title="Equipo">
      {/* Role summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {roleCounts.map(r => (
          <button key={r.v} onClick={() => setFilterRole(filterRole === r.v ? '' : r.v)}
            className={`p-4 rounded-2xl ring-1 transition-all duration-300 ease-fluid text-left ${filterRole === r.v ? 'ring-gold-400/40 bg-gold-400/[0.06]' : 'bg-white ring-ink-900/[0.06] shadow-tinted-sm hover:-translate-y-0.5 hover:shadow-tinted-lg hover:ring-gold-400/40'}`}>
            <p className="text-2xl font-bold text-ink-900 tnum">{r.count}</p>
            <p className="text-xs font-semibold text-ink-500 mt-0.5 truncate">{r.l}</p>
            <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded font-bold mt-1 ${r.badge}`}>{r.count} {r.count===1?'usuario':'usuarios'}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-5">
        {filterRole && (
          <div className="flex items-center gap-2 bg-gold-400/12 text-gold-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            Filtro: {ROLE_MAP[filterRole]?.l}
            <button onClick={() => setFilterRole('')} className="hover:text-gold-900"><X strokeWidth={1.7} className="w-3 h-3" /></button>
          </div>
        )}
        <button onClick={openCreate} className="ml-auto flex items-center gap-2 bg-ink-900 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
          <Plus strokeWidth={1.7} className="w-4 h-4" />Invitar miembro
        </button>
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Users strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Sin miembros en el equipo</p>
          <button onClick={openCreate} className="mt-3 text-sm text-gold-700 hover:underline font-medium">+ Invitar primer miembro</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {members.map(m => <MemberCard key={m.id} m={m} />)}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">{modal==='create'?'Invitar miembro del equipo':'Editar miembro'}</h2>
                <p className="text-xs text-ink-400 mt-0.5">{modal==='create'?'Se enviará email de bienvenida automáticamente':'Modificá los datos del miembro'}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Role selection */}
              <div>
                <label className={lbl}>Rol *</label>
                <div className="space-y-2">
                  {ROLES.map(r => (
                    <label key={r.v} onClick={() => setForm({ ...form, role: r.v })}
                      className={`flex items-start gap-3 p-3 rounded-xl ring-1 cursor-pointer transition
                        ${form.role === r.v ? 'ring-gold-400/60 bg-gold-400/[0.06]' : 'ring-ink-900/[0.06] hover:bg-ink-900/[0.02]'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center
                        ${form.role === r.v ? 'border-gold-500 bg-gold-500' : 'border-ink-300'}`}>
                        {form.role === r.v && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-800">{r.l}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className={lbl}>Nombre completo *</label><input className={inp} placeholder="Abog. María González" value={form.full_name} onChange={e => setForm({...form,full_name:e.target.value})} /></div>
              <div><label className={lbl}>Email *</label><input type="email" className={inp} placeholder="abogado@tudominio.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
              {modal === 'create' && <div><label className={lbl}>Contraseña temporal *</label><input type="password" className={inp} placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm({...form,password:e.target.value})} /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Teléfono</label><input className={inp} placeholder="0981234567" value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></div>
                <div><label className={lbl}>Matrícula / Colegio</label><input className={inp} placeholder="Nro. matrícula" value={form.bar_number||''} onChange={e => setForm({...form,bar_number:e.target.value})} /></div>
              </div>
              <div><label className={lbl}>Especialidades</label><input className={inp} placeholder="Civil, Laboral, Familia…" value={form.specialties||''} onChange={e => setForm({...form,specialties:e.target.value})} /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.06]">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Invitar miembro' : 'Guardar cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {pwModal && pwUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">Cambiar contraseña</h2>
                <p className="text-xs text-ink-400 mt-0.5">{pwUser.full_name}</p>
              </div>
              <button onClick={() => setPwModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Nueva contraseña *</label>
                <input type="password" className={inp} placeholder="Mínimo 6 caracteres" value={newPw} onChange={e => setNewPw(e.target.value)} />
                <p className="text-xs text-ink-400 mt-1">El usuario deberá usar esta contraseña en su próximo inicio de sesión.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  if (!newPw || newPw.length < 6) return toast.error('Mínimo 6 caracteres')
                  pwMut.mutate({ password: newPw })
                }} disabled={pwMut.isPending}
                  className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                  {pwMut.isPending ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
                <button onClick={() => setPwModal(false)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
