import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { swaggerSpec } from "./docs/swagger";
import { swaggerHtml } from "./docs/swaggerHtml";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { routes } from "./routes";
import { logViewerRoutes } from "./routes/logViewerRoutes";
import { ReservaService } from "./services/reservaService";

export const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://wa-restaurant.vercel.app"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
const corsOrigin = process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === "production" ? "*" : "http://localhost:5173");
app.use(cors({
  origin: corsOrigin,
  credentials: corsOrigin !== "*"
}));
app.use(express.json({ limit: "100kb" }));
// requestLogger runs before rateLimit so throttled /api/* requests are still recorded
app.use(requestLogger);

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
app.use(logViewerRoutes);
app.use(routes);
app.use(errorHandler);
