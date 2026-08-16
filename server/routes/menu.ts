import { Router } from 'express'
import Menu, { getCurrentMenuDateKey, type IMenuItem } from '../models/Menu'
import Prato from '../models/Prato'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

// Formato AAAA-MM-DD
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateKey(data: unknown): data is string {
  return typeof data === 'string' && DATE_KEY_RE.test(data)
}

interface RawMenuItem {
  pratoId: string
  destaque?: boolean
  exclusivo?: boolean
}

// Normaliza e valida os itens vindos do body; devolve null se algo inválido
function parseItens(raw: unknown): RawMenuItem[] | null {
  if (!Array.isArray(raw)) return null
  const out: RawMenuItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const pratoId = (item as { pratoId?: unknown }).pratoId
    if (typeof pratoId !== 'string' || !pratoId) return null
    out.push({
      pratoId,
      destaque: Boolean((item as { destaque?: unknown }).destaque),
      exclusivo: Boolean((item as { exclusivo?: unknown }).exclusivo),
    })
  }
  return out
}

async function ensureAllPratosExist(pratoIds: string[]): Promise<boolean> {
  if (!pratoIds.length) return true
  const unique = [...new Set(pratoIds)]
  const count = await Prato.countDocuments({ _id: { $in: unique } })
  return count === unique.length
}

// ── GET /api/menu/hoje ───────────────────────────────────────────────────────
// Menu do dia atual (timezone Maputo) com pratos populados
router.get('/hoje', async (_req, res, next) => {
  try {
    const data = getCurrentMenuDateKey()
    const menu = await Menu.findOne({ data }).populate('itens.pratoId')
    if (!menu) {
      return res.json({ data, itens: [], ativo: false, message: 'Nenhum menu configurado para hoje' })
    }
    res.json(menu)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/menu ────────────────────────────────────────────────────────────
// ?data=AAAA-MM-DD → menu dessa data (ou null); sem query → lista próximos menus (>= hoje)
router.get('/', async (req, res, next) => {
  try {
    const dataParam = req.query['data']
    if (dataParam !== undefined) {
      if (!isValidDateKey(dataParam)) {
        return res.status(400).json({ error: 'data inválida. Use o formato AAAA-MM-DD' })
      }
      const menu = await Menu.findOne({ data: dataParam }).populate('itens.pratoId')
      return res.json(menu)
    }

    const hoje = getCurrentMenuDateKey()
    const menus = await Menu.find({ data: { $gte: hoje } })
      .sort({ data: 1 })
      .populate('itens.pratoId')
    res.json(menus)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/menu/:data ──────────────────────────────────────────────────────
// Body: { itens: [{ pratoId, destaque?, exclusivo? }], ativo? }
// Cria ou atualiza (upsert) o menu da data indicada
router.put('/:data', requireAdmin, async (req, res, next) => {
  try {
    const data = req.params['data']
    if (!isValidDateKey(data)) {
      return res.status(400).json({ error: 'data inválida. Use o formato AAAA-MM-DD' })
    }

    const { itens: rawItens, ativo } = req.body as { itens?: unknown; ativo?: boolean }

    const parsed = parseItens(rawItens)
    if (parsed === null) {
      return res.status(400).json({ error: 'itens inválidos. Esperado array de { pratoId, destaque?, exclusivo? }' })
    }

    const okPratos = await ensureAllPratosExist(parsed.map((i) => i.pratoId))
    if (!okPratos) {
      return res.status(400).json({ error: 'Um ou mais pratos informados não existem' })
    }

    const itens: IMenuItem[] = parsed.map((i) => ({
      pratoId: i.pratoId as never,
      destaque: Boolean(i.destaque),
      exclusivo: Boolean(i.exclusivo),
    }))

    const update: Record<string, unknown> = { itens }
    if (ativo !== undefined) update['ativo'] = Boolean(ativo)

    const menu = await Menu.findOneAndUpdate(
      { data },
      { $set: update, $setOnInsert: { data } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('itens.pratoId')

    res.json(menu)
  } catch (err) {
    next(err)
  }
})

export default router
