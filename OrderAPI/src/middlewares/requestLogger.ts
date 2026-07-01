import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";

const SENSITIVE_KEYS = /^(senha|password|token|jwt|secret|pin|apikey|api_key|authorization|cookie|creditcard|credit_card|cvv)$/i;

function sanitizeObj(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObj);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        continue;
      } else {
        result[key] = sanitizeObj(value);
      }
    }
    return result;
  }
  return obj;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/")) return next();

  const start = Date.now();

  const sanitizedBody = sanitizeObj(req.body || {});
  const body = JSON.stringify(sanitizedBody);

  const query = JSON.stringify(req.query || {});

  const safeHeaders: Record<string, string | undefined> = {
    "content-type": req.headers["content-type"],
    "user-agent": req.headers["user-agent"],
  };
  const headers = JSON.stringify(safeHeaders);

  let responseBody = "{}";

  const originalJson = res.json.bind(res);
  res.json = (data: unknown) => {
    try {
      const sanitized = sanitizeObj(data);
      responseBody = JSON.stringify(sanitized).slice(0, 4000);
    } catch { /* ignore */ }
    return originalJson(data);
  };

  // Capture res.send() for non-JSON responses (e.g. 429 rate-limit)
  const originalSend = res.send.bind(res);
  res.send = (data?: unknown) => {
    if (responseBody === "{}") {
      try {
        const parsed = JSON.parse(typeof data === "string" ? data : JSON.stringify(data));
        const sanitized = sanitizeObj(parsed);
        responseBody = JSON.stringify(sanitized).slice(0, 4000);
      } catch { /* not JSON, leave as {} */ }
    }
    return originalSend(data);
  };

  res.on("finish", () => {
    prisma.requestLog.create({
      data: {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
        query,
        body,
        headers,
        responseBody,
      },
    }).catch(() => {});
  });

  next();
}
