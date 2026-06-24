import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { swaggerSpec } from "./docs/swagger";
import { swaggerHtml } from "./docs/swaggerHtml";
import { errorHandler } from "./middlewares/errorHandler";
import { routes } from "./routes";
import { ReservaService } from "./services/reservaService";

export const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT ?? 300),
    standardHeaders: true,
    legacyHeaders: false
  })
);

let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60_000;
const reservaServiceCleanup = new ReservaService();

app.use((_req, _res, next) => {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    reservaServiceCleanup.cleanupExpired().catch(() => {});
  }
  next();
});

app.get("/docs/swagger.json", (_request, response) => {
  response.json(swaggerSpec);
});

app.get(["/docs", "/docs/"], (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(swaggerHtml);
});

app.use(routes);
app.use(errorHandler);
