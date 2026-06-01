import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/database.types'

export type EntityType = 'job' | 'application' | 'message' | 'contract' | 'milestone'

const BUCKET = 'attachments'

export async function listAttachments(
  entityType: EntityType,
  entityId: string,
): Promise<Attachment[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })
  return (data as Attachment[]) ?? []
}

/** Upload a file to Storage (under the user's own folder) and record metadata. */
export async function uploadAttachment(
  file: File,
  entityType: EntityType,
  entityId: string,
): Promise<Attachment> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to upload.')

  // Path MUST start with the uploader's id (Storage insert policy).
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${entityType}/${crypto.randomUUID()}_${safe}`

  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (up.error) throw up.error

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      uploader_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      bucket: BUCKET,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    // Roll back the orphaned object so we don't leak storage.
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data as Attachment
}

/** Short-lived signed URL for downloading a private object. */
export async function signedUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
  if (error || !data) throw error ?? new Error('Could not create a download link.')
  return data.signedUrl
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([att.storage_path])
  await supabase.from('attachments').delete().eq('id', att.id)
}

export function formatBytes(n: number | null | undefined): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
