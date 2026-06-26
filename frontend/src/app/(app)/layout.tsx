'use client'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const { isAuth } = useAuthStore()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  // Esperar a que zustand-persist rehidrate desde localStorage antes de
  // decidir si redirigir. Sin esto, un refresh (F5) expulsa a /login.
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (hydrated && !isAuth) router.push('/login')
  }, [hydrated, isAuth, router])

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/15 border-t-wine-500" />
      </div>
    )
  }
  if (!isAuth) return null
  return <>{children}</>
}
