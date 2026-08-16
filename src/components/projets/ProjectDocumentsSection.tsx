'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import DocumentItem from './DocumentItem'
import { uploadProjectDocument } from '@/lib/actions/project-documents'
import { generateDocumentTransmittal } from '@/lib/actions/document-transmittals'

interface Props {
  projectId: string
  documents: any[]
}

const DOCUMENT_TYPES = [
  'general',
  'drawing',
  'approved_drawing',
  'as_built_drawing',
  'document_list',
  'equipment_list',
  'nameplate_list',
  'fat',
  'sat',
  'manual',
  'invoice',
  'shipping',
  'shipping_document',
  'certificate_origin',
  'warranty_certificate',
  'packing_list',
  'delivery_note',
  'datasheet',
]

export default function ProjectDocumentsSection({
  projectId,
  documents,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('general')
  const [documentGroup, setDocumentGroup] = useState('')

  async function uploadFile(file: File) {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('documentType', docType)
      formData.append('documentGroup', documentGroup)

      const result = await uploadProjectDocument(formData)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Document uploaded')
      window.location.reload()
    } finally {
      setUploading(false)
    }
  }

async function handleGenerateTransmittal() {
  try {
    const result = await generateDocumentTransmittal(projectId)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Transmittal ${result.transmittal.transmittal_number} generated`
    )

    window.location.reload()
  } catch (error) {
    toast.error('Failed to generate transmittal')
  }
}

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    await uploadFile(file)
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open,
  } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold">
            Project Documents
          </h2>

          <p className="text-sm text-gray-400">
            FAT reports, drawings, manuals, shipping docs...
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={documentGroup}
            onChange={(e) => setDocumentGroup(e.target.value)}
            className="input h-10 w-44"
            placeholder="N° doc / groupe"
            disabled={uploading}
            title="Ex. IME-PRJ-0048-DRW-001. Permet des révisions indépendantes par document."
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="input h-10"
            disabled={uploading}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={open}
            className="btn btn-primary"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

    <button
  type="button"
  onClick={handleGenerateTransmittal}
  className="btn btn-secondary"
>
  Generate Transmittal
</button>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 transition-all ${
          uploading
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer'
        } ${
          isDragActive
            ? 'border-navy-500 bg-navy-50'
            : 'border-gray-200 hover:border-navy-300 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="text-center">
          <div className="text-lg font-medium text-navy-900">
            {isDragActive ? 'Drop file here' : 'Drag & Drop documents'}
          </div>

          <div className="text-sm text-gray-400 mt-2">
            Drop a file here or click Upload to select a file.
          </div>

          <button
            type="button"
            onClick={open}
            className="btn btn-outline mt-4"
            disabled={uploading}
          >
            Browse Files
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-5">
        {documents?.length === 0 && (
          <div className="text-sm text-gray-400">
            No documents uploaded
          </div>
        )}

        {documents?.map((doc) => {
          const extension = doc.file_name
            ?.split('.')
            .pop()
            ?.toLowerCase()

          const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(
            extension
          )

          return (
            <DocumentItem
              key={doc.id}
              doc={doc}
              isImage={isImage}
              projectId={projectId}
            />
          )
        })}
      </div>
    </div>
  )
}