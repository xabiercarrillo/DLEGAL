'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { aiApi } from '@/lib/api'
import {
  Bot, Send, Loader2, User, FileText, Search, Edit3,
  BookOpen, Sparkles, Copy, CheckCheck, ChevronDown,
  Scale, AlertTriangle, Shield, Zap, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'chat' | 'contrato' | 'borrador' | 'busqueda' | 'resumen'

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  '¿Cuáles son los plazos procesales en el CPC paraguayo?',
  '¿Cómo se calcula la indemnización laboral en Paraguay?',
  '¿Qué requisitos tiene una demanda civil en Paraguay?',
  '¿Qué es el timbrado SET y para qué sirve?',
]

const DOC_TYPES = [
  { v: 'demanda_civil',         l: 'Demanda Civil'          },
  { v: 'contestacion',          l: 'Contestación de Demanda' },
  { v: 'carta_documento',       l: 'Carta Documento'         },
  { v: 'poder_notarial',        l: 'Poder Notarial'          },
  { v: 'contrato_locacion',     l: 'Contrato de Locación'    },
  { v: 'contrato_trabajo',      l: 'Contrato de Trabajo'     },
  { v: 'acuerdo_conciliacion',  l: 'Acuerdo de Conciliación' },
  { v: 'recurso_apelacion',     l: 'Recurso de Apelación'    },
  { v: 'escrito_judicial',      l: 'Escrito Judicial'        },
]

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1.5 rounded-lg hover:bg-sand-100 text-ink-400 hover:text-ink-600 transition flex-shrink-0">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-gold-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function ResultBox({ title, content, icon: Icon }: { title: string; content: string; icon: any }) {
  return (
    <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-900/[0.06] bg-paper">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gold-600" />
          <span className="font-semibold text-sm text-ink-700">{title}</span>
        </div>
        <CopyBtn text={content} />
      </div>
      <div className="px-5 py-4 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap font-mono text-xs">
        {content}
      </div>
    </div>
  )
}

export default function AIPage() {
  const [tab, setTab] = useState<Tab>('chat')

  // Chat
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: '¡Hola! Soy **LEXI**, tu asistente jurídico especializado en Derecho Paraguayo 🇵🇾\n\nPuedo ayudarte con:\n• Consultas sobre leyes y códigos paraguayos\n• Plazos procesales y jurisprudencia\n• Redacción de escritos y documentos\n• Cálculos laborales e indemnizaciones\n\n¿En qué te puedo ayudar hoy?',
  }])
  const [chatInput, setChatInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Contrato
  const [contratoText, setContratoText] = useState('')
  const [contratoResult, setContratoResult] = useState<any>(null)

  // Borrador
  const [docType, setDocType] = useState('demanda_civil')
  const [draftCtx, setDraftCtx] = useState({ actor: '', demandado: '', objeto: '', hechos: '', fundamento: '', juez: '' })
  const [draftResult, setDraftResult] = useState('')

  // Búsqueda
  const [searchQ, setSearchQ] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)

  // Resumen
  const [resumenData, setResumenData] = useState({ title: '', matter: '', status: '', description: '', client: '', notes: '' })
  const [resumenResult, setResumenResult] = useState('')

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'
  const ta  = `${inp} resize-none`

  // ── Mutations ─────────────────────────────────────────────────────────────
  const chatMut = useMutation({
    mutationFn: (msgs: Msg[]) => aiApi.chat(msgs.map(m => ({ role: m.role, content: m.content }))),
    onSuccess: (r) => setMessages(p => [...p, { role: 'assistant', content: r.data.response || 'Sin respuesta.' }]),
    onError: () => { toast.error('Error al conectar con LEXI'); setMessages(p => [...p, { role: 'assistant', content: '⚠️ Error al conectar. Verificá la configuración de AI en Ajustes → Integraciones.' }]) },
  })

  const contratoMut = useMutation({
    mutationFn: (text: string) => aiApi.analyzeContract(text),
    onSuccess: (r) => setContratoResult(r.data),
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al analizar'),
  })

  const draftMut = useMutation({
    mutationFn: ({ doc_type, context }: any) => aiApi.draftDocument(doc_type, context),
    onSuccess: (r) => setDraftResult(r.data.document || r.data.draft || r.data.content || JSON.stringify(r.data, null, 2)),
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al redactar'),
  })

  const searchMut = useMutation({
    mutationFn: (q: string) => aiApi.legalSearch(q),
    onSuccess: (r) => setSearchResult(r.data),
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error en búsqueda'),
  })

  const resumenMut = useMutation({
    mutationFn: (data: any) => aiApi.summarizeCase(undefined, data),
    onSuccess: (r) => setResumenResult(r.data.summary || r.data.document || r.data.content || JSON.stringify(r.data, null, 2)),
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al resumir'),
  })

  function sendChat() {
    const msg = chatInput.trim(); if (!msg) return
    const updated: Msg[] = [...messages, { role: 'user', content: msg }]
    setMessages(updated); setChatInput('')
    chatMut.mutate(updated)
  }

  const TABS: { id: Tab; icon: any; label: string; desc: string }[] = [
    { id: 'chat',     icon: Bot,      label: 'Chat LEXI',         desc: 'Asistente jurídico conversacional' },
    { id: 'contrato', icon: FileText, label: 'Análisis Contrato', desc: 'Riesgos, cláusulas, recomendaciones' },
    { id: 'borrador', icon: Edit3,    label: 'Borrador',          desc: 'Redacción automática de documentos' },
    { id: 'busqueda', icon: Search,   label: 'Búsqueda Legal',    desc: 'Legislación y jurisprudencia PY' },
    { id: 'resumen',  icon: BookOpen, label: 'Resumen Caso',      desc: 'Resumen ejecutivo de expediente' },
  ]

  return (
    <AppLayout title="LEXI — Asistente IA Jurídico">
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 bg-ink-950 rounded-2xl overflow-x-auto flex-nowrap">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${tab === id ? 'bg-gold text-ink-950 shadow-tinted-sm' : 'text-ink-400 hover:text-white hover:bg-white/10'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ════ CHAT ════ */}
      {tab === 'chat' && (
        <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ink-950 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink-900 tracking-tight">LEXI</p>
                  <p className="text-xs text-gold-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-gold-500 rounded-full inline-block" />Especializado en Derecho Paraguayo</p>
                </div>
              </div>
              <button onClick={() => setMessages([{ role: 'assistant', content: '¡Hola! Nueva conversación iniciada. ¿En qué te puedo ayudar?' }])}
                className="text-xs text-ink-400 hover:text-ink-600 flex items-center gap-1 hover:bg-sand-100 px-3 py-1.5 rounded-xl transition">
                <X className="w-3.5 h-3.5" />Limpiar
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-ink-900' : 'bg-gold-400/15'}`}>
                    {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gold-600" />}
                  </div>
                  <div className={`max-w-[78%] group relative`}>
                    <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === 'user' ? 'bg-ink-900 text-white rounded-2xl rounded-tr-sm' : 'bg-white ring-1 ring-ink-900/[0.06] text-ink-800 rounded-2xl rounded-tl-sm shadow-tinted-sm'}`}>
                      {m.content}
                    </div>
                    {m.role === 'assistant' && (
                      <div className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition">
                        <CopyBtn text={m.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatMut.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gold-400/15 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-gold-600" />
                  </div>
                  <div className="bg-white ring-1 ring-ink-900/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-ink-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && !chatMut.isPending && (
              <div className="px-5 py-3 border-t border-ink-900/[0.06]">
                <p className="text-xs text-ink-400 mb-2">Preguntas frecuentes:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => setChatInput(s)}
                      className="px-3 py-1.5 bg-ink-900/[0.05] text-ink-600 hover:bg-ink-900 hover:text-white rounded-full text-xs transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-4 border-t border-ink-900/[0.06]">
              <div className="flex gap-3">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat())}
                  placeholder="Consultá sobre leyes paraguayas, plazos, jurisprudencia…"
                  disabled={chatMut.isPending}
                  className="flex-1 px-4 py-3 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition disabled:opacity-60" />
                <button onClick={sendChat} disabled={chatMut.isPending || !chatInput.trim()}
                  className="w-12 h-12 bg-ink-900 text-white rounded-2xl flex items-center justify-center hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50 flex-shrink-0">
                  {chatMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ ANÁLISIS DE CONTRATO ════ */}
      {tab === 'contrato' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold-400/12 flex items-center justify-center"><FileText className="w-5 h-5 text-gold-600" /></div>
              <div>
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Análisis de contrato</h3>
                <p className="text-xs text-ink-400">Identificación de riesgos, cláusulas clave y recomendaciones jurídicas</p>
              </div>
            </div>
            <label className={lbl}>Texto del contrato *</label>
            <textarea rows={12} className={ta} placeholder="Pegá aquí el texto completo del contrato a analizar…" value={contratoText} onChange={e => setContratoText(e.target.value)} />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-ink-400">{contratoText.length} caracteres · {Math.ceil(contratoText.length / 4)} tokens aprox.</p>
              <button onClick={() => { if (!contratoText.trim()) return toast.error('Pegá el texto del contrato'); contratoMut.mutate(contratoText) }}
                disabled={contratoMut.isPending || !contratoText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {contratoMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Analizando…</> : <><Sparkles className="w-4 h-4" />Analizar Contrato</>}
              </button>
            </div>
          </div>

          {contratoResult && (
            <div className="space-y-4">
              {contratoResult.risks && (
                <div className="bg-white ring-1 ring-rose-500/15 shadow-tinted-sm rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-rose-500/[0.06] border-b border-ink-900/[0.06]">
                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /><span className="font-semibold text-sm text-rose-700">Riesgos identificados</span></div>
                    <CopyBtn text={contratoResult.risks} />
                  </div>
                  <div className="px-5 py-4 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{contratoResult.risks}</div>
                </div>
              )}
              {contratoResult.key_clauses && (
                <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-ink-900/[0.06]">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gold-600" /><span className="font-semibold text-sm text-ink-700">Cláusulas clave</span></div>
                    <CopyBtn text={contratoResult.key_clauses} />
                  </div>
                  <div className="px-5 py-4 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{contratoResult.key_clauses}</div>
                </div>
              )}
              {contratoResult.recommendations && (
                <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-ink-900/[0.06]">
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold-600" /><span className="font-semibold text-sm text-ink-700">Recomendaciones</span></div>
                    <CopyBtn text={contratoResult.recommendations} />
                  </div>
                  <div className="px-5 py-4 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{contratoResult.recommendations}</div>
                </div>
              )}
              {contratoResult.summary && (
                <ResultBox title="Resumen general" content={contratoResult.summary} icon={Scale} />
              )}
              {/* Análisis devuelto como bloque único por el backend */}
              {!contratoResult.risks && !contratoResult.key_clauses && !contratoResult.recommendations && !contratoResult.summary && (
                <ResultBox
                  title="Análisis del contrato"
                  content={contratoResult.analysis || JSON.stringify(contratoResult, null, 2)}
                  icon={FileText}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ BORRADOR DE DOCUMENTO ════ */}
      {tab === 'borrador' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold-400/12 flex items-center justify-center"><Edit3 className="w-5 h-5 text-gold-600" /></div>
              <div>
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Redacción de documentos jurídicos</h3>
                <p className="text-xs text-ink-400">Generación automática basada en templates del derecho paraguayo</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Tipo de documento *</label>
                <select className={inp} value={docType} onChange={e => setDocType(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Actor / Parte actora</label><input className={inp} placeholder="Juan González Álvarez, CI 1234567" value={draftCtx.actor} onChange={e => setDraftCtx(p => ({ ...p, actor: e.target.value }))} /></div>
              <div><label className={lbl}>Demandado / Contraparte</label><input className={inp} placeholder="Empresa SRL" value={draftCtx.demandado} onChange={e => setDraftCtx(p => ({ ...p, demandado: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Objeto del documento *</label><input className={inp} placeholder="Cobro de guaraníes / Cumplimiento de contrato / etc." value={draftCtx.objeto} onChange={e => setDraftCtx(p => ({ ...p, objeto: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Hechos principales</label><textarea rows={3} className={ta} placeholder="Describí los hechos relevantes de la causa…" value={draftCtx.hechos} onChange={e => setDraftCtx(p => ({ ...p, hechos: e.target.value }))} /></div>
              <div><label className={lbl}>Fundamento legal</label><input className={inp} placeholder="Art. 421 CC, Ley 213/93, etc." value={draftCtx.fundamento} onChange={e => setDraftCtx(p => ({ ...p, fundamento: e.target.value }))} /></div>
              <div><label className={lbl}>Juzgado / Juez</label><input className={inp} placeholder="1er Juzgado Civil y Comercial" value={draftCtx.juez} onChange={e => setDraftCtx(p => ({ ...p, juez: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => { if (!draftCtx.objeto) return toast.error('Completá el objeto del documento'); draftMut.mutate({ doc_type: docType, context: draftCtx }) }}
                disabled={draftMut.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {draftMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Redactando…</> : <><Zap className="w-4 h-4" />Generar borrador</>}
              </button>
            </div>
          </div>

          {draftResult && (
            <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-ink-900/[0.06]">
                <div className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-gold-600" /><span className="font-semibold text-sm text-ink-700">Borrador generado</span></div>
                <CopyBtn text={draftResult} />
              </div>
              <div className="px-5 py-5 text-sm text-ink-700 leading-loose whitespace-pre-wrap font-mono bg-white">{draftResult}</div>
            </div>
          )}
        </div>
      )}

      {/* ════ BÚSQUEDA LEGAL ════ */}
      {tab === 'busqueda' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold-400/12 flex items-center justify-center"><Search className="w-5 h-5 text-gold-600" /></div>
              <div>
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Búsqueda jurídica inteligente</h3>
                <p className="text-xs text-ink-400">Legislación paraguaya, plazos procesales, jurisprudencia contextualizada</p>
              </div>
            </div>

            <div className="flex gap-3">
              <input className="flex-1 px-4 py-3 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
                placeholder="Ej: ¿Cuáles son los plazos para apelar una sentencia civil en Paraguay?"
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchQ.trim() && searchMut.mutate(searchQ)} />
              <button onClick={() => { if (!searchQ.trim()) return; searchMut.mutate(searchQ) }}
                disabled={searchMut.isPending || !searchQ.trim()}
                className="flex items-center gap-2 px-5 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {searchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>

            {/* Quick queries */}
            <div className="mt-4">
              <p className="text-xs text-ink-400 mb-2">Búsquedas frecuentes:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Plazos procesales civiles CPC',
                  'Indemnización laboral Ley 213/93',
                  'Prescripción acción civil Paraguay',
                  'Recurso de apelación civil plazo',
                  'Alimentos Código de la Niñez',
                  'IVA 10% timbrado SET requisitos',
                ].map(q => (
                  <button key={q} onClick={() => setSearchQ(q)}
                    className="px-3 py-1.5 bg-ink-900/[0.05] text-ink-600 hover:bg-ink-900 hover:text-white rounded-full text-xs transition">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {searchResult && (
            <div className="space-y-4">
              {searchResult.answer && (
                <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-ink-900/[0.06]">
                    <div className="flex items-center gap-2"><Scale className="w-4 h-4 text-gold-600" /><span className="font-semibold text-sm text-ink-700">Respuesta jurídica</span></div>
                    <CopyBtn text={searchResult.answer} />
                  </div>
                  <div className="px-5 py-5 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{searchResult.answer}</div>
                </div>
              )}
              {searchResult.sources && (
                <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-sand-50 border-b border-ink-900/[0.06]">
                    <span className="font-semibold text-sm text-ink-600 flex items-center gap-2"><BookOpen className="w-4 h-4" />Fuentes legales</span>
                  </div>
                  <div className="px-5 py-4 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{searchResult.sources}</div>
                </div>
              )}
              {!searchResult.answer && !searchResult.sources && (
                <ResultBox title="Resultado" content={JSON.stringify(searchResult, null, 2)} icon={Search} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ RESUMEN DE CASO ════ */}
      {tab === 'resumen' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold-400/12 flex items-center justify-center"><BookOpen className="w-5 h-5 text-gold-600" /></div>
              <div>
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Resumen ejecutivo de expediente</h3>
                <p className="text-xs text-ink-400">Genera un resumen profesional del expediente para clientes o presentaciones</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Título del caso *</label><input className={inp} placeholder="Ej: González c/ Empresa SA s/ Cobro de Guaraníes" value={resumenData.title} onChange={e => setResumenData(p => ({ ...p, title: e.target.value }))} /></div>
              <div>
                <label className={lbl}>Materia</label>
                <select className={inp} value={resumenData.matter} onChange={e => setResumenData(p => ({ ...p, matter: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  {['Civil','Laboral','Penal','Familia','Comercial','Administrativo','Tributario','Constitucional'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Estado actual</label>
                <select className={inp} value={resumenData.status} onChange={e => setResumenData(p => ({ ...p, status: e.target.value }))}>
                  {['Nuevo','Activo','En investigación','En juicio','Apelación','Resolución','Cerrado'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Cliente</label><input className={inp} placeholder="Nombre del cliente o empresa" value={resumenData.client} onChange={e => setResumenData(p => ({ ...p, client: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Descripción / Hechos *</label><textarea rows={4} className={ta} placeholder="Describí los hechos del caso, la pretensión y el estado actual del proceso…" value={resumenData.description} onChange={e => setResumenData(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Notas adicionales</label><textarea rows={2} className={ta} placeholder="Pruebas relevantes, plazos, actuaciones realizadas…" value={resumenData.notes} onChange={e => setResumenData(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => { if (!resumenData.title || !resumenData.description) return toast.error('Completá al menos el título y descripción'); resumenMut.mutate(resumenData) }}
                disabled={resumenMut.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {resumenMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Generando…</> : <><BookOpen className="w-4 h-4" />Generar resumen</>}
              </button>
            </div>
          </div>

          {resumenResult && (
            <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-ink-900/[0.06]">
                <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-gold-600" /><span className="font-semibold text-sm text-ink-700">Resumen ejecutivo</span></div>
                <CopyBtn text={resumenResult} />
              </div>
              <div className="px-5 py-5 text-sm text-ink-700 leading-loose whitespace-pre-wrap">{resumenResult}</div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
