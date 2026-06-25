'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { esignApi, documentsApi } from '@/lib/api'
import { useState } from 'react'
import { FileSignature, Plus, X, Send, Download, RefreshCw, Clock, CheckCircle, XCircle, Eye, ExternalLink, AlertCircle, User, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: 'Pendiente',  cls: 'bg-ink-900/[0.05] text-ink-600', icon: Clock },
  sent:      { label: 'Enviado',    cls: 'bg-ink-900/[0.05] text-ink-600', icon: Send },
  viewed:    { label: 'Visto',      cls: 'bg-gold-400/12 text-gold-700',   icon: Eye },
  completed: { label: 'Firmado',    cls: 'bg-gold-400/12 text-gold-700',   icon: CheckCircle },
  declined:  { label: 'Rechazado',  cls: 'bg-rose-500/10 text-rose-600',   icon: XCircle },
  expired:   { label: 'Expirado',   cls: 'bg-ink-900/[0.05] text-ink-600', icon: AlertCircle },
  voided:    { label: 'Anulado',    cls: 'bg-ink-900/[0.05] text-ink-500', icon: XCircle },
}

const EMPTY_SIGNER = { name: '', email: '', role: 'signer', routing_order: 1 }
const EMPTY_FORM = {
  document_id: '', subject: '', message: '',
  provider: 'pandadoc', expires_days: 30,
  signers: [{ ...EMPTY_SIGNER }],
}

export default function FirmaPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY_FORM, signers: [{ ...EMPTY_SIGNER }] })

  const { data, isLoading } = useQuery({
    queryKey: ['esign-list'],
    queryFn: () => esignApi.list({ limit: 50 }).then((r: any) => r.data),
    refetchInterval: 30000,
  })

  const { data: docsData } = useQuery({
    queryKey: ['docs-select'],
    queryFn: () => documentsApi.list({ limit: 200 }).then((r: any) => r.data),
  })

  const sendMut = useMutation({
    mutationFn: (d: any) => esignApi.send(d),
    onSuccess: () => {
      toast.success('Solicitud de firma enviada')
      setModal(false)
      setForm({ ...EMPTY_FORM, signers: [{ ...EMPTY_SIGNER }] })
      qc.invalidateQueries({ queryKey: ['esign-list'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al enviar'),
  })

  const resendMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/esign/${id}/resend`, { method: 'POST' }),
    onSuccess: () => { toast.success('Recordatorio enviado'); qc.invalidateQueries({ queryKey: ['esign-list'] }) },
    onError: () => toast.error('Error al reenviar'),
  })

  const downloadMut = useMutation({
    mutationFn: (id: string) => esignApi.download(id),
    onSuccess: (resp: any, id: string) => {
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `firmado-${id}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    },
    onError: () => toast.error('Error al descargar'),
  })

  const updateSigner = (i: number, field: string, val: string) => {
    const signers = [...form.signers]
    signers[i] = { ...signers[i], [field]: val }
    setForm({ ...form, signers })
  }
  const addSigner = () => setForm({ ...form, signers: [...form.signers, { ...EMPTY_SIGNER, routing_order: form.signers.length + 1 }] })
  const removeSigner = (i: number) => setForm({ ...form, signers: form.signers.filter((_: any, idx: number) => idx !== i) })

  const requests = data?.items || data || []
  const stats = {
    total: requests.length,
    pending: requests.filter((r: any) => ['pending', 'sent', 'viewed'].includes(r.status)).length,
    completed: requests.filter((r: any) => r.status === 'completed').length,
    expired: requests.filter((r: any) => ['expired', 'declined', 'voided'].includes(r.status)).length,
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-900 tracking-tight flex items-center gap-2">
              <FileSignature className="text-gold-600" size={28} strokeWidth={1.7} /> Firma electrónica
            </h1>
            <p className="text-ink-500 text-sm mt-1">Envíe documentos para firma digital con PandaDoc o DocuSign</p>
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-full hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
            <Plus size={18} strokeWidth={1.7} /> Nueva solicitud
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', val: stats.total, cls: 'bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm', vcls: 'text-ink-900' },
            { label: 'En proceso', val: stats.pending, cls: 'bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm', vcls: 'text-ink-700' },
            { label: 'Firmados', val: stats.completed, cls: 'bg-gold-400/10 ring-1 ring-gold-400/30', vcls: 'text-gold-700' },
            { label: 'Vencidos/rechazados', val: stats.expired, cls: 'bg-rose-500/10 ring-1 ring-rose-500/20', vcls: 'text-rose-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
              <div className={`text-2xl font-bold ${s.vcls}`}>{s.val}</div>
              <div className="text-sm text-ink-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900 tracking-tight">Solicitudes de firma</h2>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['esign-list'] })} className="text-ink-400 hover:text-ink-600 p-1 rounded">
              <RefreshCw size={16} strokeWidth={1.7} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-ink-400">
              <RefreshCw className="animate-spin mx-auto mb-3" size={32} strokeWidth={1.7} />Cargando...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-ink-400">
              <FileSignature className="mx-auto mb-3 text-ink-300" size={40} strokeWidth={1.7} />
              <p className="font-medium">Sin solicitudes aún</p>
              <p className="text-sm mt-1">Cree una nueva solicitud para enviar un documento a firma</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-900/[0.05]">
              {requests.map((req: any) => {
                const st = STATUS_MAP[req.status] || STATUS_MAP['pending']
                const Icon = st.icon
                return (
                  <div key={req.id} className="px-6 py-4 hover:bg-paper transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${st.cls}`}>
                            <Icon size={12} strokeWidth={1.7} /> {st.label}
                          </span>
                          <span className="text-xs text-ink-400 font-mono">{req.provider}</span>
                        </div>
                        <p className="font-medium text-ink-800 truncate">{req.subject || 'Sin asunto'}</p>
                        <p className="text-sm text-ink-500 mt-0.5 truncate">{req.document_name || req.document_id}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-ink-400">
                          <span>Enviado: {req.created_at ? formatDate(req.created_at) : '—'}</span>
                          {req.expires_at && <span>Vence: {formatDate(req.expires_at)}</span>}
                          {req.signers && <span>{req.signers.length} firmante{req.signers.length !== 1 ? 's' : ''}</span>}
                        </div>
                        {req.signers && req.signers.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {req.signers.map((s: any, i: number) => (
                              <div key={i} className="flex items-center gap-1 text-xs bg-ink-900/[0.05] rounded-full px-2 py-1">
                                <User size={10} strokeWidth={1.7} />
                                <span className="max-w-xs truncate">{s.name || s.email}</span>
                                {s.signed_at ? <CheckCircle size={10} className="text-gold-600" strokeWidth={1.7} /> : <Clock size={10} className="text-ink-400" strokeWidth={1.7} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {req.status === 'completed' && (
                          <button onClick={() => downloadMut.mutate(req.id)} title="Descargar PDF firmado"
                            className="p-2 text-gold-700 hover:bg-gold-400/12 rounded-lg transition">
                            <Download size={16} strokeWidth={1.7} />
                          </button>
                        )}
                        {['sent', 'viewed', 'pending'].includes(req.status) && (
                          <button onClick={() => resendMut.mutate(req.id)} title="Reenviar recordatorio"
                            className="p-2 text-ink-600 hover:bg-ink-900/[0.05] rounded-lg transition">
                            <RefreshCw size={16} strokeWidth={1.7} />
                          </button>
                        )}
                        {req.external_id && (
                          <a href={req.dashboard_url || '#'} target="_blank" rel="noopener noreferrer"
                            className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-900/[0.05] rounded-lg transition">
                            <ExternalLink size={16} strokeWidth={1.7} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-4 bg-ink-900/[0.04] ring-1 ring-ink-900/[0.06] rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-gold-600 flex-shrink-0 mt-0.5" size={18} strokeWidth={1.7} />
          <div className="text-sm text-ink-700">
            <strong className="text-ink-900">Validez legal:</strong> Los documentos firmados digitalmente tienen plena validez según la{' '}
            <strong className="text-ink-900">Ley 4017/10 de Paraguay</strong>. Configure sus claves API en{' '}
            <a href="/integraciones" className="underline text-gold-700">Integraciones</a>.
          </div>
        </div>
      </div>

      {/* Modal nueva solicitud */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-ink-900 tracking-tight flex items-center gap-2">
                <FileSignature className="text-gold-600" size={20} strokeWidth={1.7} /> Nueva solicitud de firma
              </h2>
              <button onClick={() => setModal(false)} className="text-ink-400 hover:text-ink-600"><X size={22} strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1 block">Documento *</label>
                <select value={form.document_id} onChange={e => setForm({ ...form, document_id: e.target.value })}
                  className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
                  <option value="">— Seleccionar documento —</option>
                  {(docsData?.items || docsData || []).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.title || d.filename}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1 block">Asunto del email *</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ej: Contrato de servicios legales - para su firma"
                  className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1 block">Mensaje (opcional)</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  rows={2} placeholder="Mensaje personalizado para los firmantes..."
                  className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1 block">Proveedor</label>
                  <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}
                    className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
                    <option value="pandadoc">PandaDoc</option>
                    <option value="docusign">DocuSign</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1 block">Vence en (días)</label>
                  <input type="number" min={1} max={365} value={form.expires_days}
                    onChange={e => setForm({ ...form, expires_days: +e.target.value })}
                    className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                </div>
              </div>

              {/* Firmantes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-ink-700">Firmantes *</label>
                  <button onClick={addSigner} className="text-xs text-gold-700 hover:text-gold-800 flex items-center gap-1">
                    <Plus size={14} strokeWidth={1.7} /> Agregar firmante
                  </button>
                </div>
                <div className="space-y-3">
                  {form.signers.map((s: any, i: number) => (
                    <div key={i} className="bg-paper rounded-xl p-3 ring-1 ring-ink-900/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-ink-500">Firmante {i + 1}</span>
                        {form.signers.length > 1 && (
                          <button onClick={() => removeSigner(i)} className="text-rose-400 hover:text-rose-600"><X size={14} strokeWidth={1.7} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)}
                          placeholder="Nombre completo"
                          className="bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                        <input value={s.email} onChange={e => updateSigner(i, 'email', e.target.value)}
                          placeholder="email@ejemplo.com" type="email"
                          className="bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                        <select value={s.role} onChange={e => updateSigner(i, 'role', e.target.value)}
                          className="bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
                          <option value="signer">Firmante</option>
                          <option value="approver">Aprobador</option>
                          <option value="viewer">Observador</option>
                        </select>
                        <input type="number" min={1} value={s.routing_order}
                          onChange={e => updateSigner(i, 'routing_order', e.target.value)}
                          placeholder="Orden de firma"
                          className="bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end border-t border-ink-900/[0.06] pt-4">
              <button onClick={() => setModal(false)} className="px-4 py-2 ring-1 ring-ink-900/10 text-ink-700 rounded-full text-sm font-medium hover:bg-ink-900/5 transition">Cancelar</button>
              <button onClick={() => sendMut.mutate(form)}
                disabled={!form.document_id || !form.subject || sendMut.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-ink-900 text-white rounded-full hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-40 text-sm font-medium">
                <Send size={16} strokeWidth={1.7} /> {sendMut.isPending ? 'Enviando...' : 'Enviar para firma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
