'use client'

import { useEffect, useRef, useState } from 'react'
import {
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  signedUrl,
  formatBytes,
  type EntityType,
} from '@/lib/attachments'
import { Button } from '@/components/ui/button'
import { Paperclip, Download, X, Loader2, FileText } from 'lucide-react'
import type { Attachment } from '@/lib/database.types'

export function Attachments({
  entityType,
  entityId,
  canUpload = false,
  currentUserId,
  compact = false,
}: {
  entityType: EntityType
  entityId: string
  canUpload?: boolean
  currentUserId?: string
  compact?: boolean
}) {
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    listAttachments(entityType, entityId)
      .then((a) => active && setItems(a))
      .catch(() => active && setError('Could not load attachments.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [entityType, entityId])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      const added: Attachment[] = []
      for (const file of Array.from(files)) {
        added.push(await uploadAttachment(file, entityType, entityId))
      }
      setItems((prev) => [...prev, ...added])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function download(att: Attachment) {
    try {
      const url = await signedUrl(att.storage_path)
      window.open(url, '_blank', 'noopener')
    } catch {
      setError('Could not open that file.')
    }
  }

  async function remove(att: Attachment) {
    setItems((prev) => prev.filter((a) => a.id !== att.id))
    try {
      await deleteAttachment(att)
    } catch {
      // re-add on failure
      setItems((prev) => [...prev, att])
      setError('Could not delete that file.')
    }
  }

  if (loading) {
    return <p className="text-xs text-[var(--color-fg-muted)]">Loading attachments…</p>
  }

  if (compact && items.length === 0 && !canUpload) return null

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4 text-[var(--color-fg-muted)]" />
          Attachments {items.length > 0 && <span className="text-[var(--color-fg-muted)]">({items.length})</span>}
        </div>
      )}

      {items.length === 0 ? (
        !compact && <p className="text-xs text-[var(--color-fg-muted)]">No files attached.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-[var(--color-fg-muted)]" />
              <button
                onClick={() => download(a)}
                className="min-w-0 flex-1 text-left text-sm truncate hover:text-brand-700"
                title={a.file_name}
              >
                {a.file_name}
              </button>
              <span className="text-xs text-[var(--color-fg-muted)] shrink-0">
                {formatBytes(a.size_bytes)}
              </span>
              <button onClick={() => download(a)} className="text-[var(--color-fg-muted)] hover:text-brand-700">
                <Download className="h-4 w-4" />
              </button>
              {canUpload && currentUserId && a.uploader_id === currentUserId && (
                <button onClick={() => remove(a)} className="text-[var(--color-fg-muted)] hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {busy ? 'Uploading…' : 'Attach files'}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
