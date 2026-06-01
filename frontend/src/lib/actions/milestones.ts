'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

export type MilestoneState = { error?: string } | null

const PREVIEW = 'Admin preview is read-only — use the demo login to manage escrow.'

async function siteOrigin(): Promise<string> {
  const h = await headers()
  return h.get('origin') ?? `https://${h.get('host')}`
}

/** Fetch the milestone with its contract parties (RLS-scoped). */
async function loadMilestone(milestoneId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('milestones')
    .select('*, contracts!inner(id,client_id,provider_id)')
    .eq('id', milestoneId)
    .single()
  return data as
    | (Record<string, unknown> & {
        id: string
        amount: number
        title: string
        status: string
        contracts: { id: string; client_id: string; provider_id: string }
      })
    | null
}

// ---------------------------------------------------------------------------
// Client: add a milestone to a contract
// ---------------------------------------------------------------------------
export async function addMilestoneAction(
  contractId: string,
  _prev: MilestoneState,
  formData: FormData,
): Promise<MilestoneState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'client') return { error: PREVIEW }

  const title = String(formData.get('title') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0)
  const description = String(formData.get('description') ?? '').trim() || null
  if (!title) return { error: 'Give the milestone a title.' }
  if (!amount || amount <= 0) return { error: 'Enter a positive amount.' }

  const supabase = await createClient()
  const { data: contract } = await supabase
    .from('contracts')
    .select('id,client_id')
    .eq('id', contractId)
    .single()
  if (!contract || contract.client_id !== ctx.realProfile.id) return { error: 'Not your contract.' }

  const { count } = await supabase
    .from('milestones')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', contractId)

  const { error } = await supabase.from('milestones').insert({
    contract_id: contractId,
    title,
    description,
    amount,
    sort_order: (count ?? 0) + 1,
    status: 'pending',
  })
  if (error) return { error: error.message }

  revalidatePath(`/client/contracts/${contractId}`)
  return null
}

// ---------------------------------------------------------------------------
// Client: fund a milestone → Stripe Checkout (test mode)
// ---------------------------------------------------------------------------
export async function fundMilestoneAction(milestoneId: string): Promise<MilestoneState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'client') return { error: PREVIEW }

  const m = await loadMilestone(milestoneId)
  if (!m || m.contracts.client_id !== ctx.realProfile.id) return { error: 'Not your contract.' }
  if (m.status !== 'pending') return { error: 'This milestone is already funded.' }

  const stripe = getStripe()
  if (!stripe) {
    return { error: 'Payments are not configured. Set STRIPE_SECRET_KEY to enable escrow.' }
  }

  const origin = await siteOrigin()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(m.amount) * 100),
          product_data: { name: `Milestone: ${m.title}` },
        },
      },
    ],
    metadata: { milestone_id: m.id, contract_id: m.contracts.id },
    success_url: `${origin}/api/stripe/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/client/contracts/${m.contracts.id}`,
  })

  if (!session.url) return { error: 'Could not start checkout.' }
  redirect(session.url)
}

// ---------------------------------------------------------------------------
// Provider: submit work for a funded milestone
// ---------------------------------------------------------------------------
export async function submitMilestoneAction(milestoneId: string): Promise<MilestoneState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'provider') return { error: PREVIEW }

  const m = await loadMilestone(milestoneId)
  if (!m || m.contracts.provider_id !== ctx.realProfile.id) return { error: 'Not your contract.' }
  if (m.status !== 'funded') return { error: 'This milestone is not funded yet.' }

  const supabase = await createClient()
  await supabase.from('milestones').update({ status: 'submitted' }).eq('id', milestoneId)
  revalidatePath(`/provider/contracts/${m.contracts.id}`)
  return null
}

// ---------------------------------------------------------------------------
// Client: release escrow to the provider
// ---------------------------------------------------------------------------
export async function releaseMilestoneAction(milestoneId: string): Promise<MilestoneState> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.isImpersonating || ctx.realRole !== 'client') return { error: PREVIEW }

  const m = await loadMilestone(milestoneId)
  if (!m || m.contracts.client_id !== ctx.realProfile.id) return { error: 'Not your contract.' }
  if (m.status !== 'funded' && m.status !== 'submitted') return { error: 'Nothing to release.' }

  const supabase = await createClient()
  await supabase
    .from('milestones')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', milestoneId)
  revalidatePath(`/client/contracts/${m.contracts.id}`)
  return null
}
