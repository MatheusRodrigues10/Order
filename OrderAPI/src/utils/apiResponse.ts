import type { Response } from "express";

export function ok<T>(response: Response, data: T, statusCode = 200) {
  return response.status(statusCode).json(data);
}

export function message(response: Response, text: string, statusCode = 200) {
  return response.status(statusCode).json({ message: text });
}
