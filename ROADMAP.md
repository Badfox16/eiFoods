# eiFoods — Roadmap

Sistema de encomenda de refeições (almoços) para funcionários de escritório.
Monorepo com 3 pacotes: **server** (Bun + Express + Mongoose/MongoDB), **client**
(React 19 + Vite, público) e **admin** (React 19 + TS + Vite). `shared/` contém
tipos, constantes e validadores partilhados.

> Documento vivo. Marca `[x]` à medida que avançamos. Última revisão: 2026-08-16 (Fase 6: auth do admin, testes, seeds e **redesign do admin** feitos; follow-ups resolvidos. Falta só o Swagger).

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
- [x] _Follow-up_: `gerarCodigo()` (OTP) e os códigos de empresa passaram a usar `crypto.randomInt` (CSPRNG).
- [ ] _Follow-up_: integrar provider real de WhatsApp/SMS em `enviarOtp` para auth funcionar em produção.

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
- [x] _Follow-up_: rotas admin de planos/subscrições protegidas com `requireAdmin` (Fase 6).

## Fase 3 — Menus / pratos exclusivos (tier premium) ✅

**Concluída** (branch `feat/fase-3-exclusivos`). Tier binário: um `Plano` com
`premium:true` concede o tier enquanto a subscrição estiver **ativa**; itens de
menu com `exclusivo:true` (já existente na Fase 1) exigem esse tier.

- [x] Flag `exclusivo` no item de menu (Fase 1) + flag `premium` no `Plano`/snapshot na `Subscricao` como fonte do tier. (Tier binário premium/standard — não precisou de `tierMinimo` numérico.)
- [x] Regra de acesso: helper `isClientePremium` (`lib/subscricao.ts`, subscrição premium ativa dentro da validade); `POST /orders` rejeita (403) quem não é premium ao encomendar exclusivos; `/api/auth/me` devolve `premium`. **Configurável no admin.** (Tier via empresa fica em standby.)
- [x] UI no client: secção **"Exclusivos"** no menu com cartões bloqueados (cadeado + CTA "Desbloquear" → `/planos`) para não-premium; badge premium na página de Planos.
- [x] Admin: toggle **Exclusivo (premium)** no Menu do Dia + checkbox **Premium** no editor de planos e badge na lista.
- [ ] _Follow-up_: o tier premium está ligado a ter refeições no saldo (esgotar o saldo passa a subscrição a `expirada` e retira o tier); avaliar desacoplar tier da validade vs. saldo se for requisito de produto.

## Fase 4 — Sistema de streak (estilo Duolingo) ✅

**Concluída** (branch `feat/fase-4-streak`).

- [x] **Modelo de streak no `Cliente`**: `streakAtual`, `maiorStreak`, `ultimoDiaPedido`, `recompensasGanhas[]`.
- [x] **Lógica de incremento** (`lib/streak.ts`): +1 por dia útil com pedido; reset ao falhar; idempotente por dia. "Dia útil anterior" salta domingo (`getPreviousBusinessDayKey`, timezone Maputo). Testada.
- [x] **Escada de recompensas configurável no admin** (`StreakConfig` singleton, defaults 3/7/12/16/21/26/30/35).
- [x] **Aplicação da recompensa** server-side no total do pedido (`POST /orders`, auth opcional): desconto cumulativo (maior escalão `dias ≤ streak`); itens grátis concedidos uma vez no marco exato → `recompensasGanhas`.
- [x] **UI de streak (client)** (`pages/Streak`): dias acumulados (chama animada), desconto atual, próxima recompensa com barra de progresso, escada com estados, prémios ganhos. Link "Sequência 🔥" no Navbar (autenticados).
- [x] Admin (`pages/Streak`): editor da escada (`GET/PUT /streak/config`, reset) + tabela de clientes por sequência (`GET /streak/clientes`).
- [x] _Follow-up_: rotas admin de streak (`PUT /streak/config`, `POST /streak/config/reset`, `GET /streak/clientes`) protegidas com `requireAdmin` (Fase 6).

## Fase 5 — Reestruturação visual do client ✅

**Concluída** (branch `feat/fase-5-redesign-client`). Direção de arte
**"Quadro & Papel"**: o ecrã lê-se como o quadro de giz de uma tasca e o pedido
como um talão. Paleta ancorada na mesa moçambicana (panela/xima/piri-piri/
matapa/açafrão); tipografia Fraunces (display) + Hanken Grotesk (texto) +
Spline Sans Mono (preços/talão). Sem gradientes decorativos, glass, blobs,
emoji-ícone nem pill por defeito — regras registadas em memória do projeto.

- [x] Novos tokens (`styles/tokens.css`): paleta, tipografia e raios contidos; aliases retro-compatíveis para migração automática.
- [x] Biblioteca de componentes reutilizável (`components/ui/`): Button, Card, Badge, Input, Spinner + **MenuLine** (assinatura: linha de quadro/talão) e **Stamp** (cartão de selos).
- [x] Casca global refeita (Navbar barra-quadro, Footer com banda capulana) + Auth.
- [x] Páginas de valor: Home (o quadro de hoje), Sequência (cartão de selos), Planos (tabela).
- [x] Fluxo de pedido em linguagem de talão: Menu, Customize, OrderSummary, Delivery, Checkout, Confirmation (talão carimbado). Sorteio/Empresa em token-sweep.
- [x] Acessibilidade (foco visível, reduced-motion, aria) e responsividade mobile-first.
- [x] _Follow-up_: resolvido o aviso de lint do `ToastContext.jsx` — contexto/hook extraídos para `context/toast.js` (Fase 6).

## Fase 6 — Polimento & consolidação

- [x] **Auth do painel admin** (dívida transversal das Fases 2/3/4). Modelo
  `AdminUser` (username + hash bcrypt via `Bun.password`), `lib/adminAuth.ts`
  (`requireAdmin`, cookie httpOnly `eifoods_admin`, JWT dedicado com fallback ao
  `JWT_SECRET`), rotas `POST /api/admin/login|logout` + `GET /api/admin/me`.
  Todas as rotas de escrita/gestão passaram a exigir `requireAdmin` (pratos,
  extras, menu, orders, empresas, sorteio, streak, planos, subscrições),
  mantendo públicas as leituras client-facing e o `POST /orders`. Admin frontend:
  ecrã de **Login**, `AdminAuthProvider` + guarda de rota, `credentials:'include'`
  e handler global de 401, botão de logout na Sidebar.
- [x] Seeds/fixtures atualizados (`server/seed.ts`): Menu do dia, Planos (incl.
  premium), `StreakConfig` e **admin inicial** (de `ADMIN_USERNAME`/`ADMIN_PASSWORD`,
  criado só se não existir). Novas chaves em `.env.example`.
- [x] Testes dos cálculos críticos (`bun test`): `lib/pedidoTotais.test.ts`
  (total com consumo de plano + desconto de streak, cobre pratos mais caros,
  extras não abatidos, total nunca negativo) e `lib/streak.test.ts`
  (desconto por escalão, próximo tier, transições de streak). Cálculo do total
  extraído para `lib/pedidoTotais.ts` (função pura) e reutilizado em `orders.ts`.
- [x] **Redesign do admin** com o design system "Quadro & Papel". Tokens
  portados para `admin/src/index.css` (Fraunces/Hanken/Spline, paleta panela/
  xima/brasa/folha/matapa, filetes em vez de sombras suaves, raios contidos),
  mantendo os nomes dos tokens semânticos para cascata automática. Casca refeita
  (Sidebar = quadro escuro com destaque brasa, Header com filete), componentes
  partilhados (Button retangular/brasa, Card/StatCard com filete, Badge tingido)
  e sweep das 10 páginas (remoção de cores Tailwind genéricas e gradientes).
  Verificado no browser (login + dashboard + pedidos).
- [x] Corrigidos os 2 avisos de lint pré-existentes do admin (`AdminContext`
  → `useAdmin` em módulo próprio; `Dishes` preview via `useMemo` sem setState
  em effect). Admin com typecheck + lint + build limpos.
- [ ] Atualizar Swagger para todas as rotas novas (auth, admin, menu, planos, subscrições, streak).

## Fase 7 — Planos Premium Nutrição (subscrição)

Ajuste pedido pelo cliente à secção Planos existente (Fase 2/3). Estrutura
final **6 planos** (confirmada pelo esboço do cliente, que só ramifica a
duração dentro do Clássico — a primeira versão desta fase tinha assumido
duração × categoria em todas as categorias, 9 planos; corrigido):
  - **Clássico**: 3 planos — Starter (semanal/5/195 MZN), Plus (quinzenal/15/
    560 MZN), Mensal (20/720 MZN).
  - **Premium Fit Starter**, **Premium Muscle** e **Premium Equilíbrio**: 1
    plano cada, sem variante de duração, 250 MZN — igual nos três ("mesmo
    preço" no pedido original).

`Plano.tipo` foi renomeado para `duracao` para não colidir com o novo
`categoria` (tipo de dieta).

- [x] **Modelo `Plano`**: `categoria` (`classico` | `premium_fit_starter` |
  `premium_muscle` | `premium_equilibrio`) + `duracao` (`starter`=semanal/5 |
  `plus`=quinzenal/15 | `mensal`=20) — só exposta na UI para `classico`; nos
  planos premium é um valor técnico fixo (`starter`), não escolhido pelo
  cliente. `precoUnidade` (`total` | `por_refeicao`) documenta a leitura do
  preço (default `total`).
  - **TODO(produto)**: os valores acima são o preço **total** do pacote ou
    **por refeição**? Assumido `total`; `precoUnidade` deixa a leitura
    explícita até o cliente confirmar — ver `Plano.ts`, `constants.ts`.
  - **Resolvido**: os preços de Plus/Mensal/Fit Starter/Muscle começaram como
    mockup ("Sugestão", botão desativado) e foram adotados como preços reais
    a pedido do cliente — já não há `preco: null` em nenhum plano ativo.
- [x] **Objetivo → subplano**: pergunta "Qual é o seu objetivo?" no fluxo
  Premium Nutrição (Perder peso/Manter peso/Ganhar massa/Alimentação
  equilibrada) encaminha via `OBJETIVO_PARA_CATEGORIA` (`shared/constants.ts`).
  Os 4 objetivos mapeiam sempre para um subplano premium — "Manter peso" e
  "Alimentação equilibrada" partilham `premium_equilibrio` (mesmo perfil
  nutricional: calorias/macros moderados). Já não há fallback para o
  Clássico nesta pergunta.
- [x] **Modelo `PlanoMenu`**: cardápio de pratos por categoria premium (Fit
  Starter/Muscle/Equilíbrio), separado do menu normal do dia. `classico`
  reutiliza o `Menu` normal. Rotas `GET/PUT /api/planos-menu/:categoria`.
- [x] **Integração com o pedido**: `Cliente` autenticado com subscrição ativa
  de categoria premium vê, no ecrã de Menu, só o `PlanoMenu` dessa categoria
  (`/api/auth/me` devolve `categoriaAtiva`); `POST /orders` reforça no
  servidor que só pode encomendar pratos desse cardápio (mesmo padrão do
  `allowedPratosSet` de empresa).
- [x] **Client `Planos.jsx`**: assistente tipo → objetivo (se Premium) →
  duração → pagamento (reaproveita o fluxo de comprovativo já existente).
  Redesenho visual "Marmita Viva" (ver secção de design abaixo).
- [x] **Admin**: página **Planos** com abas — Visão geral, Planos (CRUD
  agrupado por categoria), Subscrições, Menus (gestão de cardápio por
  categoria, incl. Clássico via menu do dia).
- [x] **Seed** (`seed.ts`): 6 planos (3 Clássico + Fit Starter + Muscle +
  Equilíbrio) + cardápios de exemplo (9 pratos novos) + preços reais.
- [x] **Migração** (`migrate-plano-restructure.ts`, idempotente): backfill de
  `categoria`/`duracao`/`precoUnidade` em `Plano`/`Subscricao` já existentes
  a partir do antigo `tipo`. Planos antigos com `premium:true` ficam em
  `categoria:'classico'` (não há forma segura de inferir Fit Starter vs.
  Muscle) — o admin pode reclassificar manualmente se necessário.

---

## Ordem de execução recomendada

`Fase 0` (identidade + tokens) → `Fase 1` (menu por dia) → `Fase 4` (streak, alto valor
percebido) → `Fase 2` (planos) → `Fase 3` (exclusivos) → `Fase 5` (redesign client) → `Fase 6`.

> Nota: Fases 2/3/4 dependem todas da identidade (Fase 0). Fase 1 é independente e pode
> arrancar em paralelo com a Fase 0 se necessário.
