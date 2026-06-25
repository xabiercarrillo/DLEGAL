'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useState, useRef } from 'react'
import { FileText, Upload, Trash2, Download, FolderOpen, File, ImageIcon, FileSpreadsheet, PenLine, Send, CheckCircle2, ExternalLink, X } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const CATEGORIES = ['general','contrato','poder','sentencia','resolucion','escrito','prueba','pericia','notificacion','otro']

function fileIcon(mime: string) {
  if (mime?.includes('pdf')) return <FileText strokeWidth={1.7} className="w-5 h-5 text-rose-500" />
  if (mime?.includes('image')) return <ImageIcon strokeWidth={1.7} className="w-5 h-5 text-ink-500" />
  if (mime?.includes('sheet') || mime?.includes('excel') || mime?.includes('csv')) return <FileSpreadsheet strokeWidth={1.7} className="w-5 h-5 text-ink-600" />
  return <File strokeWidth={1.7} className="w-5 h-5 text-ink-400" />
}

const catColors: Record<string,string> = {
  contrato:'bg-gold-400/12 text-gold-700', poder:'bg-ink-900/[0.04] text-ink-600',
  sentencia:'bg-ink-900/[0.04] text-ink-600', escrito:'bg-ink-900/[0.04] text-ink-600',
  prueba:'bg-ink-900/[0.04] text-ink-600', general:'bg-ink-900/[0.04] text-ink-600',
}

export default function DocumentsPage() {
  const { token } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [cat, setCat] = useState('general')
  const [uploading, setUploading] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [esignModal, setEsignModal] = useState<{docId:string,name:string}|null>(null)
  const [signers, setSigners] = useState([{name:'',email:''}])
  const [esignProvider, setEsignProvider] = useState('pandadoc')

  const { data, isLoading } = useQuery({
    queryKey: ['documents', filterCat],
    queryFn: async () => {
      const r = await axios.get(`${API}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filterCat ? { category: filterCat } : {},
      })
      return r.data
    },
  })
  const docs: any[] = data?.items || []

  const deleteMut = useMutation({
    mutationFn: (id: string) => axios.delete(`${API}/documents/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => { toast.success('Documento eliminado'); qc.invalidateQueries({ queryKey: ['documents'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al eliminar'),
  })

  const esignMut = useMutation({
    mutationFn: (data: any) => axios.post(`${API}/esign/send`, data, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => { toast.success('Documento enviado para firma. Los firmantes recibirán un email.'); setEsignModal(null); setSigners([{name:'',email:''}]) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al enviar para firma. Verificá las integraciones.'),
  })

  const handleEsign = () => {
    if (!esignModal) return
    const validSigners = signers.filter(s => s.name && s.email)
    if (!validSigners.length) { toast.error('Agregá al menos un firmante'); return }
    esignMut.mutate({ document_id: esignModal.docId, signers: validSigners, provider: esignProvider, subject: `Firma requerida: ${esignModal.name}` })
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    let ok = 0
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', cat)
      try {
        await axios.post(`${API}/documents`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        })
        ok++
      } catch (e: any) {
        toast.error(`${file.name}: ${e.response?.data?.detail || 'Error'}`)
      }
    }
    setUploading(false)
    if (ok > 0) { toast.success(`${ok} archivo(s) cargado(s)`); qc.invalidateQueries({ queryKey: ['documents'] }) }
  }

  return (
    <AppLayout title="Documentos">
      <div className="border-2 border-dashed border-ink-900/15 rounded-2xl p-8 text-center mb-6 hover:border-gold-400/60 hover:bg-paper transition cursor-pointer"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={e => handleUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv,.zip" />
        <Upload strokeWidth={1.7} className={`w-10 h-10 mx-auto mb-3 ${uploading ? 'text-gold-600 animate-bounce' : 'text-ink-300'}`} />
        <p className="text-ink-600 font-medium">{uploading ? 'Cargando...' : 'Arrastrá archivos aquí o hacé clic para seleccionar'}</p>
        <p className="text-ink-400 text-sm mt-1">PDF, Word, Excel, imágenes · Máximo 25 MB por archivo</p>
        <div className="mt-4 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-ink-500">Categoría:</span>
          <select value={cat} onChange={e => setCat(e.target.value)} className="text-xs bg-white ring-1 ring-ink-900/10 rounded-lg px-2 py-1 text-ink-700 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilterCat('')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${!filterCat ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07]'}`}>Todos</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition capitalize ${filterCat===c ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07]'}`}>{c}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-16 bg-white rounded-xl animate-pulse ring-1 ring-ink-900/[0.06]"/>)}</div>
      ) : docs.length === 0 ? (
        <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-16 text-center">
          <FolderOpen strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-500 font-medium">Sin documentos cargados</p>
          <p className="text-ink-400 text-sm mt-1">Arrastrá archivos arriba para comenzar</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs text-ink-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Archivo</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Categoría</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Tamaño</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {docs.map((d: any) => (
                <tr key={d.id} className="hover:bg-ink-900/[0.02] transition">
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{fileIcon(d.mime_type)}<span className="font-medium text-ink-800 truncate max-w-xs">{d.name}</span></div></td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${catColors[d.category]||catColors.general}`}>{d.category}</span></td>
                  <td className="px-4 py-3 text-ink-500 hidden md:table-cell tnum">{d.size_label}</td>
                  <td className="px-4 py-3 text-ink-400 text-xs hidden sm:table-cell tnum">{d.created_at ? new Date(d.created_at).toLocaleDateString('es-PY') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`${API}${d.download_url}`} target="_blank" className="p-1.5 rounded-lg text-ink-600 hover:bg-ink-900/5 transition" title="Descargar"><Download strokeWidth={1.7} className="w-4 h-4" /></a>
                      {d.mime_type?.includes('pdf') && <button onClick={() => { setEsignModal({docId:d.id,name:d.name}); setSigners([{name:'',email:''}]) }} className="p-1.5 rounded-lg text-gold-700 hover:bg-gold-400/12 transition" title="Enviar para firma"><PenLine strokeWidth={1.7} className="w-4 h-4" /></button>}
                      <button
                        onClick={() => axios.patch(`${API}/documents/${d.id}`, { shared_with_client: !d.shared_with_client }, { headers: { Authorization: `Bearer ${token}` } }).then(() => qc.invalidateQueries({ queryKey: ['documents'] }))}
                        className={`p-1.5 rounded-lg transition ${d.shared_with_client ? 'text-gold-700 bg-gold-400/12 hover:bg-gold-400/20' : 'text-ink-400 hover:bg-ink-900/5'}`}
                        title={d.shared_with_client ? 'Compartido con cliente (clic para ocultar)' : 'Compartir con cliente'}
                      >
                        <ExternalLink strokeWidth={1.7} className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(confirm('¿Eliminar este documento?')) deleteMut.mutate(d.id) }} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition" title="Eliminar"><Trash2 strokeWidth={1.7} className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg">
            <div className="px-6 py-5 border-b border-ink-900/[0.06] flex items-center gap-3">
              <PenLine strokeWidth={1.7} className="w-5 h-5 text-gold-600" />
              <h3 className="font-display font-semibold text-ink-900 tracking-tight">Enviar para firma electrónica</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-ink-600 bg-paper rounded-xl p-3 truncate"><span className="font-medium">Documento:</span> {esignModal.name}</p>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Proveedor</label>
                <select value={esignProvider} onChange={e => setEsignProvider(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
                  <option value="pandadoc">PandaDoc (recomendado)</option>
                  <option value="docusign">DocuSign</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Firmantes</label>
                <div className="space-y-2">
                  {signers.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={s.name} onChange={e => { const ns=[...signers]; ns[i]={...ns[i],name:e.target.value}; setSigners(ns) }} placeholder="Nombre completo" className="flex-1 px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                      <input value={s.email} onChange={e => { const ns=[...signers]; ns[i]={...ns[i],email:e.target.value}; setSigners(ns) }} placeholder="email@ejemplo.com" type="email" className="flex-1 px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                      {signers.length > 1 && <button onClick={() => setSigners(signers.filter((_,j)=>j!==i))} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                {signers.length < 5 && <button onClick={() => setSigners([...signers, {name:'',email:''}])} className="mt-2 text-xs text-gold-700 hover:underline">+ Agregar firmante</button>}
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setEsignModal(null)} className="px-4 py-2 ring-1 ring-ink-900/10 text-ink-700 rounded-full text-sm font-medium hover:bg-ink-900/5 transition">Cancelar</button>
              <button onClick={handleEsign} disabled={esignMut.isPending} className="flex items-center gap-2 px-5 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                <Send strokeWidth={1.7} className="w-4 h-4" />{esignMut.isPending ? 'Enviando...' : 'Enviar para firma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
