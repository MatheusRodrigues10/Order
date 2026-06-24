import type { Page } from "@playwright/test";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";
export const EMAIL = requireEnv("E2E_ADMIN_EMAIL");
export const PASSWORD = requireEnv("E2E_ADMIN_PASSWORD");
const API_PIN = requireEnv("E2E_API_PIN");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} não está definido. Configure as variáveis de ambiente E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD e E2E_API_PIN antes de rodar os testes (ex: em um .env.test ou nas secrets do CI).`
    );
  }
  return value;
}

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

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
}

export async function injectAuth(page: Page): Promise<void> {
  const token = await getToken();
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((tk) => localStorage.setItem("wa_token", tk), token);
  await page.goto(`${BASE_URL}/`);
  await page.waitForSelector("h1", { timeout: 15_000 });
}

export async function waitForMesaGrid(page: Page): Promise<void> {
  await page.waitForSelector('button:has-text("Mesa")', { timeout: 20_000 });
  await page.waitForTimeout(300);
}

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
