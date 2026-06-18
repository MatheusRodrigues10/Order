import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError";
import type { FluxoReserva, IntegradorSession } from "../types/integrador";

const SESSION_TTL_MS = 60 * 60 * 1000;

export class IntegradorSessionStore {
  private readonly sessions = new Map<string, IntegradorSession>();

  create(fluxo: FluxoReserva): IntegradorSession {
    this.cleanupExpired();

    const now = new Date();
    const session: IntegradorSession = {
      sessionId: randomUUID(),
      fluxo,
      etapaAtual: "iniciar",
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS)
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string, fluxo?: FluxoReserva): IntegradorSession {
    this.cleanupExpired();

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AppError("Sessão não encontrada ou expirada", 404);
    }

    if (fluxo && session.fluxo !== fluxo) {
      throw new AppError(`Sessão pertence ao fluxo '${session.fluxo}', não '${fluxo}'`, 409);
    }

    return session;
  }

  update(sessionId: string, patch: Partial<IntegradorSession>): IntegradorSession {
    const session = this.get(sessionId);
    const updated = { ...session, ...patch, sessionId: session.sessionId, fluxo: session.fluxo };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) {
        this.sessions.delete(id);
      }
    }
  }
}
