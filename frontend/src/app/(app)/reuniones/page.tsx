'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meetingsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Video, Calendar, Clock, Copy, ExternalLink, Plus, Users, CheckCircle, AlertCircle } from 'lucide-react'

function MeetBadge({ provider }: { provider: string }) {
  if (provider === 'zoom')
    return <span className="flex items-center gap-1 text-xs bg-ink-900/[0.05] text-ink-600 px-2 py-0.5 rounded-full font-medium"><Video className="w-3 h-3" strokeWidth={1.7} />Zoom</span>
  if (provider === 'google_meet')
    return <span className="flex items-center gap-1 text-xs bg-gold-400/12 text-gold-700 px-2 py-0.5 rounded-full font-medium"><Calendar className="w-3 h-3" strokeWidth={1.7} />Google Meet</span>
  return null
}

export default function ReunionesPage() {
  const qc = useQueryClient()

  const [modal, setModal] = useState<'zoom' | 'meet' | null>(null)
  const [form, setForm] = useState({ topic: '', start_time: '', duration_minutes: 60, agenda: '', attendees: '' })
  const [created, setCreated] = useState<any>(null)

  // Google Calendar events
  const { data: gcalData } = useQuery({
    queryKey: ['gcal_events'],
    queryFn: () => meetingsApi.calendarEvents(30).then(r => r.data),
    retry: false,
  })
  const gcalEvents: any[] = gcalData?.events || []

  // Calendly
  const { data: calendlyData } = useQuery({
    queryKey: ['calendly_events'],
    queryFn: () => meetingsApi.calendlyScheduled(30).then(r => r.data),
    retry: false,
  })
  const calendlyEvents: any[] = calendlyData?.events || []

  const zoomMut = useMutation({
    mutationFn: (data: any) => meetingsApi.createZoom(data).then(r => r.data),
    onSuccess: (data) => { setCreated(data); toast.success('Reunión Zoom creada'); qc.invalidateQueries({ queryKey: ['gcal_events'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear reunión Zoom'),
  })

  const meetMut = useMutation({
    mutationFn: (data: any) => meetingsApi.createGoogleMeet(data).then(r => r.data),
    onSuccess: (data) => { setCreated(data); toast.success('Google Meet creado'); qc.invalidateQueries({ queryKey: ['gcal_events'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear Google Meet'),
  })

  const handleCreate = () => {
    if (!form.topic || !form.start_time) { toast.error('Completá el tema y la fecha'); return }
    if (modal === 'zoom') {
      zoomMut.mutate({ topic: form.topic, start_time: form.start_time, duration_minutes: form.duration_minutes, agenda: form.agenda })
    } else {
      const start = new Date(form.start_time).toISOString()
      const end = new Date(new Date(form.start_time).getTime() + form.duration_minutes * 60000).toISOString()
      const attendees = form.attendees.split(',').map(s => s.trim()).filter(Boolean)
      meetMut.mutate({ title: form.topic, start_dt: start, end_dt: end, description: form.agenda, attendees })
    }
  }

  const copyLink = (url: string) => { navigator.clipboard.writeText(url); toast.success('Link copiado') }

  const allEvents = [
    ...gcalEvents.map((e: any) => ({ ...e, source: 'google_calendar', title: e.summary, when: e.start?.dateTime || e.start?.date, url: e.hangoutLink || e.htmlLink })),
    ...calendlyEvents.map((e: any) => ({ ...e, source: 'calendly', title: e.name, when: e.start_time, url: e.location?.join_url || '' })),
  ].sort((a, b) => (a.when || '').localeCompare(b.when || ''))

  return (
    <AppLayout title="Reuniones Virtuales">
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-ink-500 text-sm">Creá videollamadas Zoom o Google Meet y vincurálas a audiencias</p>
        <div className="flex gap-2">
          <button onClick={() => { setModal('zoom'); setCreated(null); setForm({ topic: '', start_time: '', duration_minutes: 60, agenda: '', attendees: '' }) }}
            className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
            <Video className="w-4 h-4" strokeWidth={1.7} /> Nueva reunión Zoom
          </button>
          <button onClick={() => { setModal('meet'); setCreated(null); setForm({ topic: '', start_time: '', duration_minutes: 60, agenda: '', attendees: '' }) }}
            className="flex items-center gap-2 ring-1 ring-ink-900/10 text-ink-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-ink-900/5 transition">
            <Calendar className="w-4 h-4" strokeWidth={1.7} /> Nuevo Google Meet
          </button>
        </div>
      </div>

      {/* Created meeting result */}
      {created && (
        <div className="bg-gold-400/10 ring-1 ring-gold-400/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-gold-700" strokeWidth={1.7} />
            <span className="font-semibold text-ink-900">Reunión creada exitosamente</span>
            <MeetBadge provider={created.provider} />
          </div>
          <div className="space-y-2">
            {created.join_url && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                <span className="text-xs text-ink-500 w-20 flex-shrink-0">Link cliente:</span>
                <a href={created.join_url} target="_blank" className="text-ink-700 text-sm truncate hover:underline flex-1">{created.join_url}</a>
                <button onClick={() => copyLink(created.join_url)} className="text-ink-400 hover:text-ink-700 transition"><Copy className="w-4 h-4" strokeWidth={1.7} /></button>
              </div>
            )}
            {created.meet_url && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                <span className="text-xs text-ink-500 w-20 flex-shrink-0">Google Meet:</span>
                <a href={created.meet_url} target="_blank" className="text-ink-700 text-sm truncate hover:underline flex-1">{created.meet_url}</a>
                <button onClick={() => copyLink(created.meet_url)} className="text-ink-400 hover:text-ink-700 transition"><Copy className="w-4 h-4" strokeWidth={1.7} /></button>
              </div>
            )}
            {created.start_url && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                <span className="text-xs text-ink-500 w-20 flex-shrink-0">Link host:</span>
                <a href={created.start_url} target="_blank" className="text-sm text-ink-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" strokeWidth={1.7} />Abrir como host</a>
              </div>
            )}
            {created.password && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                <span className="text-xs text-ink-500 w-20 flex-shrink-0">Contraseña:</span>
                <span className="font-mono text-sm text-ink-700">{created.password}</span>
                <button onClick={() => copyLink(created.password)} className="text-ink-400 hover:text-ink-700 transition"><Copy className="w-4 h-4" strokeWidth={1.7} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming meetings */}
      <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900 tracking-tight">Próximas reuniones (30 días)</h2>
          <span className="text-xs text-ink-400">{allEvents.length} eventos</span>
        </div>
        {allEvents.length === 0 ? (
          <div className="py-16 text-center">
            <Video className="w-12 h-12 text-ink-200 mx-auto mb-3" strokeWidth={1.7} />
            <p className="text-ink-500 font-medium">Sin reuniones agendadas</p>
            <p className="text-ink-400 text-sm mt-1">Conectá Zoom o Google Calendar en Integraciones para ver tus reuniones aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-900/[0.05]">
            {allEvents.map((ev: any, i: number) => {
              const d = ev.when ? new Date(ev.when) : null
              const provider = ev.source === 'calendly' ? 'calendly' : (ev.hangoutLink ? 'google_meet' : 'google_calendar')
              return (
                <div key={i} className="px-5 py-4 hover:bg-paper transition flex items-center gap-4">
                  <div className="w-12 text-center flex-shrink-0">
                    {d ? <><p className="text-xs text-ink-400">{d.toLocaleDateString('es-PY', { month: 'short' })}</p><p className="text-xl font-bold text-ink-800 leading-none">{d.getDate()}</p></> : <Clock className="w-5 h-5 text-ink-300 mx-auto" strokeWidth={1.7} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-800 truncate">{ev.title || 'Sin título'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {d && <span className="text-xs text-ink-400">{d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</span>}
                      <MeetBadge provider={provider} />
                    </div>
                  </div>
                  {ev.url && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyLink(ev.url)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-900/[0.05] transition" title="Copiar link"><Copy className="w-4 h-4" strokeWidth={1.7} /></button>
                      <a href={ev.url} target="_blank" className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-900/[0.05] transition" title="Abrir"><ExternalLink className="w-4 h-4" strokeWidth={1.7} /></a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create meeting modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-ink-900/[0.06] flex items-center gap-3">
              {modal === 'zoom' ? <Video className="w-5 h-5 text-ink-700" strokeWidth={1.7} /> : <Calendar className="w-5 h-5 text-gold-600" strokeWidth={1.7} />}
              <h3 className="font-display font-semibold text-ink-900 tracking-tight">Nueva reunión {modal === 'zoom' ? 'Zoom' : 'Google Meet'}</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Tema / título *</label>
                <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Ej: Audiencia Exp. 2024-001" className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Fecha y hora *</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Duración (min)</label>
                  <select value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
                    {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>
              {modal === 'meet' && (
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Participantes (emails separados por coma)</label>
                  <input value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} placeholder="cliente@email.com, abogado@email.com" className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Descripción / agenda</label>
                <textarea value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} rows={3} placeholder="Puntos a tratar en la reunión..." className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 ring-1 ring-ink-900/10 text-ink-700 rounded-full text-sm font-medium hover:bg-ink-900/5 transition">Cancelar</button>
              <button onClick={handleCreate} disabled={zoomMut.isPending || meetMut.isPending}
                className="px-5 py-2 rounded-full text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {(zoomMut.isPending || meetMut.isPending) ? 'Creando...' : 'Crear reunión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
