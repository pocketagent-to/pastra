import { createHash } from 'node:crypto';

/**
 * The embedded wallet behind which the real provider (recommendation: Privy) is hidden. This is an
 * OPEN DECISION (handoff README): the provider is not committed. Everything that needs the user's
 * EOA goes through this interface so the choice can change without touching the card code.
 */
export interface EmbeddedWallet {
  /** The user's externally-owned account address (EOA) on Base. */
  address: string;
}

export interface WalletProvider {
  /** Return (creating if needed) the user's embedded wallet. */
  getOrCreateWallet(userId: string): Promise<EmbeddedWallet>;
  /** Sign a message with the user's key (action tokens, SIWE). In production this is client-side. */
  signMessage(userId: string, message: string): Promise<string>;
}

/** A deterministic in-memory wallet provider for development and tests. */
export class MockWalletProvider implements WalletProvider {
  async getOrCreateWallet(userId: string): Promise<EmbeddedWallet> {
    const hash = createHash('sha256').update(`wallet:${userId}`).digest('hex');
    return { address: `0x${hash.slice(0, 40)}` };
  }

  async signMessage(userId: string, message: string): Promise<string> {
    const sig = createHash('sha256').update(`${userId}:${message}`).digest('hex');
    return `0x${sig}`;
  }
}
