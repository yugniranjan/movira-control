// Supported payment gateways. The integrations are "hardcoded" (we ship an
// adapter per provider); only the credentials & routing are configured by the
// owner. `monogram`/`accent` drive the lightweight logo badge in the UI.
export const PROVIDERS = [
  {
    key: "stripe",
    name: "Stripe",
    monogram: "S",
    accent: "#635bff",
    blurb: "Cards & wallets for online and links. Strong global coverage.",
    bestFor: ["online_booking", "payment_link", "recurring"],
  },
  {
    key: "nuvei",
    name: "Nuvei",
    monogram: "N",
    accent: "#e4002b",
    blurb: "Omnichannel: unified card-present (POS) + online in one provider.",
    bestFor: ["pos", "kiosk", "online_booking"],
  },
  {
    key: "razorpay",
    name: "Razorpay",
    monogram: "R",
    accent: "#3395ff",
    blurb: "India-first payments (UPI, cards, netbanking).",
    bestFor: ["online_booking", "payment_link"],
  },
];

export const providerByKey = Object.fromEntries(PROVIDERS.map((p) => [p.key, p]));
