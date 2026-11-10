/**
 * Notification texts (docs/product-spec.md section 13). No health data and no balance amounts ever
 * appear in a message. A card payment shows the transaction amount, not the balance.
 */
export const templates = {
  drop: (levelFrom: number, levelTo: number, newOffers: number): string =>
    `Your week is in. LVL ${levelFrom} → ${levelTo}, ${newOffers} new offers.`,

  reconnect: (service: string, axis: string): string =>
    `We lost access to ${service}. Reconnect to keep your ${axis} side fresh.`,

  friendJoined: (handle: string): string => `${handle} built a pass. You both got +5 points.`,

  inviteReminder: (inviter: string): string => `${inviter} is waiting to compare passes with you.`,

  kycApproved: (): string => 'Your card is active.',
  kycRejected: (): string => "We couldn't verify you.",

  cardPayment: (merchant: string, amount: string, cashback?: string): string =>
    cashback ? `−${amount} at ${merchant}. Cashback +${cashback}.` : `−${amount} at ${merchant}.`,

  cashbackLanded: (amount: string): string => `+${amount} cashback landed.`,

  countryOpen: (country: string): string => `Cards are now open in ${country}.`,

  magicLink: (url: string): string =>
    `Sign in to Pastra: ${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
} as const;

export type TemplateName = keyof typeof templates;
