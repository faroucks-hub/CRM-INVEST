'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

const SIZES = {
  sm:  'max-w-md',
  md:  'max-w-xl',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
}

export default function Modal({
  open, onClose, title, subtitle, size = 'md', children
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-navy-900/50 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={cn(
        'w-full bg-white rounded-xl shadow-xl border border-gray-100',
        'animate-fade-up max-h-[90vh] flex flex-col',
        SIZES[size]
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4
                       border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-md text-gray-400 hover:text-gray-600
                       hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
