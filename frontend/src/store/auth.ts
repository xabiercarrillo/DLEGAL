import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface User { id: string; email: string; full_name: string; role: string; tenant_id: string; phone?: string; whatsapp_number?: string; bar_number?: string; specialties?: string; openai_api_key?: string }
interface AuthState { user: User | null; isAuth: boolean; setAuth: (u: User, t: string) => void; clear: () => void; logout: () => void }
export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null, isAuth: false,
    setAuth: (user, token) => { if (typeof window !== 'undefined') localStorage.setItem('xlegal_token', token); set({ user, isAuth: true }) },
    clear: () => { if (typeof window !== 'undefined') localStorage.removeItem('xlegal_token'); set({ user: null, isAuth: false }) },
    logout: () => { if (typeof window !== 'undefined') localStorage.removeItem('xlegal_token'); set({ user: null, isAuth: false }) },
  }),
  { name: 'xlegal-auth', partialize: s => ({ user: s.user, isAuth: s.isAuth }) }
))
export const useUIStore = create<{ sidebarOpen: boolean; searchOpen: boolean; toggle: () => void; setSearch: (v: boolean) => void }>((set) => ({
  sidebarOpen: true, searchOpen: false,
  toggle: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSearch: (v) => set({ searchOpen: v }),
}))
