import type { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { ok } from "../utils/apiResponse";

const authService = new AuthService();

export class AuthController {
  async login(request: Request, response: Response) {
    const { email, password } = request.body;
    const result = await authService.login(email, password);
    return ok(response, result);
  }
}
