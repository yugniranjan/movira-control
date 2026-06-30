// Sales channels routed by the backend's `location_payment_settings` table.
// Each entry's `availability` tracks whether the PaymentService actually
// dispatches through the new adapter pipeline for that channel today, or if
// it's still routed by legacy code (or not yet implemented). The Routing
// matrix uses this to lock cells the backend can't honour yet — so users
// don't configure something that won't take effect.
//
// Backend reference: services/payments/paymentService.js
//   - createPaymentLink / createCheckoutSession  → online card flows
//   - startTerminalPayment (notYet)              → Phase 4 (POS card-present)
//   - createSubscription (notYet)                → Phase 5 (recurring)
//
// `adapterCapability` matches the booleans on each adapter's `capabilities`
// (services/payments/providers/<vendor>/index.js → capabilities.online /
// .terminal / .recurring). The route editor filters provider choices by this.

export const CHANNELS = [
  {
    key: "online_booking",
    label: "Online booking",
    description: "Customer-facing web checkout (booking portal).",
    tenderType: "card",
    adapterCapability: "online",
    availability: "live",
  },
  {
    key: "payment_link",
    label: "Payment links",
    description: "Admin-sent payment requests emailed to guests.",
    tenderType: "card",
    adapterCapability: "online",
    availability: "live",
  },
  {
    key: "kiosk",
    label: "Kiosk",
    description: "Self-serve kiosk checkout on-site (card-not-present).",
    tenderType: "card",
    adapterCapability: "online",
    availability: "live",
  },
  {
    key: "pos",
    label: "POS / card terminal",
    description: "Cashier app driving a card-present reader (Stripe Terminal).",
    tenderType: "card",
    adapterCapability: "terminal",
    availability: "live",
  },
  {
    key: "recurring",
    label: "Recurring / memberships",
    description: "Automated membership & subscription billing (card on file).",
    tenderType: "card",
    adapterCapability: "recurring",
    availability: "live",
  },
];

export const channelByKey = Object.fromEntries(CHANNELS.map((c) => [c.key, c]));

export const AVAILABILITY_TONE = {
  live: "green",
  phase4: "amber",
  phase5: "neutral",
};

export function isChannelEditable(channelKey) {
  return channelByKey[channelKey]?.availability === "live";
}
