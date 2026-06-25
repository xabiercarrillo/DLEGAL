'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery } from '@tanstack/react-query'
import { calendarApi } from '@/lib/api'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, Scale, CalendarDays, ListOrdered, Grid3x3, Plus, MapPin } from 'lucide-react'
import Link from 'next/link'

const MONTHS  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_L  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

const EC: Record<string,{ bg: string; text: string; dot: string; label: string; href: string }> = {
  hearing:     { bg:'bg-ink-900',   text:'text-ink-700',  dot:'bg-ink-900',   label:'Audiencia',  href:'/hearings' },
  deadline:    { bg:'bg-rose-500',  text:'text-rose-600', dot:'bg-rose-500',  label:'Plazo',      href:'/deadlines' },
  appointment: { bg:'bg-gold-500',  text:'text-gold-700', dot:'bg-gold-500',  label:'Cita',       href:'/appointments' },
  task:        { bg:'bg-ink-400',   text:'text-ink-500',  dot:'bg-ink-400',   label:'Tarea',      href:'/tasks' },
}

function pad2(n: number) { return String(n).padStart(2,'0') }
function ds(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }
function matchDate(event: any, dateStr: string) {
  const src = event.date || event.scheduled_at || event.due_date || ''
  return src.startsWith(dateStr)
}
function eventTime(e: any) {
  const src = e.scheduled_at || e.date || ''
  if (!src.includes('T')) return null
  return new Date(src).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})
}

export default function CalendarPage() {
  const today = new Date()
  const [cur, setCur]     = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSel] = useState<number | null>(today.getDate())
  const [view, setView]   = useState<'month'|'week'|'agenda'>('month')

  /* ── current week start (monday-based) ── */
  const weekStart = useMemo(() => {
    const d = selectedDay
      ? new Date(cur.getFullYear(), cur.getMonth(), selectedDay)
      : new Date(cur.getFullYear(), cur.getMonth(), 1)
    const dow = d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return mon
  }, [cur, selectedDay])

  const { data: eventsData } = useQuery({
    queryKey: ['calendar', cur.toISOString()],
    queryFn: () => calendarApi.events(
      new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString(),
      new Date(cur.getFullYear(), cur.getMonth() + 1, 0).toISOString()
    ).then(r => r.data?.events || []),
  })
  const events: any[] = eventsData || []

  const firstDay    = new Date(cur.getFullYear(), cur.getMonth(), 1).getDay()
  const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const getEventsForDay = (day: number | Date) => {
    const dateStr = day instanceof Date ? ds(day) : `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(day)}`
    return events.filter(e => matchDate(e, dateStr))
  }

  const weekDays = Array.from({length:7},(_,i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d })

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : []
  const selectedDateStr = selectedDay
    ? new Date(cur.getFullYear(), cur.getMonth(), selectedDay)
        .toLocaleDateString('es-PY',{weekday:'long',day:'numeric',month:'long'})
    : ''

  /* Agenda: next 30 days */
  const agendaDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      const evs = events.filter(e => matchDate(e, ds(d)))
      if (evs.length > 0) days.push({ date: d, events: evs })
    }
    return days
  }, [events])

  const prevPeriod = () => {
    if (view === 'week') {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() - 7); setSel(d.getDate())
      setCur(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      setCur(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    }
  }
  const nextPeriod = () => {
    if (view === 'week') {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + 7); setSel(d.getDate())
      setCur(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      setCur(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    }
  }
  const goToday = () => {
    setCur(new Date(today.getFullYear(), today.getMonth(), 1))
    setSel(today.getDate())
  }

  const title = view === 'week'
    ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
    : `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`

  return (
    <AppLayout title="Calendario">
      <div className="flex gap-5 h-full">
        {/* Main panel */}
        <div className="flex-1 bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden min-w-0 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-ink-900/[0.06] gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={prevPeriod} className="p-2 hover:bg-ink-900/[0.05] rounded-xl transition"><ChevronLeft className="w-4 h-4" strokeWidth={1.7} /></button>
              <h2 className="text-base font-display font-semibold text-ink-900 tracking-tight min-w-[200px] text-center">{title}</h2>
              <button onClick={nextPeriod} className="p-2 hover:bg-ink-900/[0.05] rounded-xl transition"><ChevronRight className="w-4 h-4" strokeWidth={1.7} /></button>
              <button onClick={goToday} className="px-3 py-1.5 text-xs bg-ink-900 text-white rounded-lg hover:bg-ink-800 transition">Hoy</button>
            </div>
            <div className="flex items-center gap-2">
              {/* Legend */}
              <div className="hidden md:flex gap-3 text-xs text-ink-400 mr-2">
                {Object.entries(EC).map(([k,v]) => (
                  <span key={k} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${v.bg}`} />{v.label}</span>
                ))}
              </div>
              {/* View switcher */}
              <div className="flex bg-ink-900/[0.05] rounded-xl p-0.5 gap-0.5">
                {([['month','month',Grid3x3],['week','week',ListOrdered],['agenda','agenda',CalendarDays]] as any[]).map(([k,l,Icon]) => (
                  <button key={k} onClick={() => setView(k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${view===k ? 'bg-white shadow-tinted-sm text-ink-900' : 'text-ink-500 hover:text-ink-700'}`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                    {l.charAt(0).toUpperCase()+l.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Month view ── */}
          {view === 'month' && (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-7">
                {DAYS.map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-ink-400 uppercase border-b border-ink-900/[0.06]">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-ink-900/[0.05]">
                {cells.map((day, i) => {
                  const dayEvents = day ? getEventsForDay(day) : []
                  const isToday = day === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear()
                  const isSelected = day === selectedDay
                  return (
                    <div key={i} onClick={() => day && setSel(day)}
                      className={`min-h-[80px] p-2 cursor-pointer transition ${!day ? 'bg-sand-50/50 cursor-default' : isSelected ? 'bg-gold-400/10' : 'hover:bg-paper'}`}>
                      {day && (
                        <>
                          <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? 'bg-ink-900 text-white' : isSelected ? 'bg-gold-400/25 text-ink-900' : 'text-ink-700'}`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0,2).map((e:any,j:number) => (
                              <div key={j} className={`${EC[e.type]?.bg || 'bg-ink-400'} text-white text-[10px] px-1.5 py-0.5 rounded truncate`}>{e.title}</div>
                            ))}
                            {dayEvents.length > 2 && <div className="text-[10px] text-ink-400 pl-1">+{dayEvents.length-2} más</div>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Week view ── */}
          {view === 'week' && (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-7 border-b border-ink-900/[0.06]">
                {weekDays.map((d,i) => {
                  const isTod = ds(d) === ds(today)
                  const isSel = selectedDay === d.getDate() && cur.getMonth() === d.getMonth()
                  return (
                    <button key={i} onClick={() => { setSel(d.getDate()); setCur(new Date(d.getFullYear(),d.getMonth(),1)) }}
                      className={`py-3 text-center transition hover:bg-paper ${isSel ? 'bg-gold-400/10' : ''}`}>
                      <p className="text-xs text-ink-400 uppercase">{DAYS[d.getDay()]}</p>
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mx-auto mt-1 ${isTod ? 'bg-ink-900 text-white' : 'text-ink-700'}`}>{d.getDate()}</div>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-7 divide-x divide-ink-900/[0.05]">
                {weekDays.map((d,i) => {
                  const dayEvs = getEventsForDay(d)
                  return (
                    <div key={i} className="min-h-[200px] p-2 space-y-1.5">
                      {dayEvs.length === 0 ? (
                        <p className="text-[10px] text-ink-300 text-center mt-4">—</p>
                      ) : dayEvs.map((e:any,j:number) => (
                        <div key={j} className={`${EC[e.type]?.bg || 'bg-ink-400'} bg-opacity-10 border border-current text-xs px-2 py-1.5 rounded-xl ${EC[e.type]?.text || 'text-ink-600'}`}>
                          {eventTime(e) && <p className="text-[10px] opacity-70 mb-0.5">{eventTime(e)}</p>}
                          <p className="font-medium truncate">{e.title}</p>
                          {e.location && <p className="flex items-center gap-1 text-[10px] opacity-60 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={1.7} />{e.location}</p>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Agenda view ── */}
          {view === 'agenda' && (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {agendaDays.length === 0 ? (
                <div className="text-center py-12 text-ink-400">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 text-ink-200" strokeWidth={1.7} />
                  <p className="font-medium">Sin eventos en los próximos 30 días</p>
                </div>
              ) : agendaDays.map(({ date, events: devs }, i) => (
                <div key={i}>
                  <div className={`flex items-center gap-3 mb-2 ${ds(date) === ds(today) ? 'text-ink-900' : 'text-ink-500'}`}>
                    <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white text-xs font-bold ${ds(date) === ds(today) ? 'bg-ink-900' : 'bg-ink-400'}`}>
                      <span className="text-[9px] uppercase leading-none">{MONTHS[date.getMonth()].slice(0,3)}</span>
                      <span className="text-base leading-none">{date.getDate()}</span>
                    </div>
                    <p className="text-sm font-semibold capitalize">{DAYS_L[date.getDay()]}</p>
                    {ds(date) === ds(today) && <span className="text-xs bg-ink-900 text-white px-2 py-0.5 rounded-lg font-medium">Hoy</span>}
                  </div>
                  <div className="ml-12 space-y-2">
                    {devs.map((e:any, j:number) => {
                      const ec = EC[e.type] || EC.appointment
                      return (
                        <Link key={j} href={ec.href}
                          className="flex items-start gap-3 p-3 bg-white ring-1 ring-ink-900/[0.06] rounded-xl hover:ring-ink-900/15 hover:shadow-tinted-sm transition">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${ec.bg}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-800">{e.title}</p>
                            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-ink-400">
                              <span className={`${ec.text} font-medium`}>{ec.label}</span>
                              {eventTime(e) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.7} />{eventTime(e)}</span>}
                              {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" strokeWidth={1.7} />{e.location}</span>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Day detail sidebar — only in month view */}
        {view === 'month' && (
          <div className="w-72 flex-shrink-0 bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-ink-900/[0.06] bg-ink-900 text-white">
              <p className="text-sm font-semibold capitalize">{selectedDateStr || 'Seleccioná un día'}</p>
              <p className="text-white/50 text-xs mt-0.5">{selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!selectedDay ? (
                <p className="text-center text-ink-400 text-sm mt-8">Hacé clic en un día</p>
              ) : selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-ink-200" strokeWidth={1.7} />
                  <p className="text-sm text-ink-400">Sin eventos este día</p>
                  <div className="flex flex-col gap-2 mt-4">
                    {[{label:'+ Audiencia',href:'/hearings'},{label:'+ Plazo',href:'/deadlines'},{label:'+ Cita',href:'/appointments'}].map(x=>(
                      <Link key={x.href} href={x.href} className="text-xs text-ink-700 hover:underline font-medium">{x.label}</Link>
                    ))}
                  </div>
                </div>
              ) : selectedEvents.map((e:any,i:number) => {
                const ec = EC[e.type] || EC.appointment
                return (
                  <Link key={i} href={ec.href} className="block rounded-xl ring-1 ring-ink-900/[0.06] p-3 hover:shadow-tinted-sm hover:ring-ink-900/15 transition">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ec.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800">{e.title}</p>
                        {e.location && <p className="flex items-center gap-1 text-xs text-ink-400 mt-0.5"><MapPin className="w-3 h-3" strokeWidth={1.7} />{e.location}</p>}
                        {eventTime(e) && <p className="flex items-center gap-1 text-xs text-ink-400 mt-0.5"><Clock className="w-3 h-3" strokeWidth={1.7} />{eventTime(e)}</p>}
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full mt-1 ${ec.text} bg-ink-900/[0.05]`}>{ec.label}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="p-3 border-t border-ink-900/[0.06]">
              <div className="flex gap-2 text-xs">
                <Link href="/hearings" className="flex-1 py-2 text-center bg-ink-900/[0.05] text-ink-700 rounded-xl hover:bg-ink-900/[0.08] transition font-medium">+ Audiencia</Link>
                <Link href="/deadlines" className="flex-1 py-2 text-center bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500/15 transition font-medium">+ Plazo</Link>
                <Link href="/appointments" className="flex-1 py-2 text-center bg-gold-400/12 text-gold-700 rounded-xl hover:bg-gold-400/20 transition font-medium">+ Cita</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
