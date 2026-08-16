'use client'

interface Props {
  open: boolean
  url: string
  fileName: string
  onClose: () => void
}

export default function DocumentPreviewModal({
  open,
  url,
  fileName,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-navy-900">
              {fileName}
            </h2>
            <p className="text-xs text-gray-400">
              Document preview
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
          >
            Close
          </button>
        </div>

        <iframe
          src={url}
          className="h-full w-full rounded-b-xl"
          title={fileName}
        />
      </div>
    </div>
  )
}