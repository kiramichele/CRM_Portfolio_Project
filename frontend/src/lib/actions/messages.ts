'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'

export type SendResult = { error?: string; id?: string } | null

export async function sendMessageAction(threadId: string, body: string): Promise<SendResult> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Message is empty.' }

  const ctx = await getEffectiveContext()
  if (!ctx) return { error: 'Not signed in.' }
  if (ctx.isImpersonating) {
    return { error: 'Admin preview is read-only — use the demo login to send messages.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: ctx.realProfile.id, body: trimmed })
    .select('id')
    .single()
  if (error) return { error: error.message }

  revalidatePath(`/messages/${threadId}`)
  return { id: data!.id }
}
