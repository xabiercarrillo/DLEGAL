"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Settings, Zap, CreditCard, MessageSquare, Brain, HardDrive, Calendar, FileText, MapPin, Webhook, ChevronRight, ExternalLink, Play, Loader2 } from "lucide-react";

const CATEGORIES = {
  payments:   { label: "Pagos",                   icon: CreditCard,     color: "gold" },
  esign:      { label: "Firma electrónica",       icon: Zap,            color: "ink" },
  messaging:  { label: "Mensajería",              icon: MessageSquare,  color: "ink" },
  email:      { label: "Email",                   icon: MessageSquare,  color: "ink" },
  realtime:   { label: "Tiempo real",             icon: Zap,            color: "gold" },
  ai:         { label: "Inteligencia artificial", icon: Brain,         color: "ink" },
  storage:    { label: "Almacenamiento",          icon: HardDrive,      color: "ink" },
  calendar:   { label: "Calendario",              icon: Calendar,       color: "ink" },
  meetings:   { label: "Reuniones",               icon: Calendar,       color: "ink" },
  pdf:        { label: "PDF",                      icon: FileText,       color: "ink" },
  maps:       { label: "Mapas",                   icon: MapPin,         color: "gold" },
};

const PROVIDER_DOCS: Record<string, string> = {
  bancard:        "https://developers.bancard.com.py",
  mercadopago:    "https://www.mercadopago.com.py/developers",
  stripe:         "https://dashboard.stripe.com/apikeys",
  paypal:         "https://developer.paypal.com/dashboard",
  pandadoc:       "https://app.pandadoc.com/a/#/apikeys",
  docusign:       "https://developers.docusign.com",
  twilio:         "https://console.twilio.com",
  vonage:         "https://dashboard.nexmo.com",
  sendgrid:       "https://app.sendgrid.com/settings/api_keys",
  mailgun:        "https://app.mailgun.com",
  pusher:         "https://dashboard.pusher.com",
  openai:         "https://platform.openai.com/api-keys",
  anthropic:      "https://console.anthropic.com",
  cohere:         "https://dashboard.cohere.com/api-keys",
  s3:             "https://console.aws.amazon.com/iam",
  r2:             "https://developers.cloudflare.com/r2",
  google_calendar:"https://console.cloud.google.com",
  zoom:           "https://marketplace.zoom.us/develop/create",
  google_maps:    "https://developers.google.com/maps",
  mapbox:         "https://account.mapbox.com/access-tokens",
  docraptor:      "https://docraptor.com",
  pdfshift:       "https://pdfshift.io",
  cloudconvert:   "https://cloudconvert.com/api",
  calendly:       "https://developer.calendly.com",
};

interface Provider {
  provider: string;
  name: string;
  category: string;
  fields: string[];
  flag: string;
}
interface Integration {
  provider: string;
  name: string;
  is_enabled: boolean;
  config: Record<string, string>;
  category: string;
}

export default function IntegracionesPage() {
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  const { data: providerData } = useQuery({
    queryKey: ["integration-providers"],
    queryFn: () => api.get("/integrations/providers").then(r => r.data),
  });
  const { data: configured } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get("/integrations").then(r => r.data),
  });
  const { data: webhooks } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => api.get("/integrations/webhooks/outbound").then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, data }: any) => api.put(`/integrations/${provider}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); setEditingProvider(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (provider: string) => api.delete(`/integrations/${provider}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
  const createWebhookMutation = useMutation({
    mutationFn: (data: any) => api.post("/integrations/webhooks/outbound", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); setShowWebhookForm(false); setWebhookUrl(""); setWebhookName(""); setWebhookEvents([]); },
  });
  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/webhooks/outbound/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const providers: Record<string, Provider> = providerData?.providers || {};
  const configuredMap: Record<string, Integration> = {};
  (configured?.items || []).forEach((i: Integration) => { configuredMap[i.provider] = i; });

  const byCategory = Object.entries(providers).reduce((acc, [key, p]) => {
    const cat = p.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...p, key });
    return acc;
  }, {} as Record<string, any[]>);

  const handleTest = async (provider: string) => {
    setTesting(provider);
    try {
      const r = await api.post(`/integrations/${provider}/test`);
      setTestResult(prev => ({ ...prev, [provider]: r.data }));
    } catch (e: any) {
      setTestResult(prev => ({ ...prev, [provider]: { success: false, message: e.response?.data?.detail || "Error" } }));
    } finally { setTesting(null); }
  };

  const handleSave = (provider: string, p: Provider) => {
    saveMutation.mutate({ provider, data: { provider, is_enabled: true, config: formValues } });
  };

  const startEdit = (providerKey: string, p: Provider) => {
    const existing = configuredMap[providerKey]?.config || {};
    const initial: Record<string, string> = {};
    p.fields.forEach(f => { initial[f] = existing[f] || ""; });
    setFormValues(initial);
    setEditingProvider(providerKey);
  };

  const categoriesWithCount = Object.entries(byCategory).map(([cat, ps]) => ({
    cat, providers: ps, configured: ps.filter(p => configuredMap[p.key]?.is_enabled).length,
  }));

  const displayedCategories = activeCategory
    ? categoriesWithCount.filter(c => c.cat === activeCategory)
    : categoriesWithCount;

  const allEvents: string[] = providerData?.available_events || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-ink-900 tracking-tight">Integraciones</h1>
        <p className="text-ink-500 mt-1">Conecta DLEGAL con servicios externos. Configura una vez, funciona automáticamente.</p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ease-fluid ${!activeCategory ? "bg-ink-900 text-white" : "ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/5"}`}>
          Todas
        </button>
        {categoriesWithCount.map(({ cat, providers: ps, configured: n }) => {
          const catInfo = CATEGORIES[cat as keyof typeof CATEGORIES];
          return (
            <button key={cat} onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ease-fluid ${activeCategory === cat ? "bg-ink-900 text-white" : "ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/5"}`}>
              {catInfo?.label || cat}
              {n > 0 && <span className="ml-1.5 bg-gold-500 text-white text-xs px-1.5 py-0.5 rounded-full tnum">{n}</span>}
            </button>
          );
        })}
      </div>

      {/* Provider Cards */}
      <div className="space-y-8">
        {displayedCategories.map(({ cat, providers: ps }) => {
          const catInfo = CATEGORIES[cat as keyof typeof CATEGORIES];
          return (
            <div key={cat}>
              <h2 className="text-base font-display font-semibold text-ink-900 tracking-tight mb-3 flex items-center gap-2">
                {catInfo?.label || cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ps.map((p: any) => {
                  const isConfigured = !!configuredMap[p.key]?.is_enabled;
                  const isEditing = editingProvider === p.key;
                  const tr = testResult[p.key];
                  return (
                    <div key={p.key} className={`bg-white rounded-2xl ring-1 shadow-tinted-sm p-4 transition-all duration-300 ease-fluid ${isConfigured ? "ring-gold-400/40" : "ring-ink-900/[0.06]"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{p.flag}</span>
                          <div>
                            <div className="font-semibold text-ink-900 text-sm">{p.name}</div>
                            {p.key === "bancard" && <div className="text-xs text-gold-700 font-medium">Paraguay local</div>}
                            {p.key === "pandadoc" && <div className="text-xs text-ink-500">Plan free: 5 docs/mes</div>}
                            {p.key === "r2" && <div className="text-xs text-ink-500">Sin costo de egreso</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isConfigured
                            ? <CheckCircle size={16} strokeWidth={1.7} className="text-gold-600" />
                            : <XCircle size={16} strokeWidth={1.7} className="text-ink-300" />}
                          {PROVIDER_DOCS[p.key] && (
                            <a href={PROVIDER_DOCS[p.key]} target="_blank" rel="noopener noreferrer"
                               className="text-ink-400 hover:text-gold-600 ml-1">
                              <ExternalLink size={13} strokeWidth={1.7} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Test result */}
                      {tr && (
                        <div className={`mb-3 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1.5 ${tr.success ? "bg-gold-400/12 text-gold-700" : "bg-rose-500/10 text-rose-600"}`}>
                          {tr.message}
                        </div>
                      )}

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mb-3 space-y-2">
                          {p.fields.map((field: string) => (
                            <div key={field}>
                              <label className="text-xs text-ink-500 uppercase tracking-wide">{field.replace(/_/g, " ")}</label>
                              <input
                                type={field.includes("secret") || field.includes("key") || field.includes("token") || field.includes("password") ? "password" : "text"}
                                value={formValues[field] || ""}
                                onChange={e => setFormValues(prev => ({ ...prev, [field]: e.target.value }))}
                                placeholder={field}
                                className="w-full mt-0.5 px-2 py-1.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(p.key, p)}
                              disabled={saveMutation.isPending}
                              className="flex-1 bg-ink-900 text-white text-xs py-1.5 rounded-full hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                              {saveMutation.isPending ? "Guardando..." : "Guardar"}
                            </button>
                            <button onClick={() => setEditingProvider(null)}
                              className="px-3 text-ink-700 text-xs ring-1 ring-ink-900/10 rounded-full hover:bg-ink-900/5">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p.key, p)}
                              className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 ring-1 ring-ink-900/10 rounded-full hover:bg-ink-900/5 text-ink-700">
                              <Settings size={12} strokeWidth={1.7} /> {isConfigured ? "Editar" : "Configurar"}
                            </button>
                            {isConfigured && (
                              <button onClick={() => handleTest(p.key)}
                                disabled={testing === p.key}
                                className="px-3 flex items-center gap-1 text-xs py-1.5 bg-gold-400/12 text-gold-700 rounded-full hover:bg-gold-400/20">
                                {testing === p.key ? <Loader2 size={11} strokeWidth={1.7} className="animate-spin" /> : <Play size={11} strokeWidth={1.7} />}
                                Probar
                              </button>
                            )}
                            {isConfigured && (
                              <button onClick={() => deleteMutation.mutate(p.key)}
                                className="px-2 text-xs py-1.5 text-rose-500 hover:bg-rose-500/10 rounded-full">
                                <XCircle size={13} strokeWidth={1.7} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhooks outbound section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-ink-900 tracking-tight flex items-center gap-2">
              <Webhook size={16} strokeWidth={1.7} /> Automatización — webhooks outbound
            </h2>
            <p className="text-xs text-ink-400 mt-0.5">Conecta con Zapier, Make (Integromat) o n8n para automatizar tareas</p>
          </div>
          <button onClick={() => setShowWebhookForm(true)}
            className="bg-ink-900 text-white text-sm px-4 py-2 rounded-full hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
            + Nuevo webhook
          </button>
        </div>

        {showWebhookForm && (
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-5 mb-4">
            <h3 className="font-display font-semibold text-ink-900 mb-3">Nuevo webhook</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-ink-500 uppercase">Nombre</label>
                <input value={webhookName} onChange={e => setWebhookName(e.target.value)}
                  placeholder="Mi Zapier CRM" className="w-full mt-1 px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
              <div>
                <label className="text-xs text-ink-500 uppercase">URL del webhook</label>
                <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..." className="w-full mt-1 px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-ink-500 uppercase mb-1 block">Eventos a recibir</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-paper rounded-xl">
                {allEvents.map(ev => (
                  <label key={ev} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={webhookEvents.includes(ev)}
                      onChange={e => setWebhookEvents(prev => e.target.checked ? [...prev, ev] : prev.filter(x => x !== ev))}
                      className="rounded accent-gold-500" />
                    <span className="font-mono text-ink-600">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createWebhookMutation.mutate({ name: webhookName, url: webhookUrl, events: webhookEvents })}
                disabled={!webhookUrl || !webhookName || webhookEvents.length === 0 || createWebhookMutation.isPending}
                className="bg-ink-900 text-white px-4 py-2 text-sm rounded-full hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                {createWebhookMutation.isPending ? "Creando..." : "Crear webhook"}
              </button>
              <button onClick={() => setShowWebhookForm(false)} className="px-4 py-2 text-sm ring-1 ring-ink-900/10 rounded-full text-ink-700 hover:bg-ink-900/5">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(webhooks?.items || []).map((wh: any) => (
            <div key={wh.id} className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wh.is_active ? "bg-gold-500" : "bg-ink-300"}`} />
                  <span className="font-medium text-sm text-ink-900">{wh.name}</span>
                  {wh.failure_count > 0 && <span className="text-xs bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full tnum">{wh.failure_count} errores</span>}
                </div>
                <div className="text-xs text-ink-400 mt-0.5 font-mono truncate max-w-md">{wh.url}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events?.slice(0, 4).map((ev: string) => (
                    <span key={ev} className="text-xs bg-ink-900/[0.05] text-ink-600 px-1.5 py-0.5 rounded font-mono">{ev}</span>
                  ))}
                  {wh.events?.length > 4 && <span className="text-xs text-ink-400">+{wh.events.length - 4} más</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wh.last_triggered_at && <span className="text-xs text-ink-400">{wh.last_triggered_at}</span>}
                <button onClick={() => deleteWebhookMutation.mutate(wh.id)}
                  className="text-rose-500 hover:bg-rose-500/10 text-xs px-2 py-1 rounded-full">Eliminar</button>
              </div>
            </div>
          ))}
          {(webhooks?.items || []).length === 0 && !showWebhookForm && (
            <div className="text-center py-8 text-ink-400 bg-paper rounded-2xl border-2 border-dashed border-ink-900/[0.08]">
              <Webhook size={24} strokeWidth={1.7} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin webhooks configurados</p>
              <p className="text-xs mt-1">Conecta con Zapier, Make o n8n para automatizar tu estudio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
