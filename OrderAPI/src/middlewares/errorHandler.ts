import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Erro de validação",
      errors: error.issues
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return res.status(404).json({ success: false, message: "Registro não encontrado" });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Erro interno do servidor",
    ...(env.NODE_ENV === "development" ? { error: String(error) } : {})
  });
}
