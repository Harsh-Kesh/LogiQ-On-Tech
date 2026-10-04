import Stripe from 'stripe';

// Lazy singleton — the Stripe client is only constructed the first time a route
// handler actually calls a method on it. This prevents module-evaluation failures
// during `next build` when STRIPE_SECRET_KEY is not available in the CI environment.
let _stripe: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    _stripe = new Stripe(key, { apiVersion: '2026-08-26.dahlia', typescript: true });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getStripeInstance(), prop, getStripeInstance());
  },
});
