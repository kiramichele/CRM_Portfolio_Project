'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'
import type { ApplicationStatus } from '@/lib/database.types'

export type ActionState = { error?: string } | null

const PREVIEW_MSG =
  'Admin preview is read-only. Use the one-click "View as Client/Provider" demo login to act as that user.'

// ---------------------------------------------------------------------------
// Client: post a job
// ---------------------------------------------------------------------------
export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'client') return { error: PREVIEW_MSG }

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category_id = formData.get('category_id') ? Number(formData.get('category_id')) : null
  const budget_type = (String(formData.get('budget_type') ?? 'fixed')) as 'fixed' | 'hourly'
  const budget_min = formData.get('budget_min') ? Number(formData.get('budget_min')) : null
  const budget_max = formData.get('budget_max') ? Number(formData.get('budget_max')) : null
  const publish = formData.get('publish') === 'true'

  if (!title || !description) return { error: 'Title and description are required.' }
  if (budget_min != null && budget_max != null && budget_min > budget_max)
    return { error: 'Minimum budget cannot exceed maximum.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: ctx.realProfile.id,
      title,
      description,
      category_id,
      budget_type,
      budget_min,
      budget_max,
      status: publish ? 'open' : 'draft',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/client/jobs/${data!.id}`)
}

// ---------------------------------------------------------------------------
// Client: change a job's status (publish a draft, move to review, close)
// ---------------------------------------------------------------------------
export async function updateJobStatusAction(jobId: string, status: string) {
  const ctx = await getEffectiveContext()
  if (!ctx || ctx.isImpersonating || ctx.realRole !== 'client') return
  const supabase = await createClient()
  await supabase.from('jobs').update({ status: status as never }).eq('id', jobId)
  revalidatePath(`/client/jobs/${jobId}`)
  revalidatePath('/client/jobs')
}

// ---------------------------------------------------------------------------
// Provider: apply to a job
// ---------------------------------------------------------------------------
export async function applyToJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'provider') return { error: PREVIEW_MSG }

  const job_id = String(formData.get('job_id') ?? '')
  const cover_note = String(formData.get('cover_note') ?? '').trim()
  const bid_amount = formData.get('bid_amount') ? Number(formData.get('bid_amount')) : null

  if (!cover_note) return { error: 'A cover note helps you stand out — add a few lines.' }

  const supabase = await createClient()
  const { error } = await supabase.from('applications').insert({
    job_id,
    provider_id: ctx.realProfile.id,
    cover_note,
    bid_amount,
  })

  if (error) {
    if (error.code === '23505') return { error: "You've already applied to this job." }
    return { error: error.message }
  }
  redirect('/provider/applications')
}

// ---------------------------------------------------------------------------
// Client: shortlist / reject an applicant
// ---------------------------------------------------------------------------
export async function setApplicationStatusAction(
  applicationId: string,
  status: ApplicationStatus,
  jobId: string,
) {
  const ctx = await getEffectiveContext()
  if (!ctx || ctx.isImpersonating || ctx.realRole !== 'client') return
  const supabase = await createClient()
  await supabase.from('applications').update({ status }).eq('id', applicationId)
  revalidatePath(`/client/jobs/${jobId}`)
}

// ---------------------------------------------------------------------------
// Client: award a job to an applicant → accept, reject others, create
// contract + a messaging thread, move job to "awarded".
// ---------------------------------------------------------------------------
export async function awardJobAction(applicationId: string, jobId: string) {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'client') return { error: PREVIEW_MSG }

  const supabase = await createClient()

  const { data: app } = await supabase
    .from('applications')
    .select('id,provider_id,bid_amount,job_id')
    .eq('id', applicationId)
    .single()
  if (!app) return { error: 'Application not found.' }

  // Accept the winner, reject the rest.
  await supabase.from('applications').update({ status: 'accepted' }).eq('id', applicationId)
  await supabase
    .from('applications')
    .update({ status: 'rejected' })
    .eq('job_id', jobId)
    .neq('id', applicationId)
    .in('status', ['submitted', 'shortlisted'])

  // Create the contract.
  const { data: contract, error: cErr } = await supabase
    .from('contracts')
    .insert({
      job_id: jobId,
      application_id: applicationId,
      client_id: ctx.realProfile.id,
      provider_id: app.provider_id,
      agreed_amount: app.bid_amount,
      status: 'active',
    })
    .select('id')
    .single()
  if (cErr) return { error: cErr.message }

  // Open a messaging thread between the two parties (idempotent on the unique key).
  await supabase
    .from('threads')
    .upsert(
      { job_id: jobId, client_id: ctx.realProfile.id, provider_id: app.provider_id },
      { onConflict: 'job_id,client_id,provider_id', ignoreDuplicates: true },
    )

  // Move the job forward.
  await supabase.from('jobs').update({ status: 'awarded' }).eq('id', jobId)

  redirect(`/client/contracts/${contract!.id}`)
}
