import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  DEFAULT_API_PIN: z.string().min(4, "DEFAULT_API_PIN deve ter pelo menos 4 caracteres")
});

export const env = envSchema.parse(process.env);
