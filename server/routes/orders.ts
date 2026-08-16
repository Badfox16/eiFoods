import { Router } from 'express'
import Order, { type OrderStatus } from '../models/Order'
import Prato from '../models/Prato'
import Extra from '../models/Extra'
import Empresa, { getCurrentDateKey } from '../models/Empresa'
import Cliente from '../models/Cliente'
import Menu, { getCurrentMenuDateKey } from '../models/Menu'
import PratoDoDia, { type DiaSemana } from '../models/PratoDoDia'
import { getMaputoWeekdayNumber } from '../lib/businessTime'
import { lerSessao } from '../lib/auth'
import { registrarPedidoStreak } from '../lib/streak'
import { getSubscricaoAtiva, consumirRefeicoes, isClientePremium } from '../lib/subscricao'

const router = Router()

const VALID_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled']
const FORA_DO_DIA_TAXA = 50

const DAY_MAP: Record<number, DiaSemana> = {
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
}

async function getTodayPratoId(): Promise<string | null> {
  const dayOfWeek = getMaputoWeekdayNumber()
  const diaSemana = DAY_MAP[dayOfWeek]
  if (!diaSemana) return null

  const schedule = await PratoDoDia.findOne().populate('semana.prato')
  const entrada = schedule?.semana.find((d) => d.diaSemana === diaSemana)
  const prato = entrada?.prato as { _id?: string } | null
  return prato?._id ? String(prato._id) : null
}

/**
 * IDs dos pratos marcados como `exclusivo` no menu de hoje (Fase 3).
 * Só clientes com tier premium podem encomendar estes pratos.
 */
async function getExclusivosHojeSet(): Promise<Set<string>> {
  const menu = await Menu.findOne({ data: getCurrentMenuDateKey() })
  const ids = (menu?.itens ?? []).filter((i) => i.exclusivo).map((i) => String(i.pratoId))
  return new Set(ids)
}

// ── POST /api/orders ─────────────────────────────────────────────────────────
// Body: { items: [{ pratoId, customizations, extraIds: string[] }], deliveryDetails }
// O total é sempre recalculado no servidor
router.post('/', async (req, res, next) => {
  try {
    const { items, deliveryDetails, empresaCodigo } = req.body as {
      items: Array<{
        pratoId: string
        customizations: { free: string[]; salt: string }
        extraIds: string[]
      }>
      deliveryDetails: {
        name: string
        company?: string
        location: string
        contact: string
      }
      empresaCodigo?: string
    }

    // ── Validação básica dos dados de entrega ──
    if (!deliveryDetails?.name?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }
    if (!deliveryDetails?.location?.trim()) {
      return res.status(400).json({ error: 'Localização é obrigatória' })
    }
    if (!deliveryDetails?.contact?.trim()) {
      return res.status(400).json({ error: 'Contacto é obrigatório' })
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'O pedido deve ter pelo menos um item' })
    }

    let empresaId: string | undefined
    let empresaCodigoResolved: string | undefined
    let codigoParaConsumir: { empresaId: string; codigo: string } | undefined
    let allowedPratosSet: Set<string> | null = null

    if (empresaCodigo?.trim()) {
      const code = empresaCodigo.trim().toUpperCase()
      const empresa = await Empresa.findOne({ ativo: true, codigo: code })
      if (!empresa) return res.status(404).json({ error: 'Código de empresa inválido' })

      if (!empresa.codigoAtivo) {
        return res.status(403).json({ error: 'Código da empresa inativo' })
      }

      const today = getCurrentDateKey()
      if (empresa.ultimoResetDia !== today) {
        empresa.usosDiaAtual = 0
        empresa.ultimoResetDia = today
      }

      if (empresa.usosDiaAtual >= empresa.maxUsosDia) {
        return res.status(403).json({ error: 'Código da empresa sem usos disponíveis hoje' })
      }

      const menuAtivo = empresa.menus.find((m) => m.ativo) ?? empresa.menus[0]
      if (!menuAtivo) {
        return res.status(400).json({ error: 'Empresa sem menu ativo' })
      }

      allowedPratosSet = new Set(menuAtivo.pratoIds.map((id) => String(id)))
      empresaId = String(empresa._id)
      empresaCodigoResolved = code
      codigoParaConsumir = { empresaId, codigo: code }

      if (allowedPratosSet.size === 0) {
        return res.status(400).json({ error: 'Menu da empresa sem pratos disponíveis' })
      }
    }

    const todayPratoId = await getTodayPratoId()
    let foraDoDiaCount = 0

    // ── Tier premium (Fase 3): acesso a pratos exclusivos ──
    // Um cliente autenticado com subscrição premium ativa pode encomendar os
    // pratos marcados como `exclusivo` no menu de hoje. Anónimos e não-premium
    // são rejeitados. Reutilizamos `clienteDoc`/`clientePremium` mais abaixo.
    const sessao = lerSessao(req)
    const clienteDoc = sessao ? await Cliente.findById(sessao.sub) : null
    const exclusivosHoje = await getExclusivosHojeSet()
    const clientePremium = clienteDoc ? await isClientePremium(clienteDoc._id) : false

    // ── Construir itens com preços do servidor ──
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const prato = await Prato.findById(item.pratoId)
        if (!prato) throw Object.assign(new Error(`Prato ${item.pratoId} não encontrado`), { status: 404 })

        if (allowedPratosSet && !allowedPratosSet.has(String(prato._id))) {
          throw Object.assign(new Error(`Prato ${prato.nome} não está no menu da empresa`), { status: 403 })
        }

        if (exclusivosHoje.has(String(prato._id)) && !clientePremium) {
          throw Object.assign(
            new Error(`${prato.nome} é um prato exclusivo — requer um plano premium ativo`),
            { status: 403 }
          )
        }

        // Fetch extras and calculate their total
        const extraDocs = item.extraIds?.length
          ? await Extra.find({ _id: { $in: item.extraIds } })
          : []

        const extrasTotal = extraDocs.reduce((sum, e) => sum + e.preco, 0)
        const isForaDoDia = Boolean(todayPratoId) && String(prato._id) !== todayPratoId
        if (isForaDoDia) foraDoDiaCount += 1
        const foraDoDiaTaxa = isForaDoDia ? FORA_DO_DIA_TAXA : 0
        const itemTotal = prato.preco + extrasTotal + foraDoDiaTaxa

        return {
          pratoId:    prato._id,
          pratoNome:  prato.nome,
          pratoPreco: prato.preco,
          customizations: {
            free: item.customizations?.free ?? [],
            salt: item.customizations?.salt ?? 'Normal',
          },
          extras: extraDocs.map(e => ({ extraId: e._id, nome: e.nome, preco: e.preco })),
          isForaDoDia,
          foraDoDiaTaxa,
          pagoComPlano: false,
          total: itemTotal,
        }
      })
    )

    const taxaForaDoDia = foraDoDiaCount * FORA_DO_DIA_TAXA
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0)

    // ── Cliente autenticado (opcional): plano pré-pago + streak ──
    // Se houver sessão válida:
    //  1) Se o cliente tem subscrição ativa com saldo, cada prato base abate 1
    //     refeição (extras e taxa fora-do-dia continuam a ser cobrados).
    //  2) Atualiza o streak (idempotente por dia) e aplica o desconto ao valor
    //     ainda cobrado em dinheiro.
    // Pedidos anónimos ignoram este bloco.
    let clienteId: string | undefined
    let subscricaoId: string | undefined
    let refeicoesConsumidas = 0
    let valorPlanoCoberto = 0
    let descontoStreakPercent = 0
    let recompensasStreak: { dias: number; descricao: string }[] = []
    {
      const cliente = clienteDoc
      if (cliente) {
        clienteId = String(cliente._id)

        // ── Consumo de plano pré-pago ──
        const subscricao = await getSubscricaoAtiva(cliente._id)
        if (subscricao) {
          // Cobre primeiro os pratos mais caros (mais valor para o cliente).
          const idxPorPreco = orderItems
            .map((_, i) => i)
            .sort((a, b) => orderItems[b]!.pratoPreco - orderItems[a]!.pratoPreco)
          for (const i of idxPorPreco) {
            if (refeicoesConsumidas >= subscricao.refeicoesRestantes) break
            const item = orderItems[i]!
            item.pagoComPlano = true
            valorPlanoCoberto += item.pratoPreco
            refeicoesConsumidas += 1
          }
          if (refeicoesConsumidas > 0) {
            await consumirRefeicoes(subscricao, refeicoesConsumidas)
            subscricaoId = String(subscricao._id)
          }
        }

        // ── Streak ──
        const resultado = await registrarPedidoStreak(cliente)
        descontoStreakPercent = resultado.descontoPercent
        recompensasStreak = resultado.novasRecompensas
        // Preenche o nome do cliente no primeiro pedido, se ainda vazio.
        if (!cliente.nome && deliveryDetails.name?.trim()) {
          cliente.nome = deliveryDetails.name.trim()
          await cliente.save()
        }
      }
    }

    // Base a cobrar em dinheiro = bruto − o que o plano cobriu.
    const baseAposPlano = Math.max(0, subtotal - valorPlanoCoberto)
    const descontoStreakValor = Math.round((baseAposPlano * descontoStreakPercent) / 100)
    const total = Math.max(0, baseAposPlano - descontoStreakValor)

    const order = await Order.create({
      empresaId,
      empresaCodigo: empresaCodigoResolved,
      clienteId,
      subscricaoId,
      items: orderItems,
      deliveryDetails: {
        name:     deliveryDetails.name,
        company:  deliveryDetails.company ?? '',
        location: deliveryDetails.location,
        contact:  deliveryDetails.contact,
      },
      foraDoDiaCount,
      taxaForaDoDia,
      subtotal,
      refeicoesConsumidas,
      valorPlanoCoberto,
      descontoStreakPercent,
      descontoStreakValor,
      total,
    })

    if (codigoParaConsumir) {
      const empresa = await Empresa.findById(codigoParaConsumir.empresaId)
      if (empresa && empresa.codigo === codigoParaConsumir.codigo) {
        const today = getCurrentDateKey()
        if (empresa.ultimoResetDia !== today) {
          empresa.usosDiaAtual = 0
          empresa.ultimoResetDia = today
        }
        empresa.usosDiaAtual += 1
        await empresa.save()
      }
    }

    res.status(201).json({
      ...order.toObject(),
      streak: clienteId
        ? { descontoPercent: descontoStreakPercent, descontoValor: descontoStreakValor, novasRecompensas: recompensasStreak }
        : null,
      plano: subscricaoId
        ? { subscricaoId, refeicoesConsumidas, valorCoberto: valorPlanoCoberto }
        : null,
    })
  } catch (err: unknown) {
    const e = err as Error & { status?: number }
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(err)
  }
})

// ── GET /api/orders ──────────────────────────────────────────────────────────
// Query: ?status=pending|preparing|ready|delivered|cancelled
router.get('/', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query['status'] && VALID_STATUSES.includes(req.query['status'] as OrderStatus)) {
      filter['status'] = req.query['status']
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id'])
    if (!order) return res.status(404).json({ error: 'Encomenda não encontrada' })
    res.json(order)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/orders/:id/status ─────────────────────────────────────────────
// Body: { status: OrderStatus }
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body as { status: OrderStatus }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}`,
      })
    }

    const order = await Order.findByIdAndUpdate(
      req.params['id'],
      { status },
      { returnDocument: 'after', runValidators: true }
    )
    if (!order) return res.status(404).json({ error: 'Encomenda não encontrada' })
    res.json(order)
  } catch (err) {
    next(err)
  }
})

export default router
