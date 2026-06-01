import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

/**
 * Stripe Checkout success redirect lands here. We verify the session was paid,
 * then mark the milestone funded (under the signed-in client's RLS), and send
 * them back to the contract. Verifying server-side prevents spoofed success.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  const stripe = getStripe()
  if (!sessionId || !stripe) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const milestoneId = session.metadata?.milestone_id
  const contractId = session.metadata?.contract_id

  if (session.payment_status !== 'paid' || !milestoneId) {
    return NextResponse.redirect(
      new URL(contractId ? `/client/contracts/${contractId}` : '/', request.url),
    )
  }

  const supabase = await createClient()
  await supabase
    .from('milestones')
    .update({
      status: 'funded',
      funded_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .eq('id', milestoneId)
    .eq('status', 'pending') // idempotent: don't clobber a later state

  return NextResponse.redirect(
    new URL(`/client/contracts/${contractId}?funded=1`, request.url),
  )
}
