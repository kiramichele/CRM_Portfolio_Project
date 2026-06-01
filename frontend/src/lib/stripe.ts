import 'server-only'
import Stripe from 'stripe'

/** Server-side Stripe client. Returns null if not configured (graceful demo). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}
