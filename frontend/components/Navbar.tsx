'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Wallet, LogOut, ChevronDown, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface NavbarProps {
  userEmail?: string
}

export default function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [hasPlanner, setHasPlanner] = useState(false)

  useEffect(() => {
    const checkSub = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('planner_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      setHasPlanner(!!data)
    }
    checkSub()
  }, [])

  const handleSignOut = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const plannerHref = hasPlanner ? '/payment-planner' : '/upgrade'
  const onPlanner = pathname?.startsWith('/payment-planner') || pathname?.startsWith('/upgrade')

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-violet-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-lg hidden sm:block">
                Budget<span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Tracker</span>
              </span>
            </button>
          </div>

          {/* Center: nav links */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push(plannerHref)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                onPlanner
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Payment Planner
              {!hasPlanner && (
                <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full leading-none">
                  PRO
                </span>
              )}
            </button>
          </div>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
                <div className="w-7 h-7 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-700">
                    {userEmail[0].toUpperCase()}
                  </span>
                </div>
                <span className="max-w-[150px] truncate">{userEmail}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            )}
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-all duration-200 disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
