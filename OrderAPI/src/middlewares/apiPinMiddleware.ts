import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export async function apiPinMiddleware(request: Request, _response: Response, next: NextFunction) {
  try {
    const pin = request.header("X-API-PIN");
    const expectedPin = process.env.DEFAULT_API_PIN ?? "123456";

    if (!pin || pin !== expectedPin) {
      throw new AppError("PIN da API inválido", 401);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
