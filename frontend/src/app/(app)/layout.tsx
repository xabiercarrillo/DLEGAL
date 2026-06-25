'use client'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const { isAuth } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (!isAuth) router.push('/login') }, [isAuth, router])
  if (!isAuth) return null
  return <>{children}</>
}
