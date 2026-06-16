'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, Tag, Paperclip, ExternalLink, FileText, File, Laugh, Shuffle } from 'lucide-react'
import type { Expense, CategoryWithStats } from '@/types'
import { format, parseISO } from 'date-fns'
import { fetchMemeUrl } from '@/lib/memeApi'

interface ExpenseDetailModalProps {
  expense: Expense | null
  categories: CategoryWithStats[]
  memeVariant: number
  onVariantChange: (id: string, variant: number) => void
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(url)
}

function isPDF(url: string) {
  return /\.pdf$/i.test(url)
}

export default function ExpenseDetailModal({
  expense, categories, memeVariant, onVariantChange, onClose, onEdit, onDelete,
}: ExpenseDetailModalProps) {
  const [showMeme, setShowMeme] = useState(false)
  const [memeUrl, setMemeUrl] = useState<string | null>(null)
  const [memeFetching, setMemeFetching] = useState(false)
  const [memeLoaded, setMemeLoaded] = useState(false)
  const [memeError, setMemeError] = useState(false)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (showMeme && expense) loadMeme(memeVariant)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memeVariant, expense?.id])

  if (!expense) return null

  const category = categories.find(c => c.id === expense.category_id)

  const CATEGORY_COLORS: Record<number, string> = {
    0: 'bg-violet-100 text-violet-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-emerald-100 text-emerald-700',
    3: 'bg-orange-100 text-orange-700',
    4: 'bg-pink-100 text-pink-700',
  }
  const colorIdx = category ? categories.indexOf(category) % 5 : 0
  const colorClass = CATEGORY_COLORS[colorIdx]

  const loadMeme = (variant: number) => {
    setMemeLoaded(false)
    setMemeError(false)
    setMemeUrl(null)
    setMemeFetching(true)
    fetchMemeUrl(
      expense!.id,
      expense!.title,
      parseFloat(expense!.amount.toString()),
      category?.name ?? 'General',
      variant,
    )
      .then(url => { setMemeUrl(url); setMemeFetching(false) })
      .catch(() => { setMemeError(true); setMemeFetching(false) })
  }

  const handleToggleMeme = () => {
    if (!showMeme) loadMeme(memeVariant)
    setShowMeme(v => !v)
  }

  const handleNextMeme = () => {
    const next = memeVariant + 1
    onVariantChange(expense!.id, next)
    loadMeme(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-white/70 text-sm mb-1">Expense Details</p>
          <h2 className="text-2xl font-bold pr-8">{expense.title}</h2>
          <p className="text-3xl font-bold mt-2">
            ${parseFloat(expense.amount.toString()).toFixed(2)}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-4">
            {/* Category */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <Tag className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Category</p>
                {category ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                    {category.name}
                  </span>
                ) : (
                  <p className="text-sm text-slate-600">Unknown</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="text-sm font-medium text-slate-700">
                  {format(parseISO(expense.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Amount</p>
                <p className="text-sm font-bold text-rose-600">
                  -${parseFloat(expense.amount.toString()).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Attachment */}
            {expense.attachment_url ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Attachment</p>
                    <p className="text-sm font-medium text-slate-700">Bill / Receipt</p>
                  </div>
                  <a
                    href={expense.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs text-violet-600 hover:underline"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {isImage(expense.attachment_url) ? (
                  <div className="rounded-2xl overflow-hidden border border-violet-100 bg-slate-50">
                    <img
                      src={expense.attachment_url}
                      alt="Receipt"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                ) : isPDF(expense.attachment_url) ? (
                  <a
                    href={expense.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">PDF Document</p>
                      <p className="text-xs text-slate-400">Click to open</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
                  </a>
                ) : (
                  <a
                    href={expense.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                      <File className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Attached File</p>
                      <p className="text-xs text-slate-400">Click to open</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Paperclip className="w-4 h-4 text-slate-300" />
                <p className="text-sm text-slate-400">No attachment</p>
              </div>
            )}

            {/* ── Meme section ── */}
            <div className="border border-amber-200 rounded-2xl overflow-hidden">
              <button
                onClick={handleToggleMeme}
                className="w-full flex items-center px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Laugh className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700">
                    {showMeme ? 'Hide meme' : 'Show my spending meme 😂'}
                  </span>
                </div>
                {showMeme && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); handleNextMeme() }}
                    className="flex items-center gap-1 px-2.5 py-1 mr-2 text-xs font-medium text-amber-700 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    <Shuffle className="w-3 h-3" /> Next
                  </span>
                )}
                <span className="text-amber-400 text-xs">{showMeme ? '▲' : '▼'}</span>
              </button>

              {showMeme && (
                <div className="bg-white p-3">
                  {memeError ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      <p className="text-2xl mb-2">😬</p>
                      <p>Couldn't generate the meme. Try again.</p>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 min-h-[200px] flex items-center justify-center">
                      {(memeFetching || !memeLoaded) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                          <div className="w-8 h-8 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-slate-400">
                            {memeFetching ? 'AI is writing your meme…' : 'Loading image…'}
                          </p>
                        </div>
                      )}
                      {memeUrl && (
                        <img
                          src={memeUrl}
                          alt="Spending meme"
                          className={`w-full rounded-xl transition-opacity duration-300 ${memeLoaded ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => setMemeLoaded(true)}
                          onError={() => { setMemeLoaded(true); setMemeError(true) }}
                        />
                      )}
                    </div>
                  )}
                  {memeUrl && (
                    <a
                      href={memeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Open full size <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={() => { onDelete(expense.id); onClose() }}
            className="flex-1 py-3 text-sm font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-all"
          >
            Delete
          </button>
          <button
            onClick={() => { onEdit(expense); onClose() }}
            className="flex-1 btn-primary py-3 text-sm"
          >
            Edit Expense
          </button>
        </div>
      </div>
    </div>
  )
}
