import { Router } from "express";
import { adminRoutes } from "./adminRoutes";
import { authRoutes } from "./authRoutes";
import { externalApiRoutes } from "./externalApiRoutes";
import { integradorRoutes } from "./integradorRoutes";

const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

routes.use("/admin", authRoutes);
routes.use("/admin", adminRoutes);
routes.use("/api", externalApiRoutes);
routes.use("/api/integrador", integradorRoutes);

export { routes };
