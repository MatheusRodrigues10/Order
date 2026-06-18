import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateRequest(schema: ZodSchema) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query
    });

    if (!parsed.success) {
      return next(parsed.error);
    }

    const data = parsed.data as {
      body?: unknown;
      params?: Record<string, unknown>;
    };

    if ("body" in data) {
      request.body = data.body;
    }

    if (data.params) {
      Object.assign(request.params, data.params);
    }

    return next();
  };
}
