import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { SettingsRepository } from "../repositories/settingsRepository";

const settingsRepo = new SettingsRepository();

export async function apiPinMiddleware(req: Request, _res: Response, next: NextFunction) {
  const pin = req.header("X-API-PIN");
  if (!pin) throw new AppError("X-API-PIN é obrigatório", 401);

  const settings = await settingsRepo.find();
  if (pin !== settings.apiPin) throw new AppError("PIN inválido", 401);

  next();
}
