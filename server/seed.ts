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
import Plano from './models/Plano'
import StreakConfig, { DEFAULT_STREAK_TIERS } from './models/StreakConfig'
import AdminUser from './models/AdminUser'
import { hashPassword } from './lib/adminAuth'

const PLACEHOLDER_IMAGE = {
  url: 'https://placehold.co/400x300?text=Prato',
  publicId: 'placeholder',
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
      imagem: PLACEHOLDER_IMAGE,
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Arroz + Frango Grelhado + Salada',
      descricao: 'Frango grelhado temperado com limão e ervas, arroz e salada fresca',
      preco: 280,
      imagem: PLACEHOLDER_IMAGE,
      disponivel: true,
      extrasProprios: [],
    },
    {
      nome: 'Massa + Frango + Legumes',
      descricao: 'Massa esparguete com frango desfiado e legumes salteados',
      preco: 300,
      imagem: PLACEHOLDER_IMAGE,
      disponivel: false,
      extrasProprios: [],
    },
    {
      nome: 'Arroz de Marisco',
      descricao: 'Arroz cremoso com camarão, amêijoa e berbigão',
      preco: 450,
      imagem: PLACEHOLDER_IMAGE,
      disponivel: true,
      extrasProprios: [camarao._id],  // camarão extra disponível apenas neste prato
    },
    {
      nome: 'Xima + Frango + Molho de Amendoim',
      descricao: 'Xima tradicional com frango estufado e molho de amendoim caseiro',
      preco: 220,
      imagem: PLACEHOLDER_IMAGE,
      disponivel: false,
      extrasProprios: [],
    },
    {
      nome: 'Matapa com Caril',
      descricao: 'Matapa de folhas de mandioca com caril de coco e camarão',
      preco: 350,
      imagem: PLACEHOLDER_IMAGE,
      disponivel: true,
      extrasProprios: [camarao._id],
    },
  ])
  console.log(`[Seed] ${pratos.length} pratos criados`)

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

  // ── Planos pré-pagos (Fase 2/3) ──────────────────────────────────────────────
  const planos = await Plano.insertMany([
    {
      nome: 'Plano Semanal',
      tipo: 'semanal',
      numRefeicoes: 5,
      preco: 1100,
      validadeDias: 7,
      premium: false,
      descricao: '5 refeições para a semana de trabalho',
      ativo: true,
    },
    {
      nome: 'Plano Bissemanal',
      tipo: 'bissemanal',
      numRefeicoes: 10,
      preco: 2100,
      validadeDias: 15,
      premium: false,
      descricao: '10 refeições, duas semanas',
      ativo: true,
    },
    {
      nome: 'Plano Mensal Premium',
      tipo: 'mensal',
      numRefeicoes: 22,
      preco: 4500,
      validadeDias: 30,
      premium: true,
      descricao: '22 refeições + acesso a pratos exclusivos',
      ativo: true,
    },
  ])
  console.log(`[Seed] ${planos.length} planos criados`)

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
