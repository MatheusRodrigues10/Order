import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AdminRepository } from "../repositories/adminRepository";
import { AppError } from "../utils/AppError";

export class AuthService {
  constructor(private readonly adminRepository = new AdminRepository()) {}

  async login(email: string, password: string) {
    const admin = await this.adminRepository.findByEmail(email);
    if (!admin) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const accessToken = jwt.sign({ sub: String(admin.id), email: admin.email }, env.JWT_SECRET as Secret, options);

    return { accessToken };
  }
}
