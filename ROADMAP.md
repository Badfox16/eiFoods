# eiFoods — Roadmap

Sistema de encomenda de refeições (almoços) para funcionários de escritório.
Monorepo com 3 pacotes: **server** (Bun + Express + Mongoose/MongoDB), **client**
(React 19 + Vite, público) e **admin** (React 19 + TS + Vite). `shared/` contém
tipos, constantes e validadores partilhados.

> Documento vivo. Marca `[x]` à medida que avançamos. Última revisão: 2026-08-16.

---

## Decisões de arquitetura (alinhadas com o cliente)

| Tema | Decisão |
|------|---------|
| **Identidade do cliente** | Conta leve por **telefone + OTP** (WhatsApp/SMS). Base para streaks e planos. |
| **Pagamento de planos** | **Manual** — cliente paga (M-Pesa/e-Mola/transferência) e envia comprovativo; **admin confirma** e ativa. Sem gateway na v1. |
| **Reestruturação visual** | **Design system primeiro** + aplicação no **client**; admin numa fase posterior. |
| **Foco atual** | **Clientes singulares.** Funcionalidades de **empresa ficam em standby** (código de empresa, menus por empresa, limites de uso diário) — mantêm-se no código mas não recebem investimento nesta fase. Streak, planos e menu do dia são desenhados à volta do cliente individual autenticado. |

---

## Diagnóstico do estado atual

**O que existe e serve de base:**
- Fluxo de pedido completo no client (Home → Empresa → Menu → Customize → OrderSummary → Delivery → Checkout → Confirmation).
- `Prato`, `Extra`, `Order`, `Empresa` (com código + limites de uso diário), `Sorteio`.
- Admin funcional para pratos, extras, encomendas, empresas, sorteio, settings.
- Total do pedido recalculado sempre no servidor (bom para segurança de preços).

**O que colide com os novos requisitos:**
- `PratoDoDia` (agenda semanal, 1 prato por dia da semana) + flag `Prato.disponivel`
  materializam o conceito de "pratos predeterminados por dia" que vamos **eliminar**.
- **Não há identidade de cliente** — pedidos são anónimos. Streaks e planos pré-pagos
  são impossíveis sem isto. É a fundação de tudo o resto.
- Sem conceito de **plano/subscrição**, **saldo de refeições**, **streak** ou **tier premium**.
- Preço do item não tem hooks de **desconto** (necessário para recompensas de streak).

---

## Fase 0 — Fundações (identidade + design tokens) ✅

Bloqueia quase tudo o resto. Fazer primeiro. **Concluída** (branch `feat/fase-0-1-clientes-singulares`).

- [x] **Modelo `Cliente`** (`server/models/Cliente.ts`): telefone (único), nome, empresaId opcional, `createdAt`.
- [x] **Auth por OTP**: `POST /api/auth/request-otp` (gera código, envia via WhatsApp/SMS — `lib/otp.ts` com provider mockável), `POST /api/auth/verify-otp` → emite sessão (JWT/cookie httpOnly). Rate-limit por telefone. Códigos em `OtpCode` com TTL index.
- [x] **Middleware de sessão** no server (`lib/auth.ts` → `requireAuth`) + `/api/auth/me` e `/logout`.
- [x] **Contexto de auth no client** (`AuthProvider`/`useAuth`) + ecrã de login/OTP (`pages/Auth`) + persistência de sessão.
- [x] **Design tokens** (`client/src/styles/tokens.css`): paleta, tipografia, espaçamento, raios, sombras, motion.
- [x] Retrofit do fluxo de pedido para reutilizar o perfil autenticado (pré-preencher `deliveryDetails`).
- [x] **Empresas em standby**: modelos/rotas mantidos; passo de código de empresa removido do fluxo principal do client (rota `/empresa` fora do menu).
- [ ] _Follow-up_: `gerarCodigo()` deve usar `crypto.randomInt` (atualmente `Math.random`); integrar provider real de WhatsApp/SMS em `enviarOtp` para auth funcionar em produção.

## Fase 1 — Menu por dia (substituir "prato do dia") ✅

**Concluída** (branch `feat/fase-0-1-clientes-singulares`).

- [x] **Modelo `Menu`** (`server/models/Menu.ts`): `data` (chave de dia, timezone Maputo), `itens: [{ pratoId, destaque, exclusivo }]`, `ativo`. Índice único por `data`.
- [x] Rotas `GET /api/menu/hoje`, `GET /api/menu?data=`, `GET /api/menu`, `PUT /api/menu/:data` (upsert).
- [x] **Migrar** `PratoDoDia` → `Menu` (`migrate-pratodia-to-menu.ts`, idempotente); `prato-do-dia` e flag `Prato.disponivel` deprecados (mantidos funcionais).
- [x] **Admin**: nova página **Menu do Dia** (`pages/MenuDia`) + rota + item na sidebar; `PratoDoDia` marcado como legado.
- [x] **Client `Menu`**: carrega de `menuApi.getHoje()`; item `destaque` assume o papel do antigo "prato do dia".

## Fase 2 — Planos pré-pagos ✅

**Concluída** (branch `feat/fase-2-planos`).

- [x] **Modelo `Plano`** (`server/models/Plano.ts`, config admin): tipo (`semanal`/`bissemanal`/`mensal`), `numRefeicoes`, `preco`, `validadeDias`, `ativo`.
- [x] **Modelo `Subscricao`** (`server/models/Subscricao.ts`): clienteId, planoId, snapshot do plano, `refeicoesRestantes`, `estado` (`pendente_pagamento` → `ativa` → `expirada`/`rejeitada`), `comprovativo` (Cloudinary), `dataInicio`/`dataExpiracao`.
- [x] **Fluxo de compra (client)** (`pages/Planos`): escolher plano → instruções de pagamento (M-Pesa/e-Mola) → upload de comprovativo (Cloudinary) → estado "aguarda confirmação"; secção "As minhas subscrições" + saldo ativo. Link "Planos" no Navbar.
- [x] **Admin** (`pages/Planos`): listar subscrições por estado, ver comprovativo, **confirmar/rejeitar** → ativa, credita refeições e define validade (`PATCH /subscricoes/:id/confirmar|rejeitar`).
- [x] **Consumo no pedido** (`lib/subscricao.ts` + `POST /orders`): subscrição ativa com saldo → cada **prato base** abate 1 refeição (extras e taxa fora-do-dia continuam cobrados); desconto de streak aplica-se ao valor ainda cobrado. Cobre primeiro os pratos mais caros. Saldo a 0 → `expirada`.
- [x] **Admin `Planos`**: CRUD de planos e preços (`/api/planos`, soft-delete via `ativo:false`).
- [ ] _Follow-up_: proteger rotas admin de planos/subscrições (`POST/PUT/DELETE /planos`, `PATCH /subscricoes/*`, `GET /subscricoes`) — mesma dívida transversal de auth do painel admin (ver Fase 4).

## Fase 3 — Menus / pratos exclusivos (tier premium)

- [ ] Flag `exclusivo` + `tierMinimo` no item de menu / prato.
- [ ] Regra de acesso: cliente vê/pede exclusivos apenas se tier premium (via plano premium) — **tudo configurável no admin**. (Tier via empresa fica em standby.)
- [ ] UI no client: secção "Exclusivos" com indicação de bloqueio/como desbloquear.
- [ ] Admin: gerir o que é exclusivo e a que tier pertence.

## Fase 4 — Sistema de streak (estilo Duolingo) ✅

**Concluída** (branch `feat/fase-4-streak`).

- [x] **Modelo de streak no `Cliente`**: `streakAtual`, `maiorStreak`, `ultimoDiaPedido`, `recompensasGanhas[]`.
- [x] **Lógica de incremento** (`lib/streak.ts`): +1 por dia útil com pedido; reset ao falhar; idempotente por dia. "Dia útil anterior" salta domingo (`getPreviousBusinessDayKey`, timezone Maputo). Testada.
- [x] **Escada de recompensas configurável no admin** (`StreakConfig` singleton, defaults 3/7/12/16/21/26/30/35).
- [x] **Aplicação da recompensa** server-side no total do pedido (`POST /orders`, auth opcional): desconto cumulativo (maior escalão `dias ≤ streak`); itens grátis concedidos uma vez no marco exato → `recompensasGanhas`.
- [x] **UI de streak (client)** (`pages/Streak`): dias acumulados (chama animada), desconto atual, próxima recompensa com barra de progresso, escada com estados, prémios ganhos. Link "Sequência 🔥" no Navbar (autenticados).
- [x] Admin (`pages/Streak`): editor da escada (`GET/PUT /streak/config`, reset) + tabela de clientes por sequência (`GET /streak/clientes`).
- [ ] _Follow-up_: proteger rotas admin (`PUT /streak/config`, `/streak/clientes`) — hoje o painel admin não tem auth (dívida transversal, não específica desta fase).

## Fase 5 — Reestruturação visual do client

- [ ] Aplicar design tokens da Fase 0 a todas as páginas do client.
- [ ] Rever hierarquia, motion e microinterações (menu, checkout, streak, planos).
- [ ] Componentização reutilizável (Button, Card, Badge, etc.) alinhada com o admin.
- [ ] Passagem de acessibilidade e responsividade (breakpoints já em `shared/constants.ts`).

## Fase 6 — Polimento & consolidação

- [ ] Redesign do admin com o mesmo design system.
- [ ] Atualizar Swagger para todas as rotas novas (auth, menu, planos, subscrições, streak).
- [ ] Seeds/fixtures atualizados (`server/seed.ts`).
- [ ] Testes dos cálculos críticos (total com desconto/streak, consumo de plano).

---

## Ordem de execução recomendada

`Fase 0` (identidade + tokens) → `Fase 1` (menu por dia) → `Fase 4` (streak, alto valor
percebido) → `Fase 2` (planos) → `Fase 3` (exclusivos) → `Fase 5` (redesign client) → `Fase 6`.

> Nota: Fases 2/3/4 dependem todas da identidade (Fase 0). Fase 1 é independente e pode
> arrancar em paralelo com a Fase 0 se necessário.
