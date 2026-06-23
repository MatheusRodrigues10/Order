/**
 * validate-rotation.ts
 *
 * Valida que credenciais novas funcionam e antigas não.
 * Não imprime tokens, senhas, PINs ou qualquer segredo.
 *
 * Uso:
 *   npx tsx scripts/validate-rotation.ts <BASE_URL>
 *
 * Exemplo:
 *   npx tsx scripts/validate-rotation.ts https://wa-restaurant.vercel.app
 *
 * Requer no ambiente:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_API_PIN
 *   OLD_ADMIN_PASSWORD (opcional), OLD_API_PIN (opcional)
 */
import "dotenv/config";

const BASE = process.argv[2];
if (!BASE) {
  console.error("Uso: npx tsx scripts/validate-rotation.ts <BASE_URL>");
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const apiPin = process.env.DEFAULT_API_PIN;
const oldPassword = process.env.OLD_ADMIN_PASSWORD;
const oldPin = process.env.OLD_API_PIN;

if (!email || !password || !apiPin) {
  console.error("ERRO: ADMIN_EMAIL, ADMIN_PASSWORD e DEFAULT_API_PIN devem estar no ambiente.");
  process.exit(1);
}

type Result = "PASS" | "FAIL";

async function httpStatus(url: string, init?: RequestInit): Promise<number> {
  const res = await fetch(url, init);
  return res.status;
}

async function testLogin(label: string, pwd: string, expected: number): Promise<Result> {
  const status = await httpStatus(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pwd }),
  });
  const result: Result = status === expected ? "PASS" : "FAIL";
  console.log(`  ${result} | ${label} → HTTP ${status} (esperado ${expected})`);
  return result;
}

async function testPin(label: string, pin: string, expected: number): Promise<Result> {
  const status = await httpStatus(`${BASE}/api/now`, {
    headers: { "X-API-PIN": pin },
  });
  const result: Result = status === expected ? "PASS" : "FAIL";
  console.log(`  ${result} | ${label} → HTTP ${status} (esperado ${expected})`);
  return result;
}

async function testAuthRoute(label: string, token: string, expected: number): Promise<Result> {
  const status = await httpStatus(`${BASE}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: Result = status === expected ? "PASS" : "FAIL";
  console.log(`  ${result} | ${label} → HTTP ${status} (esperado ${expected})`);
  return result;
}

async function main() {
  let failures = 0;
  const check = (r: Result) => { if (r === "FAIL") failures++; };

  console.log("=== Validação de rotação de segredos ===");
  console.log(`  URL: ${BASE}`);
  console.log("  Nenhum segredo será impresso.\n");

  // ── Credenciais novas devem funcionar ───────────────────────────────────────
  console.log("[Credenciais novas]");
  check(await testLogin("Login nova senha", password, 200));
  check(await testPin("API novo PIN", apiPin, 200));

  // Obter token novo (sem imprimir)
  const loginRes = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json() as { data?: { accessToken?: string } };
  const newToken = loginData?.data?.accessToken;

  if (newToken) {
    check(await testAuthRoute("Dashboard com token novo", newToken, 200));
  } else {
    console.log("  FAIL | Não obteve token novo para testar rota protegida");
    failures++;
  }

  // ── Credenciais antigas devem falhar ────────────────────────────────────────
  if (oldPassword || oldPin) {
    console.log("\n[Credenciais antigas]");
    if (oldPassword) check(await testLogin("Login senha antiga", oldPassword, 401));
    if (oldPin) check(await testPin("API PIN antigo", oldPin, 401));
  } else {
    console.log("\n[Credenciais antigas] Pulado — OLD_ADMIN_PASSWORD e OLD_API_PIN não definidos.");
  }

  // ── Token inválido deve falhar ──────────────────────────────────────────────
  console.log("\n[Tokens inválidos]");
  check(await testAuthRoute("Token inventado", "token.invalido.xyz", 401));

  // ── Resultado ───────────────────────────────────────────────────────────────
  console.log(`\n=== Resultado: ${failures === 0 ? "TODOS PASSARAM" : `${failures} FALHA(S)`} ===`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
