import type { Page } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
export const API_URL = "http://localhost:3001";
export const EMAIL = "admin@restaurant.local";
export const PASSWORD = "Admin@345336436";
const API_PIN = "123456";

// Token é cacheado na sessão de testes para não exceder o rate limit (300/15min)
let _cachedToken: string | null = null;

export async function getToken(): Promise<string> {
  if (_cachedToken) return _cachedToken;

  const res = await fetch(`${API_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-PIN": API_PIN },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = (await res.json()) as { data: { accessToken: string } };
  _cachedToken = json.data.accessToken;
  return _cachedToken!;
}

/** Faz login pela UI (testa o fluxo completo de login) */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
}

/** Injeta o JWT no localStorage para pular o formulário de login */
export async function injectAuth(page: Page): Promise<void> {
  const token = await getToken();
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((tk) => localStorage.setItem("wa_token", tk), token);
  await page.goto(`${BASE_URL}/`);
  // Aguarda a página autenticada renderizar (h1 aparece quando autenticado)
  await page.waitForSelector("h1", { timeout: 15_000 });
}

/** Aguarda a grade de mesas carregar com botões de mesa interativos */
export async function waitForMesaGrid(page: Page): Promise<void> {
  // Aguarda pelo menos um botão de mesa aparecer
  await page.waitForSelector('button:has-text("Mesa")', { timeout: 20_000 });
  // Dá tempo para React terminar de processar o estado das mesas
  await page.waitForTimeout(300);
}

/** Faz uma chamada direta ao backend usando o token cacheado */
export async function apiCall(
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
): Promise<Response> {
  const token = await getToken();
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
