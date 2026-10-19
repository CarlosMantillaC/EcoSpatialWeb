import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type ChallengeType = 'registration' | 'authentication';

export interface ChallengeEntry {
  challenge: string;
  type: ChallengeType;
  userId?: string;
  email?: string;
  expiresAt: number;
}

const TTL_MS = 2 * 60 * 1000;

@Injectable()
export class ChallengeStore {
  private readonly store = new Map<string, ChallengeEntry>();

  create(
    data: Omit<ChallengeEntry, 'expiresAt'>,
  ): { flowId: string; entry: ChallengeEntry } {
    this.cleanup();
    const flowId = randomUUID();
    const entry: ChallengeEntry = { ...data, expiresAt: Date.now() + TTL_MS };
    this.store.set(flowId, entry);
    return { flowId, entry };
  }

  consume(flowId: string, type: ChallengeType): ChallengeEntry {
    const entry = this.store.get(flowId);
    if (!entry) {
      throw new Error('Sesion de autenticacion no encontrada o expirada');
    }
    if (entry.type !== type) {
      throw new Error('Tipo de operacion WebAuthn invalido');
    }
    this.store.delete(flowId);
    if (entry.expiresAt < Date.now()) {
      throw new Error('Sesion de autenticacion expirada');
    }
    return entry;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }
}
