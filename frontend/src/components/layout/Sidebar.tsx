'use client'
import Link from 'next/link'
import { usePathname } from "next/navigation"
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Users, Briefcase, Calendar, Handshake,
  Clock, CheckSquare, CalendarDays, BookOpen, FileText,
  Library, FolderOpen, TrendingUp, TrendingDown, Receipt, DollarSign,
  ReceiptText, FileCheck, BarChart2, Target, Contact2,
  Calculator, Search, Settings, Bot, Shield, ChevronDown,
  ChevronRight, LogOut, Scale, Building2, Zap, MapPin,
  CreditCard, FileSignature, ExternalLink, Video
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Logo, { LogoMark } from '@/components/Logo'

type MenuItem = {
  href: string
  icon: any
  label: string
  superAdminOnly?: boolean
}

type MenuGroup = {
  section: string
  items: MenuItem[]
}

const MENU: MenuGroup[] = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/search',      icon: Search,          label: 'Búsqueda Global' },
      { href: '/calendar',    icon: CalendarDays,    label: 'Calendario' },
    ],
  },
  {
    section: 'Gestión Legal',
    items: [
      { href: '/clients',      icon: Users,            label: 'Clientes' },
      { href: '/cases',        icon: Briefcase,        label: 'Casos' },
      { href: '/hearings',     icon: Scale,            label: 'Audiencias' },
      { href: '/mediations',   icon: Handshake,        label: 'Mediaciones' },
      { href: '/deadlines',    icon: Clock,            label: 'Plazos' },
      { href: '/tasks',        icon: CheckSquare,      label: 'Tareas' },
      { href: '/appointments', icon: Calendar,         label: 'Citas' },
    ],
  },
  {
    section: 'Documentos',
    items: [
      { href: '/templates',  icon: FileText,         label: 'Modelos de Escritos' },
      { href: '/library',    icon: Library,          label: 'Biblioteca Jurídica' },
      { href: '/documents',  icon: FolderOpen,       label: 'Documentos' },
    ],
  },
  {
    section: 'Finanzas',
    items: [
      { href: '/income',       icon: TrendingUp,   label: 'Ingresos' },
      { href: '/expenses',     icon: TrendingDown, label: 'Gastos' },
      { href: '/billing',      icon: Receipt,      label: 'Facturación' },
      { href: '/collections',  icon: DollarSign,   label: 'Cobranzas' },
      { href: '/reimbursable', icon: ReceiptText,  label: 'Gastos Reembolsables' },
      { href: '/budgets',      icon: FileCheck,    label: 'Presupuestos' },
      { href: '/accounting',   icon: BookOpen,     label: 'Contabilidad' },
    ],
  },
  {
    section: 'Análisis',
    items: [
      { href: '/goals',   icon: Target,    label: 'Metas' },
      { href: '/reports', icon: BarChart2, label: 'Reportes' },
    ],
  },
  {
    section: 'Herramientas',
    items: [
      { href: '/contacts',      icon: Contact2,       label: 'Contactos' },
      { href: '/calculator',    icon: Calculator,     label: 'Calculadora Jurídica' },
      { href: '/portal',          icon: ExternalLink,   label: 'Portal del Cliente' },
      { href: '/ai',            icon: Bot,            label: 'Asistente LEXI' },
    ],
  },
  {
    section: 'Integración',
    items: [
      { href: '/integraciones', icon: Zap,            label: 'Integraciones' },
      { href: '/reuniones',     icon: Video,           label: 'Reuniones Virtuales' },
      { href: '/firma',         icon: FileSignature,   label: 'Firma Electrónica' },
      { href: '/checkout',      icon: CreditCard,      label: 'Pagos' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { href: '/team',       icon: Building2, label: 'Equipo' },
      { href: '/settings',   icon: Settings,  label: 'Configuración' },
      { href: '/superadmin', icon: Shield,    label: 'Super Admin', superAdminOnly: true },
    ],
  },
]

const SUPER_ADMIN_EMAIL = 'xabiercarrillo@gmail.com'

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || user?.role === 'super_admin'

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(MENU.map(m => [m.section, true]))
  )

  const toggle = (section: string) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))

  return (
    <aside className={cn(
      'relative flex flex-col bg-ink-950 text-white h-screen overflow-y-auto transition-all duration-500 ease-fluid flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Halo dorado superior + hairline derecha */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(147,48,42,0.10),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold-400/20 to-transparent" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 py-5 flex-shrink-0">
        {collapsed
          ? <LogoMark size={34} className="mx-auto" />
          : <Logo size={34} dark textSize="text-lg" />}
      </div>
      <div className="mx-4 h-px bg-white/[0.07] flex-shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {MENU.map(group => {
          const visibleItems = group.items.filter(item =>
            !item.superAdminOnly || isSuperAdmin
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.section} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggle(group.section)}
                  className="w-full flex items-center justify-between px-2 py-1.5 mt-2 text-white/35 hover:text-white/60 transition-colors"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{group.section}</span>
                  {openSections[group.section]
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />}
                </button>
              )}

              {(collapsed || openSections[group.section]) && (
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm group transition-all duration-300 ease-fluid',
                          active
                            ? 'bg-gradient-to-r from-gold-400/[0.14] to-transparent text-gold-300'
                            : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gold-400 shadow-gold-glow" />
                        )}
                        <item.icon className={cn(
                          'flex-shrink-0 transition-transform duration-300 ease-fluid group-hover:scale-110',
                          collapsed ? 'w-5 h-5 mx-auto' : 'w-[18px] h-[18px]',
                          active ? 'text-gold-400' : 'text-white/45 group-hover:text-white/80'
                        )} />
                        {!collapsed && (
                          <span className="truncate leading-none">{item.label}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="relative p-3 mt-1 flex-shrink-0">
        <div className="mx-1 mb-3 h-px bg-white/[0.07]" />
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] px-2.5 py-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400/25 to-gold-500/10 ring-1 ring-gold-400/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-300 text-xs font-bold font-display">
                {user?.full_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Usuario'}</p>
              <p className="text-[10px] text-white/35 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/35 hover:text-gold-300"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 rounded-xl hover:bg-white/10 transition text-white/40 hover:text-gold-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
