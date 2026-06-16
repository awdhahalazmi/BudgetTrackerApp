'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, DollarSign, Calendar, Tag, FileText, AlertCircle, Paperclip, Upload, Trash2, FileImage, File } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Category, Expense } from '@/types'
import { format } from 'date-fns'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  budgetId: string
  expense?: Expense | null
  onSuccess: () => void
}

const BUCKET = 'bills-attach'
const MAX_SIZE_MB = 10

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <FileImage className="w-4 h-4 text-violet-500" />
  return <File className="w-4 h-4 text-slate-500" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ExpenseModal({
  isOpen, onClose, categories, budgetId, expense, onSuccess,
}: ExpenseModalProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null)
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearFile = useCallback(() => {
    setFile(null)
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])

  useEffect(() => {
    if (expense) {
      setTitle(expense.title)
      setAmount(expense.amount.toString())
      setCategoryId(expense.category_id)
      setDate(expense.date)
      setExistingAttachment((expense as Expense & { attachment_url?: string }).attachment_url || null)
    } else {
      setTitle('')
      setAmount('')
      setCategoryId(categories[0]?.id || '')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setExistingAttachment(null)
    }
    clearFile()
    setRemoveAttachment(false)
    setError('')
  }, [expense, categories, isOpen, clearFile])

  if (!isOpen) return null

  const handleFileChange = (selected: File | null) => {
    if (!selected) return
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large — max ${MAX_SIZE_MB}MB`)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }

  const uploadFile = async (userId: string): Promise<string | null> => {
    if (!file) return null
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })
    setUploading(false)
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Please enter a title'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return }
    if (!categoryId) { setError('Please select a category'); return }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const attachmentUrl = file
        ? await uploadFile(user.id)
        : removeAttachment ? null : existingAttachment

      const payload = {
        title: title.trim(),
        amount: parseFloat(amount),
        category_id: categoryId,
        date,
        attachment_url: attachmentUrl,
      }

      if (expense) {
        const { error: err } = await supabase.from('expenses').update(payload).eq('id', expense.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('expenses').insert({
          ...payload,
          budget_id: budgetId,
          user_id: user.id,
        })
        if (err) throw err
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(url)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-6">
          {expense ? '✏️ Edit Expense' : '➕ Add Expense'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">What did you spend on?</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Lunch, Netflix, Groceries…"
                className="input-field pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="input-field pl-10 appearance-none"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-4 h-4" /> Attach Receipt / Bill
                <span className="text-xs text-slate-400 font-normal">(optional, max 10MB)</span>
              </span>
            </label>

            {/* Existing attachment */}
            {existingAttachment && !removeAttachment && !file && (
              <div className="mb-2 flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                {isImage(existingAttachment) ? (
                  <img
                    src={existingAttachment}
                    alt="attachment"
                    className="w-12 h-12 object-cover rounded-lg border border-violet-100"
                  />
                ) : (
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <File className="w-6 h-6 text-violet-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 truncate">Current attachment</p>
                  <a
                    href={existingAttachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-600 hover:underline"
                  >
                    View file ↗
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveAttachment(true)}
                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File selected preview */}
            {file && (
              <div className="mb-2 border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-52 object-contain bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-500 hover:text-rose-700 rounded-lg shadow transition-all"
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                  {!previewUrl && (
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Drop zone */}
            {!file && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">
                  Drop a file here or <span className="text-violet-600">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Images (JPG, PNG, HEIC) or PDF</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={e => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading || uploading} className="btn-primary flex-1">
              {loading || uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {uploading ? 'Uploading…' : 'Saving…'}
                </span>
              ) : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
