import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({ baseURL: API_URL, timeout: 30000 })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('xlegal_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  r => r,
  async (err) => {
    if (typeof window !== 'undefined') {
      if (err.response?.status === 401) {
        localStorage.removeItem('xlegal_token')
        window.location.href = '/login'
      } else if (err.response?.status === 403) {
        const detail = err.response?.data?.detail || ''
        if (detail.toLowerCase().includes('trial') || detail.toLowerCase().includes('suscripci')) {
          window.location.href = '/suscripcion-vencida'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (email: string, password: string) => api.post('/auth/login', { email, password }),
  me:      () => api.get('/auth/me'),
  refresh: (rt: string) => api.post('/auth/refresh', { refresh_token: rt }),
}

// ── Users / Profile ─────────────────────────────────────────────────────
export const usersApi = {
  me:             () => api.get('/users/me'),
  updateMe:       (d: any) => api.put('/users/me', d),
  changePassword: (d: any) => api.put('/users/me/password', d),
  list:           (p?: any) => api.get('/users', { params: p }),
  create:         (d: any) => api.post('/users', d),
  deactivate:     (id: string) => api.put(`/users/${id}/deactivate`),
  update:           (id: string, d: any) => api.put(`/users/${id}`, d),
  resetPassword:    (id: string, pwd: string) => api.put(`/users/${id}/reset-password`, { new_password: pwd }),
  changeMyPassword: (d: any) => api.put(`/users/me/password`, d),
}

// ── Tenants / Firm ──────────────────────────────────────────────────────
export const tenantsApi = {
  getMe:    () => api.get('/tenants/me'),
  updateMe: (d: any) => api.put('/tenants/me', d),
}

// ── Cases ───────────────────────────────────────────────────────────────
export const casesApi = {
  list:    (p?: any) => api.get('/cases', { params: p }),
  get:     (id: string) => api.get(`/cases/${id}`),
  detail:  (id: string) => api.get(`/cases/${id}/detail`),
  create:  (d: any) => api.post('/cases', d),
  update:  (id: string, d: any) => api.put(`/cases/${id}`, d),
  archive: (id: string) => api.delete(`/cases/${id}`),
  stats:   () => api.get('/cases/dashboard-stats'),
}

// ── Clients ─────────────────────────────────────────────────────────────
export const clientsApi = {
  list:   (p?: any) => api.get('/clients', { params: p }),
  get:    (id: string) => api.get(`/clients/${id}`),
  detail: (id: string) => api.get(`/clients/${id}/detail`),
  create: (d: any) => api.post('/clients', d),
  update: (id: string, d: any) => api.put(`/clients/${id}`, d),
}

// ── Hearings ────────────────────────────────────────────────────────────
export const hearingsApi = {
  list:   (p?: any) => api.get('/hearings', { params: p }),
  create: (d: any) => api.post('/hearings', d),
  update: (id: string, d: any) => api.put(`/hearings/${id}`, d),
  delete: (id: string) => api.delete(`/hearings/${id}`),
}

// ── Deadlines ───────────────────────────────────────────────────────────
export const deadlinesApi = {
  list:     (p?: any) => api.get('/deadlines', { params: p }),
  create:   (d: any) => api.post('/deadlines', d),
  update:   (id: string, d: any) => api.put(`/deadlines/${id}`, d),
  complete: (id: string) => api.post(`/deadlines/${id}/complete`),
  delete:   (id: string) => api.delete(`/deadlines/${id}`),
}

// ── Tasks ───────────────────────────────────────────────────────────────
export const tasksApi = {
  list:     (p?: any) => api.get('/tasks', { params: p }),
  create:   (d: any) => api.post('/tasks', d),
  update:   (id: string, d: any) => api.put(`/tasks/${id}`, d),
  complete: (id: string) => api.post(`/tasks/${id}/complete`),
  delete:   (id: string) => api.delete(`/tasks/${id}`),
}

// ── Appointments ────────────────────────────────────────────────────────
export const appointmentsApi = {
  list:   (p?: any) => api.get('/appointments', { params: p }),
  create: (d: any) => api.post('/appointments', d),
  update: (id: string, d: any) => api.put(`/appointments/${id}`, d),
  delete: (id: string) => api.delete(`/appointments/${id}`),
}

// ── Mediations ──────────────────────────────────────────────────────────
export const mediationsApi = {
  list:   (p?: any) => api.get('/mediations', { params: p }),
  create: (d: any) => api.post('/mediations', d),
  update: (id: string, d: any) => api.put(`/mediations/${id}`, d),
  delete: (id: string) => api.delete(`/mediations/${id}`),
}

// ── Billing / Facturas ──────────────────────────────────────────────────
export const billingApi = {
  invoices: {
    list:     (p?: any) => api.get('/invoices', { params: p }),
    create:   (d: any) => api.post('/invoices', d),
    update:   (id: string, d: any) => api.put(`/invoices/${id}`, d),
    markPaid: (id: string, amount?: number) => api.post(`/invoices/${id}/mark-paid`, { amount }),
    pdfUrl:   (id: string) => `${API_URL}/invoices/${id}/pdf`,
  },
  income: {
    list:   (p?: any) => api.get('/income', { params: p }),
    create: (d: any) => api.post('/income', d),
    update: (id: string, d: any) => api.put(`/income/${id}`, d),
    delete: (id: string) => api.delete(`/income/${id}`),
    stats:  () => api.get('/income/stats'),
  },
  expenses: {
    list:   (p?: any) => api.get('/expenses', { params: p }),
    create: (d: any) => api.post('/expenses', d),
    update: (id: string, d: any) => api.put(`/expenses/${id}`, d),
    delete: (id: string) => api.delete(`/expenses/${id}`),
  },
}

// ── Collections ─────────────────────────────────────────────────────────
export const collectionsApi = {
  list:        (p?: any) => api.get('/collections', { params: p }),
  stats:       () => api.get('/collections/stats'),
  sendReminder: (id: string) => api.post(`/collections/${id}/send-reminder`),
  markOverdue:  (id: string) => api.post(`/collections/${id}/mark-overdue`),
}

// ── Budgets ─────────────────────────────────────────────────────────────
export const budgetsApi = {
  list:   () => api.get('/budgets'),
  create: (d: any) => api.post('/budgets', d),
  update: (id: string, d: any) => api.put(`/budgets/${id}`, d),
}

// ── Accounting ──────────────────────────────────────────────────────────
export const accountingApi = {
  entries: {
    list:   (p?: any) => api.get('/accounting/entries', { params: p }),
    create: (d: any) => api.post('/accounting/entries', d),
  },
  reimbursable: {
    list:       (p?: any)    => api.get('/reimbursable', { params: p }),
    create:     (d: any)     => api.post('/reimbursable', d),
    bill:       (id: string) => api.post(`/reimbursable/${id}/mark-billed`),
    delete:     (id: string) => api.delete(`/reimbursable/${id}`),
  },
}

// ── Goals ───────────────────────────────────────────────────────────────
export const goalsApi = {
  list:   () => api.get('/goals'),
  create: (d: any) => api.post('/goals', d),
  update: (id: string, d: any) => api.put(`/goals/${id}`, d),
  delete: (id: string) => api.delete(`/goals/${id}`),
}

// ── Contacts ────────────────────────────────────────────────────────────
export const contactsApi = {
  list:     (p?: any) => api.get('/contacts', { params: p }),
  create:   (d: any) => api.post('/contacts', d),
  update:   (id: string, d: any) => api.put(`/contacts/${id}`, d),
  delete:   (id: string) => api.delete(`/contacts/${id}`),
  favorite: (id: string) => api.post(`/contacts/${id}/favorite`),
}

// ── Calculator ──────────────────────────────────────────────────────────
export const calculatorApi = {
  laboral:    (d: any) => api.post('/calculator/laboral-liquidation', d),
  interests:  (d: any) => api.post('/calculator/interests', d),
}

// ── Reports ─────────────────────────────────────────────────────────────
export const reportsApi = {
  summary:    (year?: number) => api.get('/reports/financial-summary', { params: { year } }),
  byMatter:   () => api.get('/reports/cases-by-matter'),
  byStatus:   () => api.get('/reports/cases-by-status'),
  byMonth:    (year?: number) => api.get('/reports/income-by-month', { params: { year } }),
  topClients: () => api.get('/reports/top-clients'),
  exportIncome:   () => api.get('/reports/export/income-csv', { responseType: 'blob' }),
  exportExpenses: () => api.get('/reports/export/expenses-csv', { responseType: 'blob' }),
}

// ── Search ──────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, limit?: number) => api.get('/search', { params: { q, limit } }),
}

// ── Calendar ────────────────────────────────────────────────────────────
export const calendarApi = {
  events: (start: string, end: string) => api.get('/calendar/events', { params: { start, end } }),
}

// ── AI / LEXI ───────────────────────────────────────────────────────────
export const aiApi = {
  chat:            (messages: any[], provider?: string) => api.post('/ai/chat', { messages, provider }),
  analyzeContract: (text: string, provider?: string)    => api.post('/ai/analyze-contract', { text, provider }),
  summarizeCase:   (case_id?: string, case_data?: any, provider?: string) => api.post('/ai/summarize-case', { case_id, case_data, provider }),
  draftDocument:   (doc_type: string, context: any, provider?: string)    => api.post('/ai/draft-document', { doc_type, context, provider }),
  legalSearch:     (query: string, provider?: string)   => api.post('/ai/legal-search', { query, provider }),
  providers:       ()                                   => api.get('/ai/providers'),
}

// ── Library ─────────────────────────────────────────────────────────────
export const libraryApi = {
  list: (p?: any) => api.get('/library', { params: p }),
  get:  (id: string) => api.get(`/library/${id}`),
}

// ── Templates ───────────────────────────────────────────────────────────
export const templatesApi = {
  list:   (p?: any) => api.get('/templates', { params: p }),
  get:    (id: string) => api.get(`/templates/${id}`),
  create: (d: any) => api.post('/templates', d),
  update: (id: string, d: any) => api.put(`/templates/${id}`, d),
  delete: (id: string) => api.delete(`/templates/${id}`),
}

// ── Super Admin ─────────────────────────────────────────────────────────
export const superAdminApi = {
  dashboard:          () => api.get('/superadmin/dashboard'),
  stats:              () => api.get('/superadmin/stats'),
  tenants:            (p?: any) => api.get('/superadmin/tenants', { params: p }),
  tenant:             (id: string) => api.get(`/superadmin/tenants/${id}`),
  createTenant:       (d: any) => api.post('/superadmin/tenants', d),
  updateTenant:       (id: string, d: any) => api.put(`/superadmin/tenants/${id}`, d),
  changePlan:         (id: string, plan: string) => api.put(`/superadmin/tenants/${id}/plan`, { plan }),
  toggleTenant:       (id: string) => api.put(`/superadmin/tenants/${id}/toggle`),
  deleteTenant:       (id: string) => api.delete(`/superadmin/tenants/${id}`),
  registerPayment:    (id: string, note: string) => api.post(`/superadmin/tenants/${id}/register-payment`, { note }),
  exportTenant:       (id: string) => api.get(`/superadmin/tenants/${id}/export`),
  impersonateTenant:  (id: string) => api.post(`/superadmin/impersonate-tenant/${id}`),
  impersonateUser:    (uid: string) => api.post(`/superadmin/impersonate/${uid}`),
  users:              (p?: any) => api.get('/superadmin/users', { params: p }),
  createUser:         (d: any) => api.post('/superadmin/users', d),
  toggleUser:         (uid: string) => api.put(`/superadmin/users/${uid}/toggle`),
  resetPassword:      (uid: string, pwd: string) => api.put(`/superadmin/users/${uid}/reset-password`, { new_password: pwd }),
  billing:            () => api.get('/superadmin/billing'),
  sendReminder:       (tid: string) => api.post(`/superadmin/billing/send-reminder/${tid}`),
  broadcast:          (d: any) => api.post('/superadmin/broadcast', d),
  plans:              () => api.get('/superadmin/plans'),
}

// Documents
export const documentsApi = {
  list: (params?: { case_id?: string; client_id?: string; category?: string; page?: number }) =>
    api.get('/documents', { params }),
  upload: (formData: FormData) =>
    api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  downloadUrl: (id: string) => `${API_URL}/documents/${id}/download`,
}

// Export / Backup
export const exportApi = {
  summary: () => api.get('/export/summary'),
  fullBackup: () => api.get('/export/full-backup', { responseType: 'blob' }),
}

// Audit log
export const auditApi = {
  list: (params?: { resource?: string; action?: string; page?: number }) =>
    api.get('/audit', { params }),
}

// Auth — Password reset
export const authExtApi = {
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
}

// ── Integrations API ───────────────────────────────────────────────
export const integrationsApi = {
  listProviders: () => api.get("/integrations/providers"),
  list: () => api.get("/integrations"),
  upsert: (provider: string, data: any) => api.put(`/integrations/${provider}`, data),
  delete: (provider: string) => api.delete(`/integrations/${provider}`),
  test: (provider: string) => api.post(`/integrations/${provider}/test`),
  listWebhooks: () => api.get("/integrations/webhooks/outbound"),
  createWebhook: (data: any) => api.post("/integrations/webhooks/outbound", data),
  deleteWebhook: (id: string) => api.delete(`/integrations/webhooks/outbound/${id}`),
  testWebhook: (id: string) => api.post(`/integrations/webhooks/outbound/${id}/test`),
  googleCalendarOAuthUrl: () => api.get("/integrations/oauth/google-calendar/url"),
};

// ── E-Sign API ─────────────────────────────────────────────────────
export const esignApi = {
  send: (data: any) => api.post("/esign/send", data),
  list: (params?: any) => api.get("/esign", { params }),
  resend: (id: string) => api.post(`/esign/${id}/resend`),
  getStatus: (id: string) => api.get(`/esign/${id}/status`),
  getSigningUrl: (id: string, email: string) => api.get(`/esign/${id}/signing-url`, { params: { signer_email: email } }),
  download: (id: string) => api.get(`/esign/${id}/download`, { responseType: "blob" }),
};

// ── External Payments API ──────────────────────────────────────────
export const paymentsExtApi = {
  createCheckout: (data: any) => api.post("/payments/checkout", data),
  list: (params?: any) => api.get("/payments", { params }),
  summary: () => api.get("/payments/summary"),
};

// ── Maps API ───────────────────────────────────────────────────────
export const mapsApi = {
  tribunales: (params?: any) => api.get("/maps/tribunales", { params }),
  geocode: (address: string, provider?: string) => api.get("/maps/geocode", { params: { address, provider } }),
  directions: (origin: string, destination: string, mode?: string) => api.get("/maps/directions", { params: { origin, destination, mode } }),
  nearbyTribunales: (lat: number, lng: number, radius?: number) => api.get("/maps/nearby-tribunales", { params: { lat, lng, radius_km: radius } }),
  embedUrl: (query: string) => api.get("/maps/embed", { params: { query } }),
};

// ── Meetings API ───────────────────────────────────────────────────
export const meetingsApi = {
  createZoom: (data: any) => api.post("/meetings/zoom", data),
  cancelZoom: (id: string) => api.delete(`/meetings/zoom/${id}`),
  createGoogleMeet: (data: any) => api.post("/meetings/google-meet", data),
  calendarEvents: (days?: number) => api.get("/meetings/google-calendar/events", { params: { days_ahead: days } }),
  calendlyEventTypes: () => api.get("/meetings/calendly/event-types"),
  calendlyScheduled: (days?: number) => api.get("/meetings/calendly/scheduled", { params: { days_ahead: days } }),
};

// ── PDF API ────────────────────────────────────────────────────────
export const pdfApi = {
  generateInvoice: (invoiceId: string) => api.get(`/pdf/invoice/${invoiceId}`, { responseType: "blob" }),
  generateContract: (data: any) => api.post("/pdf/contract", data, { responseType: "blob" }),
  fromHtml: (html: string, filename?: string) => api.post("/pdf/from-html", { html, filename }, { responseType: "blob" }),
};

// ── Portal del Cliente API ─────────────────────────────────────────
export const portalApi = {
  invite: (clientId: string) => api.post(`/portal/invite/${clientId}`),
  me: () => api.get("/portal/me"),
  cases: () => api.get("/portal/cases"),
  invoices: () => api.get("/portal/invoices"),
  documents: () => api.get("/portal/documents"),
  hearings: () => api.get("/portal/hearings"),
};

// ── Business Intelligence (Super Admin) ──────────────────────────────────────
export const businessApi = {
  adsSummary:      () => api.get('/business/advertising/summary'),
  adsCampaigns:    () => api.get('/business/advertising/campaigns'),
  webAnalytics:    () => api.get('/business/analytics/web'),
  leads:           () => api.get('/business/marketing/leads'),
  emailMarketing:  () => api.get('/business/marketing/email'),
  social:          () => api.get('/business/social/metrics'),
  payments:        () => api.get('/business/payments/summary'),
  biKpis:          () => api.get('/business/bi/kpis'),
  integrations:    () => api.get('/business/integrations/status'),
  saveIntegration: (d: any) => api.post('/business/integrations/config', d),
}
