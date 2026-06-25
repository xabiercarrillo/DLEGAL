'use client'
import Sidebar from './Sidebar'
import { useUIStore, useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Bell, LogOut, Search, ChevronDown, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AlertTriangle } from 'lucide-react'

export default function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { sidebarOpen, toggle, setSearch } = useUIStore()
  const { user, clear } = useAuthStore()
  const router = useRouter()
  const [dropOpen, setDropOpen] = useState(false)

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-trial-banner'],
    queryFn: () => api.get('/tenants/me').then(r => r.data).catch(() => null),
    staleTime: 1000 * 60 * 15,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: async () => {
      const [deadlines, tasks] = await Promise.all([
        api.get('/deadlines', { params: { is_completed: false, limit: 100 } }).then(r => r.data).catch(() => ({ items: [] })),
        api.get('/tasks', { params: { status: 'pending', limit: 100 } }).then(r => r.data).catch(() => ({ items: [] })),
      ])
      const urgent = (deadlines.items || []).filter((d: any) => {
        const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000)
        return days >= 0 && days <= 3
      }).length
      return urgent + ((tasks.items || []).length > 0 ? 1 : 0)
    },
    staleTime: 1000 * 60 * 5,
  })
  const notifCount = notifData || 0

  const trialDaysLeft = (() => {
    if (!tenantInfo?.trial_ends_at || tenantInfo?.payment_status !== 'trial') return null
    const diff = Math.ceil((new Date(tenantInfo.trial_ends_at).getTime() - Date.now()) / 86400000)
    return diff >= 0 ? diff : null
  })()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        router.push('/search')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])

  function logout() { clear(); router.push('/login') }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar desktop */}
      <div className={cn('hidden md:flex flex-shrink-0 transition-all duration-300', sidebarOpen ? 'w-64' : 'w-16')}>
        <div className="fixed top-0 h-screen">
          <Sidebar collapsed={!sidebarOpen} />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} />
          </div>
          <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-ink-900/[0.06] h-16 flex items-center px-4 md:px-6 gap-3">
          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl text-ink-500 hover:bg-ink-900/5 transition" title="Menú">
            <Menu className="w-5 h-5" />
          </button>
          {/* Desktop sidebar toggle */}
          <button onClick={toggle} className="hidden md:flex p-2 rounded-xl text-ink-400 hover:text-ink-700 hover:bg-ink-900/5 transition" title="Plegar panel">
            <Menu className="w-5 h-5" />
          </button>

          {title && <h1 className="font-display text-ink-900 text-xl hidden sm:block tracking-tight">{title}</h1>}

          <div className="flex-1" />

          <button onClick={() => router.push('/search')}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white/70 hover:bg-white ring-1 ring-ink-900/[0.07] rounded-full text-sm text-ink-400 hover:text-ink-600 shadow-tinted-sm transition-all duration-300 ease-fluid">
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Buscar…</span>
            <kbd className="hidden md:inline ml-1 text-[10px] bg-ink-900/5 ring-1 ring-ink-900/10 rounded px-1.5 py-0.5 font-mono text-ink-400">⌘ K</kbd>
          </button>

          <button onClick={() => router.push('/deadlines')} className="relative p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-900/5 rounded-xl transition" title="Plazos urgentes">
            <Bell className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-gold-500 text-ink-950 ring-2 ring-paper rounded-full text-[10px] font-bold flex items-center justify-center px-0.5">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 hover:bg-ink-900/5 rounded-full ring-1 ring-transparent hover:ring-ink-900/[0.06] transition">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ink-700 to-ink-950 ring-1 ring-gold-400/20 flex items-center justify-center text-gold-300 font-display font-semibold text-sm">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-ink-700 max-w-24 truncate">
                {user?.full_name?.split(' ')[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-ink-300 hidden sm:block" />
            </button>
            {dropOpen && (
              <div className="absolute right-0 top-12 w-60 bg-white/95 glass ring-1 ring-ink-900/[0.08] rounded-2xl shadow-tinted-lg py-1.5 z-50 animate-fade-up">
                <div className="px-4 py-3 border-b border-ink-900/[0.06]">
                  <p className="text-sm font-semibold text-ink-900">{user?.full_name}</p>
                  <p className="text-xs text-ink-400 truncate">{user?.email}</p>
                </div>
                <Link href="/settings" onClick={() => setDropOpen(false)}
                  className="block mx-1.5 my-0.5 px-3 py-2 rounded-xl text-sm text-ink-600 hover:bg-ink-900/5 hover:text-ink-900 transition">
                  Configuración
                </Link>
                <Link href="/team" onClick={() => setDropOpen(false)}
                  className="block mx-1.5 my-0.5 px-3 py-2 rounded-xl text-sm text-ink-600 hover:bg-ink-900/5 hover:text-ink-900 transition">
                  Equipo
                </Link>
                <hr className="my-1 border-ink-900/[0.06]" />
                <button onClick={logout}
                  className="w-[calc(100%-0.75rem)] mx-1.5 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-700 hover:bg-rose-500/10 transition">
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Trial expiry banner */}
        {trialDaysLeft !== null && trialDaysLeft <= 5 && (
          <div className={[
            'px-4 py-2.5 flex items-center gap-2 text-sm font-medium',
            trialDaysLeft <= 1 ? 'bg-red-600 text-white' :
            trialDaysLeft <= 3 ? 'bg-amber-500 text-white' :
            'bg-amber-50 text-amber-800 border-b border-amber-200'
          ].join(' ')}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {trialDaysLeft === 0
                ? 'Tu período de prueba vence HOY. Contactá al soporte para continuar sin interrupciones.'
                : `Tu período de prueba vence en ${trialDaysLeft} día${trialDaysLeft === 1 ? '' : 's'}.`}
            </span>
            <a href="tel:0993397400"
              className="ml-auto underline font-bold flex-shrink-0">
              Activar suscripción →
            </a>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {title && <h1 className="font-semibold text-gray-800 text-xl mb-4 sm:hidden">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  )
}
