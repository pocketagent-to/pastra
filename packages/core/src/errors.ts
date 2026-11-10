/** Closed list of core error codes surfaced to the API (docs/architecture.md section 12). */
export type CoreErrorCode =
  | 'already_linked'
  | 'private_data'
  | 'not_found'
  | 'forbidden'
  | 'invalid'
  | 'rate_limited'
  | 'handle_taken'
  | 'handle_invalid'
  | 'handle_reserved'
  | 'country_not_supported'
  | 'card_required'
  | 'non_zero_balance'
  | 'offer_unavailable';

export class CoreError extends Error {
  constructor(
    readonly code: CoreErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'CoreError';
  }
}
