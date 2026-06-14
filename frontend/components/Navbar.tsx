'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, LogOut, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface NavbarProps {
  userEmail?: string
}

export default function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-violet-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg hidden sm:block">
              Budget<span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Tracker</span>
            </span>
          </div>

          {/* Center: Month badge */}
          <div className="hidden md:flex items-center px-4 py-1.5 bg-violet-50 rounded-full border border-violet-100">
            <span className="text-sm font-medium text-violet-700">
              {format(new Date(), 'MMMM yyyy')}
            </span>
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
