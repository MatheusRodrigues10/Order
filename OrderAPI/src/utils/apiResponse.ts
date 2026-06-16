import type { Response } from "express";

export function ok<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function msg(res: Response, message: string, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message });
}
