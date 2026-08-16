'use client'

import { useEffect, useState } from 'react'
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  deleteProjectDocument,
  approveProjectDocument,
} from '@/lib/actions/project-documents'

interface Props {
  doc: any
  isImage?: boolean
  projectId: string
}

export default function DocumentItem({
  doc,
  isImage = false,
  projectId,
}: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const extension =
    doc.file_name?.split('.').pop()?.toLowerCase() || ''

  const isPdf = extension === 'pdf'
  const isExcel = ['xls', 'xlsx', 'csv'].includes(extension)
  const isWord = ['doc', 'docx'].includes(extension)

  useEffect(() => {
    async function loadUrl() {
      try {
        const supabase = createClient()

        const { data, error } = await supabase.storage
          .from('project-documents')
          .createSignedUrl(doc.file_path, 3600)

        if (error) {
          console.error(error)
          return
        }

        if (data?.signedUrl) {
          setUrl(data.signedUrl)
        }
      } finally {
        setLoading(false)
      }
    }

    loadUrl()
  }, [doc.file_path])

  async function handleDelete() {
    if (!confirm('Delete this document ?')) return

    const result = await deleteProjectDocument(
      doc.id,
      doc.file_path,
      projectId
    )

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Document deleted')
    window.location.reload()
  }

  async function handleApprove() {
    const result = await approveProjectDocument(
      doc.id,
      doc.document_group,
      projectId
    )

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Document approved')
    window.location.reload()
  }

  const fileMissing = !loading && !url

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50">
          {isImage ? (
            <ImageIcon className="w-5 h-5 text-green-600" />
          ) : isPdf ? (
            <FileText className="w-5 h-5 text-red-600" />
          ) : isExcel ? (
            <FileText className="w-5 h-5 text-green-600" />
          ) : isWord ? (
            <FileText className="w-5 h-5 text-blue-600" />
          ) : (
            <FileText className="w-5 h-5 text-gray-600" />
          )}
        </div>

        <div>
          <div className="font-medium text-sm text-navy-900">
            {doc.file_name}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-gray-100 px-2 py-1">
              {doc.document_type}
            </span>

            {doc.document_group && doc.document_group !== doc.document_type && (
              <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                {doc.document_group}
              </span>
            )}

            <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-700">
              {extension.toUpperCase()}
            </span>

            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
              REV {doc.revision ?? 1}
            </span>

            <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700 capitalize">
              {doc.document_status ?? 'draft'}
            </span>

            <span className="text-gray-500">
              {(doc.file_size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {fileMissing && (
          <span className="text-xs font-medium text-red-500">
            File not found
          </span>
        )}

        {!fileMissing && (
          <>
            {doc.document_status !== 'approved' && (
              <button
                onClick={handleApprove}
                className="btn-icon p-2 text-green-600"
                title="Approve"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon p-2"
              title="Open"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href={url}
              download
              className="btn-icon p-2"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </>
        )}

        <button
          onClick={handleDelete}
          className="btn-icon p-2 text-red-500"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}