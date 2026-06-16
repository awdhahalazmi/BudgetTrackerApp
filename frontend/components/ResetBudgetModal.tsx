'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ResetBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function ResetBudgetModal({ isOpen, onClose, onConfirm }: ResetBudgetModalProps) {
  const [loading, setLoading] = useState(false)
  const [typed, setTyped] = useState('')

  if (!isOpen) return null

  const confirmed = typed.trim().toLowerCase() === 'reset'

  const handleConfirm = async () => {
    if (!confirmed) return
    setLoading(true)
    await onConfirm()
    setLoading(false)
    setTyped('')
  }

  const handleClose = () => {
    if (loading) return
    setTyped('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        {/* Red header */}
        <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Reset Budget</h2>
          </div>
          <p className="text-white/80 text-sm">This action cannot be undone.</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-sm leading-relaxed">
            Resetting your budget will permanently delete:
          </p>
          <ul className="space-y-2">
            {['All your expenses this month', 'All your categories', 'Your current budget'].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-slate-600 text-sm">
            You&apos;ll be taken back to the setup wizard to start fresh.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type <span className="font-mono font-bold text-rose-600">reset</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type reset here…"
              className="input-field text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              confirmed && !loading
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Resetting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Reset Budget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
