import Link from 'next/link'
import Logo, { LogoMark } from '@/components/Logo'
import Nanduti from '@/components/Nanduti'
import {
  CheckCircle, Phone, MessageCircle, ArrowRight, ArrowUpRight,
  Shield, Zap, Star, Users, FileText, TrendingUp, Clock, Lock,
  BarChart3, BookOpen, Calculator, Gavel,
} from 'lucide-react'

const PLANS = [
  { key: 'solo',     name: 'Solo',     price: '₲ 75.000',  period: '/mes', users: '1 abogado',         badge: '',            features: ['1 usuario', 'Casos ilimitados', 'Facturación SET', 'LEXI IA', 'Soporte WhatsApp'] },
  { key: 'bufete_s', name: 'Buffet S', price: '₲ 300.000', period: '/mes', users: 'Hasta 5 abogados',  badge: '',            features: ['5 usuarios', 'Todo lo de Solo', 'Gestión de equipo', 'Portal del cliente', 'Reportes avanzados'] },
  { key: 'bufete_m', name: 'Buffet M', price: '₲ 500.000', period: '/mes', users: 'Hasta 10 abogados', badge: 'Más popular', features: ['10 usuarios', 'Todo lo de S', 'Firma electrónica', 'Mediaciones', 'Business Intelligence'] },
  { key: 'bufete_l', name: 'Buffet L', price: 'Consultar', period: '',     users: 'Ilimitado',          badge: '',            features: ['Usuarios ilimitados', 'Servidor dedicado', 'Onboarding personalizado', 'SLA garantizado', 'Integración contable'] },
]

const IMG = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`

const MODULES = [
  { label: 'Casos y expedientes',    desc: 'Seguimiento completo con plazos procesales automáticos y foliado digital.', img: IMG('1589216532372-1c2a367900d9', 1200) },
  { label: 'Facturación SET',         desc: 'Facturas con timbrado, IVA 10% y exportación lista para tu contador.',     img: IMG('1554224154-26032ffc0d07') },
  { label: 'Calculadora Ley 213/93',  desc: 'Liquidaciones laborales exactas: preaviso, aguinaldo y vacaciones.',       img: IMG('1554224155-6726b3ff858f') },
  { label: 'Reportes y estadísticas', desc: 'Los indicadores de tu estudio, en tiempo real.',                           img: IMG('1551288049-bebda4e38f71') },
  { label: 'Biblioteca jurídica',     desc: 'Legislación y jurisprudencia paraguaya, siempre a mano.',                  img: IMG('1521587760476-6c12a4b040da') },
  { label: 'LEXI — asistente IA',     desc: 'Análisis de contratos, borradores y búsqueda legal con IA.',               img: IMG('1551836022-d5d88e9218df') },
  { label: 'Portal del cliente',      desc: 'Acceso seguro para que tus clientes vean el avance de sus casos.',         img: IMG('1521791136064-7986c2920216') },
  { label: 'Firma electrónica',       desc: 'Documentos firmados digitalmente, con plena validez legal.',               img: IMG('1450101499163-c8848c66ca85') },
  { label: 'Cobranzas',               desc: 'Facturas vencidas y recordatorios automáticos por WhatsApp.',              img: IMG('1565514020179-026b92b84bb6') },
  { label: 'Multi-usuario',           desc: 'Roles para admin, abogado, secretaría y cliente.',                         img: IMG('1556761175-b413da4baf72') },
]

const TESTIMONIALS = [
  {
    name: 'Dr. Roberto Fernández',
    role: 'Abogado independiente — Asunción',
    text: 'Antes llevaba todo en Excel y cuadernos. Con DLEGAL organicé mis 40 casos activos en una tarde. La calculadora laboral me ahorra horas por semana.',
    stars: 5,
    initial: 'R',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80&auto=format&fit=crop',
  },
  {
    name: 'Estudio Villalba & Asociados',
    role: 'Bufete — San Lorenzo, 4 abogados',
    text: 'El módulo de cobranzas recuperó ₲ 12 millones en facturas vencidas en el primer mes. Los recordatorios automáticos por WhatsApp cambiaron todo.',
    stars: 5,
    initial: 'V',
    photo: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=200&q=80&auto=format&fit=crop',
  },
  {
    name: 'Dra. Carolina Benítez',
    role: 'Derecho Laboral — Luque',
    text: 'La calculadora de liquidaciones del Ley 213/93 es perfecta. Antes tardaba 30 minutos haciendo cada cálculo, ahora son 30 segundos. Resultados exactos.',
    stars: 5,
    initial: 'C',
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80&auto=format&fit=crop',
  },
]

const STATS = [
  { value: '25+', label: 'módulos especializados' },
  { value: '₲0',  label: 'costo los primeros 14 días' },
  { value: '99%', label: 'uptime garantizado' },
  { value: '24h', label: 'soporte técnico' },
]

const PHONE = '0993397400'
const WA = `https://wa.me/595${PHONE.slice(1)}`

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink-800 antialiased">
      {/* ───────────── Navbar: pill glass flotante ───────────── */}
      <header className="fixed inset-x-0 top-0 z-50 px-4">
        <nav className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-full py-2.5 pl-4 pr-2.5 ring-1 ring-ink-900/[0.06]">
          <Link href="/" aria-label="DLEGAL — inicio" className="shrink-0">
            <Logo size={34} tagline={null} textSize="text-lg" />
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-ink-500 md:flex">
            <a href="#modulos" className="transition-colors hover:text-ink-900">Módulos</a>
            <a href="#testimonios" className="transition-colors hover:text-ink-900">Testimonios</a>
            <a href="#planes" className="transition-colors hover:text-ink-900">Precios</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900 sm:block"
            >
              Ingresar
            </Link>
            <a
              href="#planes"
              className="group inline-flex items-center gap-2 rounded-full bg-ink-900 py-1.5 pl-5 pr-1.5 text-sm font-medium text-white transition-all duration-300 ease-fluid hover:bg-ink-800 active:scale-[0.98]"
            >
              Comenzar gratis
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-500 text-ink-950 transition-transform duration-300 ease-fluid group-hover:rotate-45">
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ───────────── Hero con video ───────────── */}
        <section className="relative isolate flex min-h-[100dvh] items-end overflow-hidden pb-16 pt-36 text-white">
          {/* Video de fondo (pasillo cálido) con imagen de respaldo */}
          <video
            autoPlay muted loop playsInline
            poster="https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1600&q=80&auto=format&fit=crop"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          >
            <source src="https://videos.pexels.com/video-files/7578548/7578548-hd_1920_1080_30fps.mp4" type="video/mp4" />
          </video>
          {/* Overlays para legibilidad y mood */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/82 to-ink-950/55" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(75%_60%_at_12%_88%,rgba(147,48,42,0.38),transparent_60%)]" />

          <div className="relative mx-auto w-full max-w-6xl px-4">
            <div className="max-w-2xl">
              <span className="legal-tag inline-flex animate-fade-in items-center gap-2 rounded-sm bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-brass-200 ring-1 ring-white/20 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brass-400" />
                Software jurídico · Paraguay
              </span>

              <h1 className="mt-6 animate-fade-up text-balance font-display text-5xl leading-[1.03] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:text-6xl md:text-7xl">
                Tu estudio jurídico,<br />
                <span className="italic text-brass-300">en orden.</span>
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
                La plataforma más completa del Paraguay para abogados: casos, facturación SET,
                calculadora Ley 213/93, firma electrónica y LEXI, tu asistente con inteligencia artificial.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href="#planes" className="group inline-flex items-center justify-center gap-2 rounded-full bg-brass-400 py-2 pl-7 pr-2 text-base font-semibold text-ink-950 shadow-gold-glow transition-all duration-300 ease-fluid hover:bg-brass-300 active:scale-[0.98]">
                  Comenzar 14 días gratis
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-950 text-brass-400 transition-transform duration-300 ease-fluid group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                </a>
                <a href={`tel:${PHONE}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-7 py-3.5 text-base font-medium text-white ring-1 ring-white/25 backdrop-blur-sm transition-all duration-300 ease-fluid hover:bg-white/20 active:scale-[0.98]">
                  <Phone className="h-4 w-4" strokeWidth={1.6} /> {PHONE}
                </a>
              </div>

              {/* Stats en línea */}
              <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-7">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="font-display text-3xl text-brass-300 tnum">{s.value}</p>
                    <p className="mt-0.5 text-xs text-white/65">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Módulos (bento asimétrico) ───────────── */}
        <section id="modulos" className="relative py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center rounded-full bg-sand-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sand-700 ring-1 ring-ink-900/[0.05]">
                  La plataforma
                </span>
                <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                  Todo lo que necesita su estudio
                </h2>
              </div>
              <p className="text-pretty text-ink-500 md:pb-2">
                Diseñado específicamente para la realidad jurídica paraguaya.
                Cada módulo habla tu idioma.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((m, i) => {
                // primer módulo destacado, ocupa 2 columnas y 2 filas en lg
                const featured = i === 0
                return (
                  <article
                    key={m.label}
                    className={[
                      'group relative isolate flex flex-col justify-end overflow-hidden rounded-3xl ring-1 ring-ink-900/10 shadow-tinted transition-all duration-500 ease-fluid hover:-translate-y-1 hover:shadow-tinted-lg',
                      featured ? 'min-h-[24rem] sm:col-span-2 lg:row-span-2' : 'min-h-[14rem]',
                    ].join(' ')}
                  >
                    <img
                      src={m.img}
                      alt={m.label}
                      loading="lazy"
                      className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 ease-fluid group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10" />
                    <div className="p-6">
                      <h3 className={['font-display tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]', featured ? 'text-3xl' : 'text-xl'].join(' ')}>
                        {m.label}
                      </h3>
                      <p className={['mt-2 text-pretty leading-relaxed text-white/80', featured ? 'max-w-sm text-base' : 'text-sm'].join(' ')}>
                        {m.desc}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───────────── Testimonios ───────────── */}
        <section id="testimonios" className="bg-paper-deep py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sand-700 ring-1 ring-ink-900/[0.05]">
                Testimonios
              </span>
              <h2 className="mt-5 text-balance font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                Lo que dicen nuestros clientes
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-ink-500">
                Abogados y estudios jurídicos de todo Paraguay ya usan DLEGAL.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  className={[
                    'flex flex-col rounded-4xl bg-white p-8 ring-1 ring-ink-900/[0.06] shadow-tinted transition-all duration-500 ease-fluid hover:-translate-y-1 hover:shadow-tinted-lg',
                    i === 1 ? 'md:-translate-y-4' : '',
                  ].join(' ')}
                >
                  <div className="flex gap-1">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-gold-500 text-gold-500" strokeWidth={1.5} />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-pretty font-display text-lg leading-relaxed text-ink-800">
                    “{t.text}”
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-ink-900/[0.07] pt-6">
                    <img
                      src={t.photo}
                      alt={t.name}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-ink-900/10"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{t.name}</span>
                      <span className="block truncate text-xs text-ink-400">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Pricing ───────────── */}
        <section id="planes" className="py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-sand-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sand-700 ring-1 ring-ink-900/[0.05]">
                Planes en guaraníes
              </span>
              <h2 className="mt-5 text-balance font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                Precios fijos, sin sorpresas
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-ink-500">
                Sin dólares. Precios en guaraníes, factura incluida.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => {
                const popular = !!p.badge
                return (
                  <div
                    key={p.key}
                    className={[
                      'relative flex h-full flex-col rounded-4xl p-7 transition-all duration-500 ease-fluid hover:-translate-y-1',
                      popular
                        ? 'bg-ink-950 text-white ring-1 ring-gold-400/30 shadow-tinted-lg lg:-mt-4 lg:mb-4'
                        : 'bg-white text-ink-900 ring-1 ring-ink-900/[0.06] shadow-tinted hover:shadow-tinted-lg',
                    ].join(' ')}
                  >
                    {popular && (
                      <>
                        <div className="pointer-events-none absolute inset-0 rounded-4xl bg-[radial-gradient(90%_50%_at_50%_0%,rgba(147,48,42,0.15),transparent_60%)]" />
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-950 shadow-gold-glow">
                          {p.badge}
                        </span>
                      </>
                    )}

                    <div className="relative">
                      <h3 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
                      <p className={['mt-1 text-sm', popular ? 'text-white/55' : 'text-ink-500'].join(' ')}>
                        {p.users}
                      </p>

                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="font-display text-3xl font-semibold tracking-tight tnum">{p.price}</span>
                        {p.period && (
                          <span className={['text-sm', popular ? 'text-white/45' : 'text-ink-400'].join(' ')}>
                            {p.period}
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="relative mt-7 flex-1 space-y-3">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle
                            className={['mt-0.5 h-4 w-4 shrink-0', popular ? 'text-gold-400' : 'text-gold-500'].join(' ')}
                            strokeWidth={1.6}
                          />
                          <span className={popular ? 'text-white/75' : 'text-ink-600'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-8">
                      {p.key === 'bufete_l' ? (
                        <a
                          href={`${WA}?text=Hola, me interesa el plan Buffet L de DLEGAL`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full rounded-full border border-ink-900/15 py-3 text-center text-sm font-semibold text-ink-900 transition-all duration-300 ease-fluid hover:border-ink-900 hover:bg-ink-900 hover:text-white active:scale-[0.98]"
                        >
                          Consultar
                        </a>
                      ) : (
                        <Link
                          href={`/register?plan=${p.key}`}
                          className={[
                            'block w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-300 ease-fluid active:scale-[0.98]',
                            popular
                              ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                              : 'border border-ink-900/15 text-ink-900 hover:border-ink-900 hover:bg-ink-900 hover:text-white',
                          ].join(' ')}
                        >
                          Comenzar gratis
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-10 text-center text-sm text-ink-400">
              14 días gratis · Sin tarjeta · Cancelá cuando quieras · Datos en servidores seguros
            </p>
          </div>
        </section>

        {/* ───────────── Garantías / Trust ───────────── */}
        <section className="bg-paper-deep py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Shield, title: 'Datos seguros', desc: 'Encriptación SSL/TLS, backups diarios' },
                { icon: Lock,   title: 'Multi-tenant', desc: 'Tu estudio aislado de los demás' },
                { icon: Clock,  title: '14 días gratis', desc: 'Sin compromisos, sin tarjeta' },
                { icon: Phone,  title: 'Soporte directo', desc: `${PHONE} — WhatsApp / llamada` },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500/10 text-gold-600 ring-1 ring-gold-500/15">
                    <item.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── CTA final ───────────── */}
        <section className="px-4 py-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-5xl bg-ink-950 px-6 py-20 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_50%_0%,rgba(147,48,42,0.18),transparent_60%)]" />
            <div className="relative mx-auto max-w-2xl">
              <LogoMark size={52} className="mx-auto" />
              <h2 className="mt-7 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                ¿Tiene dudas? Hablemos
              </h2>
              <p className="mx-auto mt-5 max-w-md text-pretty text-white/55">
                Nuestro equipo está disponible para demostrarle la plataforma
                y responder todas sus preguntas.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={`tel:${PHONE}`}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-2 pl-7 pr-2 text-base font-semibold text-ink-950 transition-all duration-300 ease-fluid hover:bg-paper active:scale-[0.98] sm:w-auto"
                >
                  {PHONE}
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-950 text-gold-400">
                    <Phone className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                </a>
                <a
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.06] px-7 py-3.5 text-base font-medium text-white ring-1 ring-white/15 transition-all duration-300 ease-fluid hover:bg-white/10 active:scale-[0.98] sm:w-auto"
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={1.6} /> Escribir por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────── Footer ───────────── */}
      <footer className="border-t border-ink-900/[0.07] bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo size={38} tagline="by Dotribo" />
              <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-ink-500">
                Sistema de gestión jurídica hecho para la realidad del Paraguay.
                Precios en guaraníes, soporte local.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-400">Plataforma</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><a href="#modulos" className="text-ink-600 transition-colors hover:text-ink-900">Módulos</a></li>
                <li><a href="#planes" className="text-ink-600 transition-colors hover:text-ink-900">Precios</a></li>
                <li><Link href="/login" className="text-ink-600 transition-colors hover:text-ink-900">Ingresar</Link></li>
                <li><Link href="/register" className="text-ink-600 transition-colors hover:text-ink-900">Registrarse</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-400">Contacto y legal</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a href={`tel:${PHONE}`} className="inline-flex items-center gap-2 text-ink-600 transition-colors hover:text-ink-900">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.6} /> {PHONE}
                  </a>
                </li>
                <li>
                  <a href={WA} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink-600 transition-colors hover:text-ink-900">
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} /> WhatsApp
                  </a>
                </li>
                <li><Link href="/terminos" className="text-ink-600 transition-colors hover:text-ink-900">Términos y condiciones</Link></li>
                <li><Link href="/privacidad" className="text-ink-600 transition-colors hover:text-ink-900">Política de privacidad</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink-900/[0.07] pt-6 text-xs text-ink-400 sm:flex-row">
            <p>© {new Date().getFullYear()} DLEGAL · Todos los derechos reservados</p>
            <p>
              Desarrollado por{' '}
              <span className="font-medium text-ink-600">Dotribo</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
