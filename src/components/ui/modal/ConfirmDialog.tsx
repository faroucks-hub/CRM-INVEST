'use client'

import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

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

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title, message,
  confirmLabel = 'Confirmer',
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="p-6 text-center">
        <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center
          ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <h3 className="text-base font-semibold text-navy-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-outline flex-1" disabled={loading}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
