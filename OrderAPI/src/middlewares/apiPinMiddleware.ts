import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError";
import { SettingsRepository } from "../repositories/settingsRepository";

const settingsRepo = new SettingsRepository();

export async function apiPinMiddleware(req: Request, _res: Response, next: NextFunction) {
  const pin = req.header("X-API-PIN");
  if (!pin) throw new AppError("X-API-PIN é obrigatório", 401);

  const settings = await settingsRepo.find();
  const isValid = await bcrypt.compare(pin, settings.apiPin);
  if (!isValid) throw new AppError("PIN inválido", 401);

  next();
}
