'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { FieldError } from 'react-hook-form'

// ── Input ─────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: FieldError
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="label">
            {label}{props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}

        <input
          ref={ref}
          className={cn('input', error && 'input-error', className)}
          {...props}
        />

        {error && <p className="form-error">{error.message}</p>}
        {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: FieldError
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<
  HTMLSelectElement,
  SelectProps
>(
  (
    {
      label,
      error,
      options,
      placeholder,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div>
        {label && (
          <label className="label">
            {label}
            {props.required && (
              <span className="text-red-400 ml-0.5">*</span>
            )}
          </label>
        )}

        <select
          ref={ref}
          className={cn(
            'input',
            error && 'input-error',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}

          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="form-error">
            {error.message}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// ── Textarea ──────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: FieldError
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea
        className={cn('input min-h-[80px] resize-y', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error.message}</p>}
    </div>
  )
}

// ── FormGrid ──────────────────────────────────────────────────────
export function FormGrid({ children, cols = 2 }: {
  children: React.ReactNode
  cols?: 1 | 2 | 3
}) {
  return (
    <div className={cn(
      'grid gap-4',
      cols === 1 && 'grid-cols-1',
      cols === 2 && 'grid-cols-1 sm:grid-cols-2',
      cols === 3 && 'grid-cols-1 sm:grid-cols-3',
    )}>
      {children}
    </div>
  )
}

// ── FormSection ───────────────────────────────────────────────────
export function FormSection({ title, children }: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider
                     mb-3 pb-2 border-b border-gray-100">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
