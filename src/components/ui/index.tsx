'use client'

import { cn } from '@/lib/utils'
import { X, Search, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

// ── Badge ─────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outline'
}
export function Badge({ children, className, variant = 'outline' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      variant === 'outline' && 'bg-transparent',
      className
    )}>
      {children}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

export function Modal({ open, onClose, title, subtitle, size = 'lg', children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={ref}
        className={cn(
          'relative w-full bg-white rounded-xl shadow-xl border border-gray-100',
          'max-h-[90vh] flex flex-col animate-fade-up',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-navy-900">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400
                       hover:text-gray-700 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────
interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher...', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg
                   bg-white placeholder-gray-400 outline-none
                   focus:ring-2 focus:ring-gold-400/20 focus:border-gold-400
                   transition-colors"
      />
    </div>
  )
}

// ── Select filter ─────────────────────────────────────────────────
interface FilterSelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function FilterSelect({ value, onChange, options, placeholder = 'Tous', className }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700',
        'outline-none focus:ring-2 focus:ring-gold-400/20 focus:border-gold-400',
        'transition-colors cursor-pointer',
        className
      )}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ── EmptyState ────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-200 flex items-center
                       justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-xs mb-5">{description}</p>
      )}
      {action}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────
interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
  className?: string
}

export function Alert({ type, message, className }: AlertProps) {
  const styles = {
    error:   { bg: 'bg-red-50 border-red-200 text-red-700',   icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
    success: { bg: 'bg-green-50 border-green-200 text-green-700', icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> },
    warning: { bg: 'bg-amber-50 border-amber-200 text-amber-700', icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
    info:    { bg: 'bg-blue-50 border-blue-200 text-blue-700',  icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
  }
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm',
      styles[type].bg, className
    )}>
      {styles[type].icon}
      {message}
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className="w-5 h-5 animate-spin text-navy-900/30" />
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirmer', danger = false, loading = false
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-sm p-6 animate-fade-up">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-outline btn-sm" disabled={loading}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('btn btn-sm', danger ? 'btn-danger' : 'btn-primary')}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: string
  onClick?: () => void
}

export function StatCard({ label, value, icon, trend, color = 'text-navy-900', onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'card p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        {icon && <div className="text-gray-300">{icon}</div>}
      </div>
      <div className={cn('text-2xl font-semibold', color)}>{value}</div>
      {trend && (
        <div className="text-xs text-gray-400 mt-1">
          <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          {' '}{trend.label}
        </div>
      )}
    </div>
  )
}
