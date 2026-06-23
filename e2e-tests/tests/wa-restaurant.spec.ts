import { test, expect, type Page } from "@playwright/test";
import { loginViaUI, injectAuth, waitForMesaGrid, apiCall, BASE_URL } from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Coletor de erros de console/page (filtra ruído de HMR do Vite)
// ─────────────────────────────────────────────────────────────────────────────
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const failedRequests: string[] = [];

const HMR = /ERR_ABORTED|\.vite\/deps|\.tsx\?t=|hot-update|fonts\.gstatic\.com|fonts\.googleapis\.com/;

function attachListeners(page: Page) {
  page.on("console", (m) => {
    if (m.type() === "error" && !HMR.test(m.text())) consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => {
    if (!HMR.test(e.message)) pageErrors.push(e.message);
  });
  page.on("requestfailed", (r) => {
    if (!HMR.test(r.url()))
      failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`);
  });
}

// Data de amanhã para evitar filtro de slots passados
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOGIN VIA UI
// ─────────────────────────────────────────────────────────────────────────────
test("1 · Login via formulário", async ({ page }) => {
  attachListeners(page);
  await loginViaUI(page);
  await expect(page).toHaveURL(`${BASE_URL}/`);
  await expect(page.locator("h1")).toContainText("Salão hoje");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
test("2 · Dashboard carrega com stats e grade de mesas", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await expect(page.locator("h1")).toContainText("Salão hoje");
  await expect(page.locator("text=Total de mesas")).toBeVisible();
  await expect(page.locator("text=Disponíveis")).toBeVisible();
  await waitForMesaGrid(page);
  await expect(page.locator("text=Legenda")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLIQUE EM MESA DISPONÍVEL
// ─────────────────────────────────────────────────────────────────────────────
test("3 · Clique em mesa disponível abre modal de ações", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await waitForMesaGrid(page);

  const firstMesa = page.locator('button:has-text("Mesa")').first();
  await firstMesa.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  // Verifica o heading do modal (h2 "Mesa X")
  await expect(dialog.locator("h2").first()).toBeVisible();
  await expect(dialog.locator("h2").first()).toContainText("Mesa");
  await expect(dialog.locator("text=lugares")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MODAL NOVA RESERVA
// ─────────────────────────────────────────────────────────────────────────────
test("4 · Botão Nova reserva abre modal de criação", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("text=Nova reserva")).toBeVisible();
  await expect(dialog.locator("text=Número da mesa")).toBeVisible();
  // Mesa input (primeiro number), Pessoas (segundo number), Telefone (tel)
  await expect(dialog.locator('input[type="number"]').first()).toBeVisible();
  await expect(dialog.locator('input[type="tel"]')).toBeVisible();

  await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CRIAR RESERVA VÁLIDA
// ─────────────────────────────────────────────────────────────────────────────
test("5 · Criar reserva válida via modal", async ({ page }) => {
  attachListeners(page);

  // Cleanup: cancela reservas anteriores de mesa 5 amanhã para evitar conflito
  const listRes = await apiCall("/admin/reservations");
  if (listRes.ok) {
    const listJson = (await listRes.json()) as {
      data: Array<{ id: number; numeroMesa: number; inicioReserva: string }>;
    };
    const tmw = tomorrow();
    for (const r of listJson.data ?? []) {
      if (r.numeroMesa === 5 && r.inicioReserva.startsWith(tmw)) {
        await apiCall(`/admin/reservations/${r.id}`, "DELETE");
      }
    }
  }

  await injectAuth(page);
  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Data
  await dialog.locator('input[type="date"]').fill(tomorrow());

  // Mesa (primeiro input numérico)
  await dialog.locator('input[type="number"]').first().clear();
  await dialog.locator('input[type="number"]').first().fill("5");

  // Turno Jantar
  await dialog.locator('button[role="tab"]:has-text("Jantar")').click();

  // Hora (segundo combobox — primeiro é Duração)
  const horaTrigger = dialog.locator('[role="combobox"]').nth(1);
  await expect(horaTrigger).toBeVisible({ timeout: 5_000 });
  await horaTrigger.click();
  await page.locator('[role="option"]').first().waitFor({ state: "visible" });
  await page.locator('[role="option"]').first().click();

  // Nome e telefone
  await dialog.locator('input[type="text"]').fill("Cliente E2E");
  await dialog.locator('input[type="tel"]').fill("11987654321");

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/admin/reservations") && r.request().method() === "POST",
      { timeout: 15_000 },
    ),
    dialog.locator('button:has-text("Confirmar reserva")').click(),
  ]);

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data.mesas)).toBe(true);
  // Backend agora retorna IDs
  expect(Array.isArray(body.data.ids)).toBe(true);
  expect(body.data.ids.length).toBeGreaterThan(0);

  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. MESA 999 REJEITADA PELO FRONTEND
// ─────────────────────────────────────────────────────────────────────────────
test("6 · Mesa 999 é rejeitada pelo frontend antes da requisição", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="date"]').fill(tomorrow());
  await dialog.locator('input[type="number"]').first().clear();
  await dialog.locator('input[type="number"]').first().fill("999");

  const horaTrigger = dialog.locator('[role="combobox"]').nth(1);
  await horaTrigger.click();
  await page.locator('[role="option"]').first().waitFor({ state: "visible" });
  await page.locator('[role="option"]').first().click();

  let requestMade = false;
  page.on("request", (r) => {
    if (r.url().includes("/admin/reservations") && r.method() === "POST") requestMade = true;
  });

  await dialog.locator('button:has-text("Confirmar reserva")').click();

  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
  const txt = await page.locator("[data-sonner-toast]").textContent();
  expect(txt).toMatch(/Mesa 999 não existe|restaurante tem/i);
  expect(requestMade).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. TELEFONE INCOMPLETO
// ─────────────────────────────────────────────────────────────────────────────
test("7 · Telefone incompleto bloqueia o submit", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="date"]').fill(tomorrow());
  await dialog.locator('input[type="number"]').first().clear();
  await dialog.locator('input[type="number"]').first().fill("2");

  const horaTrigger = dialog.locator('[role="combobox"]').nth(1);
  await horaTrigger.click();
  await page.locator('[role="option"]').first().waitFor({ state: "visible" });
  await page.locator('[role="option"]').first().click();

  await dialog.locator('input[type="text"]').fill("Cliente E2E Telefone");
  await dialog.locator('input[type="tel"]').fill("11999");

  await dialog.locator('button:has-text("Confirmar reserva")').click();

  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
  const txt = await page.locator("[data-sonner-toast]").textContent();
  expect(txt).toContain("Telefone incompleto");
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. SLOT 21:00 EXCLUÍDO (limpeza excede fechamento 23:00)
// ─────────────────────────────────────────────────────────────────────────────
test("8 · Slots que ultrapassariam o fechamento com limpeza não são exibidos", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="date"]').fill(tomorrow());
  await dialog.locator('button[role="tab"]:has-text("Jantar")').click();

  // Abre select de hora (nth(1))
  const horaTrigger = dialog.locator('[role="combobox"]').nth(1);
  await horaTrigger.click();
  const options = page.locator('[role="option"]');
  await options.first().waitFor({ state: "visible", timeout: 5_000 });

  const allTexts = await options.allTextContents();
  // 21:00 + 120min + 30min = 23:30 > 23:00 → deve ser excluído
  expect(allTexts.join("|")).not.toContain("21:00 →");
  // Último slot disponível deve ser 20:30 (20:30+120+30=23:00)
  const last = allTexts.at(-1) ?? "";
  expect(last).toContain("20:30");

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. CANCELAR RESERVA via página /reservations
// ─────────────────────────────────────────────────────────────────────────────
test("9 · Cancelar reserva via página de reservas", async ({ page }) => {
  attachListeners(page);

  // Cleanup: cancela qualquer reserva anterior de execuções passadas na mesa 8 amanhã
  const listRes = await apiCall("/admin/reservations");
  if (listRes.ok) {
    const listJson = (await listRes.json()) as {
      data: Array<{ id: number; numeroMesa: number; inicioReserva: string }>;
    };
    const tmw = tomorrow();
    for (const r of listJson.data ?? []) {
      if (r.numeroMesa === 8 && r.inicioReserva.startsWith(tmw)) {
        await apiCall(`/admin/reservations/${r.id}`, "DELETE");
      }
    }
  }

  // Cria reserva via API (usa token cacheado)
  const createRes = await apiCall("/admin/reservations", "POST", {
    mesa: 8,
    quantidadePessoas: 2,
    data: tomorrow(),
    hora: "19:00",
    nomeCliente: "E2E Cancelar",
    telefone: "11987654321",
  });
  expect(createRes.status).toBe(201);
  const { data: reservaData } = (await createRes.json()) as {
    data: { ids: number[]; mesas: number[] };
  };
  const reservaId = reservaData.ids[0];

  await injectAuth(page);
  await page.goto(`${BASE_URL}/reservations`);
  await expect(page.locator("h1")).toContainText("Reservas");

  // No viewport Desktop (1280px), a tabela está visível e os cards mobile estão hidden.
  // Esperamos pelo <td> (tabela) que contém o nome do cliente.
  await page.waitForSelector("td:has-text('E2E Cancelar')", { timeout: 10_000 });

  // Clica na lixeira da linha que contém "E2E Cancelar"
  const trashBtn = page
    .locator("tr")
    .filter({ hasText: "E2E Cancelar" })
    .locator("button")
    .first();
  await trashBtn.click();

  const alertDialog = page.locator('[role="alertdialog"]');
  await expect(alertDialog).toBeVisible();
  await expect(alertDialog.locator("text=Cancelar reserva?")).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/admin/reservations/${reservaId}`) && r.request().method() === "DELETE",
    ),
    alertDialog.locator('button:has-text("Confirmar")').click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 8_000 });
  const txt = await page.locator("[data-sonner-toast]").textContent();
  expect(txt).toContain("cancelada");
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. BLOQUEAR MESA
// ─────────────────────────────────────────────────────────────────────────────
test("10 · Bloquear mesa via modal de ações", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await waitForMesaGrid(page);

  const mesaDisp = page.locator('button:has-text("Mesa")').filter({ hasText: "Disponível" }).first();
  await expect(mesaDisp).toBeVisible({ timeout: 10_000 });
  await mesaDisp.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const bloquearBtn = dialog.locator('button:has-text("Bloquear mesa")');
  if (!(await bloquearBtn.isVisible())) {
    await page.keyboard.press("Escape");
    test.skip(true, "Nenhuma mesa disponível");
    return;
  }
  await bloquearBtn.click();

  const motivoInput = dialog.locator('input[placeholder*="Manutenção"]');
  await expect(motivoInput).toBeVisible();
  await motivoInput.fill("Teste E2E bloqueio");

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/bloquear") && r.request().method() === "POST"),
    dialog.locator('button:has-text("Confirmar bloqueio")').click(),
  ]);

  expect(response.status()).toBe(201);
  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 8_000 });
  expect(await page.locator("[data-sonner-toast]").textContent()).toContain("bloqueada");
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. DESBLOQUEAR MESA
// ─────────────────────────────────────────────────────────────────────────────
test("11 · Desbloquear mesa bloqueada", async ({ page }) => {
  attachListeners(page);

  // Bloqueia mesa 20 via API (token cacheado)
  await apiCall("/admin/tables/20/block", "POST", {
    bloqueadaPor: "E2E Test",
    motivo: "Teste desbloqueio E2E",
  });

  await injectAuth(page);
  await waitForMesaGrid(page);

  // Clica na mesa 20
  const mesa20 = page.locator('button').filter({ hasText: /^Mesa 20/ }).first();
  await expect(mesa20).toBeVisible({ timeout: 10_000 });
  await mesa20.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const desbloquearBtn = dialog.locator('button:has-text("Desbloquear mesa")');
  await expect(desbloquearBtn).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/bloquear") && r.request().method() === "DELETE",
    ),
    desbloquearBtn.click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. EDITAR HORÁRIOS DE FUNCIONAMENTO
// ─────────────────────────────────────────────────────────────────────────────
test("12 · Editar horário de funcionamento", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await page.goto(`${BASE_URL}/operating-hours`);

  await expect(page.locator("h1")).toContainText("Horários");
  await expect(page.locator("text=Almoço").first()).toBeVisible({ timeout: 10_000 });

  const editBtn = page.locator('button:has-text("Editar")').first();
  await editBtn.click();

  const timeInputs = page.locator('input[type="time"]');
  await expect(timeInputs.first()).toBeVisible({ timeout: 5_000 });

  // Valida que o input contém um valor de hora válido
  const val = await timeInputs.first().inputValue();
  expect(val).toMatch(/^\d{2}:\d{2}$/);

  // Cancela sem alterar dados
  const cancelBtn = page.locator('button:has-text("Cancelar")').first();
  if (await cancelBtn.isVisible()) await cancelBtn.click();
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. HORÁRIOS DE FUNCIONAMENTO — dias e turnos visíveis
// ─────────────────────────────────────────────────────────────────────────────
test("13 · Horários exibem todos os 7 dias e turnos Almoço/Jantar", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await page.goto(`${BASE_URL}/operating-hours`);

  await expect(page.locator("h1")).toContainText("Horários");
  await expect(page.locator("text=Almoço").first()).toBeVisible({ timeout: 10_000 });

  for (const dia of ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]) {
    await expect(page.locator(`text=${dia}`)).toBeVisible();
  }
  await expect(page.locator("text=Jantar").first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. TELA DE RESERVAS
// ─────────────────────────────────────────────────────────────────────────────
test("14 · Tela de reservas carrega corretamente", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await page.goto(`${BASE_URL}/reservations`);

  await expect(page.locator("h1")).toContainText("Reservas");

  // Aguarda loading terminar
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Carregando reservas") ||
      document.querySelector("table") !== null,
    { timeout: 15_000 },
  );

  const hasTable = await page.locator("table").isVisible().catch(() => false);
  const hasEmpty = await page.locator("text=Nenhuma reserva ativa").isVisible().catch(() => false);
  expect(hasTable || hasEmpty).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. TELA DE AGENDA
// ─────────────────────────────────────────────────────────────────────────────
test("15 · Tela de agenda carrega corretamente", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await page.goto(`${BASE_URL}/calendar`);

  await expect(page.locator("h1")).toContainText("Agenda");
  await expect(
    page.locator("div.font-display").filter({ hasText: /^\d{2}:00$/ }).first(),
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────────────────────
test("16 · Configurações carregam e botão salvar está presente", async ({ page }) => {
  attachListeners(page);
  await injectAuth(page);
  await page.goto(`${BASE_URL}/settings`);

  await expect(page.locator("h1")).toContainText("Configurações");

  // Aguarda inputs preenchidos pela API
  const firstInput = page.locator("input").first();
  await expect(firstInput).not.toHaveValue("", { timeout: 10_000 });
  expect(parseInt(await firstInput.inputValue())).toBeGreaterThan(0);

  await expect(page.locator('button:has-text("Salvar")').first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. RESPONSIVIDADE — Desktop 1280×800
// ─────────────────────────────────────────────────────────────────────────────
test("17 · Responsividade — Desktop 1280×800", async ({ page }) => {
  attachListeners(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await injectAuth(page);

  await expect(page.locator("h1")).toContainText("Salão hoje");
  await expect(page.locator("aside").first()).toBeVisible();

  await waitForMesaGrid(page);
  await expect(page.locator('button:has-text("Mesa")').first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. RESPONSIVIDADE — Tablet 768×1024
// ─────────────────────────────────────────────────────────────────────────────
test("18 · Responsividade — Tablet 768×1024", async ({ page }) => {
  attachListeners(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await injectAuth(page);

  await expect(page.locator("h1")).toContainText("Salão hoje");
  await waitForMesaGrid(page);
  await expect(page.locator('button:has-text("Mesa")').first()).toBeVisible();

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. RESPONSIVIDADE — Mobile 375×812
// ─────────────────────────────────────────────────────────────────────────────
test("19 · Responsividade — Mobile 375×812", async ({ page }) => {
  attachListeners(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await injectAuth(page);

  await expect(page.locator("h1")).toContainText("Salão hoje");
  await waitForMesaGrid(page);

  await page.click('button:has-text("Nova reserva")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Modal não deve ultrapassar a largura da viewport
  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeLessThanOrEqual(380); // margem de 5px

  await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO FINAL
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(() => {
  if (consoleErrors.length || pageErrors.length || failedRequests.length) {
    console.log("\n━━━━ ERROS CAPTURADOS ━━━━");
    consoleErrors.forEach((e) => console.log("[console.error]", e));
    pageErrors.forEach((e) => console.log("[pageerror]", e));
    failedRequests.forEach((e) => console.log("[req-failed]", e));
  } else {
    console.log("\n✓ Nenhum erro de console, page error ou request failure capturado.");
  }
});
