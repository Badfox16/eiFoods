/**
 * Script de seed para popular a base de dados com dados iniciais de teste.
 * Uso: bun run seed.ts
 *
 * Cobre: extras, pratos, agenda legada (PratoDoDia), menu do dia (Fase 1),
 * planos pré-pagos (Fase 2/3), configuração de streak (Fase 4) e uma conta de
 * administrador inicial (Fase 6). O admin é lido de ADMIN_USERNAME/ADMIN_PASSWORD
 * (com defaults de desenvolvimento) e criado apenas se ainda não existir — um
 * re-seed não repõe a password de um admin já configurado.
 */
import mongoose from 'mongoose'
import 'dotenv/config'
import Extra from './models/Extra'
import Prato from './models/Prato'
import PratoDoDia from './models/PratoDoDia'
import Menu, { getCurrentMenuDateKey } from './models/Menu'
import Plano, { type DuracaoPlano, type TipoPlano } from './models/Plano'
import PlanoMenu from './models/PlanoMenu'
import StreakConfig, { DEFAULT_STREAK_TIERS } from './models/StreakConfig'
import AdminUser from './models/AdminUser'
import { hashPassword } from './lib/adminAuth'

/**
 * Fotos reais (Pexels, licença gratuita — https://www.pexels.com/license/,
 * uso comercial sem atribuição obrigatória) em vez do placeholder cinzento.
 * Cada uma foi conferida visualmente antes de entrar aqui (ver histórico da
 * sessão). `publicId` não é um asset do Cloudinary — é só um identificador
 * informativo; `cloudinary.uploader.destroy()` com um id inexistente devolve
 * "not found" em vez de rebentar, por isso o fluxo de substituir/apagar
 * imagem no admin continua a funcionar normalmente mesmo para estas fotos.
 */
function img(pexelsId: number): { url: string; publicId: string } {
  return {
    url: `https://images.pexels.com/photos/${pexelsId}/pexels-photo-${pexelsId}.jpeg?auto=compress&cs=tinysrgb&w=800`,
    publicId: `pexels-${pexelsId}`,
  }
}

async function seedAdmin() {
  const username = (process.env['ADMIN_USERNAME'] ?? 'admin').trim().toLowerCase()
  const password = process.env['ADMIN_PASSWORD'] ?? 'admin123'

  const existente = await AdminUser.findOne({ username })
  if (existente) {
    console.log(`[Seed] Admin "${username}" já existe — password preservada`)
    return
  }

  await AdminUser.create({
    username,
    passwordHash: await hashPassword(password),
    nome: 'Administrador',
  })
  console.log(`[Seed] Admin criado → utilizador: "${username}" · password: "${password}"`)
  if (!process.env['ADMIN_PASSWORD']) {
    console.warn('[Seed] ⚠ A usar password de desenvolvimento. Define ADMIN_PASSWORD no .env para produção.')
  }
}

async function seed() {
  const uri = process.env['MONGO_URI']
  if (!uri) throw new Error('MONGO_URI não definida no .env')

  await mongoose.connect(uri, { dbName: process.env['MONGO_DB_NAME'] ?? 'marmita_db' })
  console.log('[Seed] Conectado ao MongoDB')

  // Limpar coleções de conteúdo (NÃO apaga AdminUser nem clientes/subscrições).
  await Promise.all([
    Extra.deleteMany({}),
    Prato.deleteMany({}),
    PratoDoDia.deleteMany({}),
    Menu.deleteMany({}),
    Plano.deleteMany({}),
    PlanoMenu.deleteMany({}),
  ])
  console.log('[Seed] Coleções de conteúdo limpas')

  // ── Extras ──────────────────────────────────────────────────────────────────
  const extras = await Extra.insertMany([
    { nome: 'Frango extra',  preco: 50, global: true },
    { nome: 'Salada',        preco: 25, global: true },
    { nome: 'Refrigerante',  preco: 40, global: true },
    { nome: 'Arroz extra',   preco: 20, global: true },
    { nome: 'Camarão',       preco: 80, global: false }, // exclusivo — será atribuído manualmente
  ])
  console.log(`[Seed] ${extras.length} extras criados`)

  const camarao = extras.find(e => e.nome === 'Camarão')!

  // ── Pratos ──────────────────────────────────────────────────────────────────
  const pratos = await Prato.insertMany([
    {
      nome: 'Arroz + Frango Assado + Batata',
      descricao: 'Frango assado no forno acompanhado de arroz branco e batata frita',
      preco: 250,
      imagem: img(616354),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Arroz + Frango Grelhado + Salada',
      descricao: 'Frango grelhado temperado com limão e ervas, arroz e salada fresca',
      preco: 280,
      imagem: img(2097090),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Massa + Frango + Legumes',
      descricao: 'Massa esparguete com frango desfiado e legumes salteados',
      preco: 300,
      imagem: img(6287527),
      disponivel: false,
      extrasProprios: [],
    },
    {
      nome: 'Arroz de Marisco',
      descricao: 'Arroz cremoso com camarão, amêijoa e berbigão',
      preco: 450,
      imagem: img(725997),
      disponivel: true,
      extrasProprios: [camarao._id],  // camarão extra disponível apenas neste prato
    },
    {
      nome: 'Xima + Frango + Molho de Amendoim',
      descricao: 'Xima tradicional com frango estufado e molho de amendoim caseiro',
      preco: 220,
      imagem: img(2673353),
      disponivel: false,
      extrasProprios: [],
    },
    {
      nome: 'Matapa com Caril',
      descricao: 'Matapa de folhas de mandioca com caril de coco e camarão',
      preco: 350,
      imagem: img(406152),
      disponivel: true,
      extrasProprios: [camarao._id],
    },
  ])
  console.log(`[Seed] ${pratos.length} pratos criados`)

  // ── Pratos dos planos Premium Nutrição (Fase 7) ──────────────────────────────
  // Cardápios próprios, separados do menu normal — mesmo preço dentro da
  // categoria (decisão de produto), pratos pensados para o objetivo.
  const pratosFitStarter = await Prato.insertMany([
    {
      nome: 'Frango Grelhado + Salada + Quinoa',
      descricao: 'Peito de frango grelhado, salada fresca e quinoa — baixo teor de gordura',
      preco: 280,
      imagem: img(1640777),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Peixe Grelhado + Legumes no Vapor',
      descricao: 'Filete de peixe grelhado com brócolos, cenoura e courgette no vapor',
      preco: 280,
      imagem: img(3763847),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Salada de Frango com Grão-de-Bico',
      descricao: 'Frango desfiado, grão-de-bico, alface, tomate e azeite — sem fritos',
      preco: 280,
      imagem: img(2097090),
      disponivel: true,
      extrasProprios: [],
    },
  ])
  console.log(`[Seed] ${pratosFitStarter.length} pratos (Fit Starter) criados`)

  const pratosMuscle = await Prato.insertMany([
    {
      nome: 'Arroz + Frango + Batata-Doce + Ovo',
      descricao: 'Dose reforçada de frango grelhado, arroz, batata-doce e ovo — alto teor proteico',
      preco: 280,
      imagem: img(8992926),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Bife de Vaca + Arroz + Feijão',
      descricao: 'Bife de vaca grelhado, arroz e feijão — proteína e carboidratos complexos',
      preco: 280,
      imagem: img(299347),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Massa Integral + Frango + Amendoim',
      descricao: 'Massa integral, frango grelhado e molho de amendoim — calórico, rico em proteína',
      preco: 280,
      imagem: img(2456435),
      disponivel: true,
      extrasProprios: [],
    },
  ])
  console.log(`[Seed] ${pratosMuscle.length} pratos (Muscle) criados`)

  const pratosEquilibrio = await Prato.insertMany([
    {
      nome: 'Arroz + Frango Estufado + Legumes',
      descricao: 'Frango estufado, arroz e legumes salteados — calorias e macros moderados',
      preco: 280,
      imagem: img(2673353),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Massa com Atum e Salada',
      descricao: 'Massa com atum, tomate e azeite, acompanhada de salada fresca — equilibrado e leve',
      preco: 280,
      imagem: img(1437267),
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Xima + Frango Grelhado + Folhas',
      descricao: 'Xima tradicional, frango grelhado e folhas salteadas — porção equilibrada do dia a dia',
      preco: 280,
      imagem: img(616354),
      disponivel: true,
      extrasProprios: [],
    },
  ])
  console.log(`[Seed] ${pratosEquilibrio.length} pratos (Equilíbrio) criados`)

  await PlanoMenu.insertMany([
    { categoria: 'premium_fit_starter', itens: pratosFitStarter.map((p) => ({ pratoId: p._id })), ativo: true },
    { categoria: 'premium_muscle', itens: pratosMuscle.map((p) => ({ pratoId: p._id })), ativo: true },
    { categoria: 'premium_equilibrio', itens: pratosEquilibrio.map((p) => ({ pratoId: p._id })), ativo: true },
  ])
  console.log('[Seed] Cardápios dos planos premium (Fit Starter/Muscle/Equilíbrio) criados')

  // ── Prato do Dia — agendamento semanal (legado, mantido para compat.) ────────
  const disponivel = pratos.filter(p => p.disponivel)
  await PratoDoDia.create({
    semana: [
      { diaSemana: 'segunda', prato: disponivel[0]?._id ?? null },
      { diaSemana: 'terca',   prato: disponivel[1]?._id ?? null },
      { diaSemana: 'quarta',  prato: disponivel[2]?._id ?? null },
      { diaSemana: 'quinta',  prato: disponivel[3]?._id ?? null },
      { diaSemana: 'sexta',   prato: disponivel[0]?._id ?? null },
      { diaSemana: 'sabado',  prato: disponivel[1]?._id ?? null },
    ],
  })
  console.log('[Seed] Agendamento semanal (legado) criado')

  // ── Menu do dia (Fase 1) — menu de hoje com destaque + exclusivo ─────────────
  const hoje = getCurrentMenuDateKey()
  await Menu.create({
    data: hoje,
    ativo: true,
    itens: [
      { pratoId: pratos[0]!._id, destaque: true,  exclusivo: false },
      { pratoId: pratos[1]!._id, destaque: false, exclusivo: false },
      { pratoId: pratos[5]!._id, destaque: false, exclusivo: false },
      { pratoId: pratos[3]!._id, destaque: false, exclusivo: true },  // Arroz de Marisco — premium
    ],
  })
  console.log(`[Seed] Menu do dia (${hoje}) criado`)

  // ── Planos pré-pagos (Fase 2/3; categorias/duração — Fase 7) ─────────────────
  // Estrutura confirmada pelo esboço do cliente: a duração (Starter/Plus/
  // Mensal) só se ramifica dentro do Clássico. Os planos premium (Fit
  // Starter/Muscle/Equilíbrio) são planos ÚNICOS, sem variante de duração —
  // 6 planos no total (ver ROADMAP Fase 7 para o histórico desta correção).
  //
  // Preços: o Clássico Starter (195 MZN/5 refeições) foi o único confirmado
  // pelo cliente; os restantes eram "a definir" (`preco: null`) até serem
  // adotados aqui como preços reais (ideia da equipa, aprovada para
  // substituir o mockup "Sugestão" da UI — deixam de estar bloqueados):
  //  - Clássico Plus (15 ref.): 15×39 MZN/refeição com ~4% de desconto por
  //    volume → 560 MZN
  //  - Clássico Mensal (20 ref.): 20×39 MZN/refeição com ~8% de desconto →
  //    720 MZN
  //  - Premium (Fit Starter/Muscle/Equilíbrio, 5 ref. cada): +28% sobre o
  //    Starter clássico pelo cardápio dedicado → 250 MZN, igual nos três
  //    ("mesmo preço" entre planos premium, pedido original)
  // TODO(produto): confirmar se estes valores são o preço TOTAL do pacote
  // (assumido aqui, `precoUnidade: 'total'`) ou o preço POR REFEIÇÃO — ver
  // ROADMAP Fase 7.
  const DURACAO_INFO: Record<DuracaoPlano, { label: string; dias: number; numRefeicoes: number; preco: number | null }> = {
    starter: { label: 'Starter', dias: 5, numRefeicoes: 5, preco: 195 },
    plus: { label: 'Plus', dias: 15, numRefeicoes: 15, preco: 560 },
    mensal: { label: 'Mensal', dias: 20, numRefeicoes: 20, preco: 720 },
  }
  const PRECO_PREMIUM = 250

  const planosClassico = (['starter', 'plus', 'mensal'] as DuracaoPlano[]).map((duracao) => {
    const info = DURACAO_INFO[duracao]
    return {
      nome: `Clássico — ${info.label}`,
      categoria: 'classico' as TipoPlano,
      duracao,
      numRefeicoes: info.numRefeicoes,
      preco: info.preco,
      precoUnidade: 'total' as const,
      validadeDias: info.dias,
      premium: false,
      descricao: 'Mesmos pratos e preços do menu normal do dia.',
      ativo: true,
    }
  })

  // Premium (Fit Starter/Muscle/Equilíbrio): plano único por categoria, sem
  // escolha de duração na UI. `duracao: 'starter'` é um valor técnico (o
  // schema exige o campo) — não é mostrado ao cliente; ver Planos.jsx
  // (client), que só renderiza a tabela de durações para `categoria === 'classico'`.
  const planosPremium: (typeof planosClassico)[number][] = [
    {
      nome: 'Premium Fit Starter',
      categoria: 'premium_fit_starter',
      duracao: 'starter',
      numRefeicoes: DURACAO_INFO.starter.numRefeicoes,
      preco: PRECO_PREMIUM,
      precoUnidade: 'total',
      validadeDias: DURACAO_INFO.starter.dias,
      premium: true,
      descricao: 'Perda de peso: menos calorias, mais vegetais, proteína magra, menos fritos.',
      ativo: true,
    },
    {
      nome: 'Premium Muscle',
      categoria: 'premium_muscle',
      duracao: 'starter',
      numRefeicoes: DURACAO_INFO.starter.numRefeicoes,
      preco: PRECO_PREMIUM,
      precoUnidade: 'total',
      validadeDias: DURACAO_INFO.starter.dias,
      premium: true,
      descricao: 'Ganho de massa: maior teor proteico, mais calorias, mais carboidratos complexos.',
      ativo: true,
    },
    {
      nome: 'Premium Equilíbrio',
      categoria: 'premium_equilibrio',
      duracao: 'starter',
      numRefeicoes: DURACAO_INFO.starter.numRefeicoes,
      preco: PRECO_PREMIUM,
      precoUnidade: 'total',
      validadeDias: DURACAO_INFO.starter.dias,
      premium: true,
      descricao: 'Manutenção: calorias e macros moderados, pratos variados para o dia a dia.',
      ativo: true,
    },
  ]

  const planos = await Plano.insertMany([...planosClassico, ...planosPremium])
  console.log(`[Seed] ${planos.length} planos criados (3 Clássico + Fit Starter + Muscle + Equilíbrio)`)

  // ── Configuração de streak (Fase 4) — garante o singleton com defaults ───────
  await StreakConfig.findOneAndUpdate(
    {},
    { $setOnInsert: { tiers: DEFAULT_STREAK_TIERS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  console.log('[Seed] Configuração de streak garantida')

  // ── Admin inicial (Fase 6) ───────────────────────────────────────────────────
  await seedAdmin()

  console.log('[Seed] ✓ Feito!')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('[Seed Error]', err)
  process.exit(1)
})
