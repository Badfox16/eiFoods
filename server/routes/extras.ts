import { Router } from 'express'
import Extra from '../models/Extra'
import Prato from '../models/Prato'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

// ── GET /api/extras ──────────────────────────────────────────────────────────
// Query: ?global=true|false
router.get('/', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query['global'] !== undefined) {
      filter['global'] = req.query['global'] === 'true'
    }
    const extras = await Extra.find(filter).sort({ createdAt: -1 })
    res.json(extras)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/extras/prato/:pratoId ───────────────────────────────────────────
// Devolve: extras globais + extras exclusivos do prato (lista combinada, sem duplicados)
router.get('/prato/:pratoId', async (req, res, next) => {
  try {
    const prato = await Prato.findById(req.params['pratoId']).populate('extrasProprios')
    if (!prato) return res.status(404).json({ error: 'Prato não encontrado' })

    const globais = await Extra.find({ global: true, ativo: true })

    // Merge: global extras + prato-specific extras, deduplicating by _id
    const globalIds = new Set(globais.map(e => e.id as string))
    const exclusivos = (prato.extrasProprios as unknown as InstanceType<typeof Extra>[])
      .filter(e => !globalIds.has(e.id as string))

    res.json([...globais, ...exclusivos])
  } catch (err) {
    next(err)
  }
})

// ── POST /api/extras ─────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { nome, preco, global: isGlobal } = req.body as { nome: string; preco: number; global?: boolean }
    const extra = await Extra.create({
      nome,
      preco: Number(preco),
      global: isGlobal !== undefined ? isGlobal : true,
    })
    res.status(201).json(extra)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/extras/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const extra = await Extra.findByIdAndUpdate(req.params['id'], req.body, {
      returnDocument: 'after',
      runValidators: true,
    })
    if (!extra) return res.status(404).json({ error: 'Extra não encontrado' })
    res.json(extra)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/extras/:id ───────────────────────────────────────────────────
// Remove também as referências em Prato.extrasProprios
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const extra = await Extra.findByIdAndDelete(req.params['id'])
    if (!extra) return res.status(404).json({ error: 'Extra não encontrado' })

    // Clean up references in all pratos
    await Prato.updateMany(
      { extrasProprios: extra._id },
      { $pull: { extrasProprios: extra._id } }
    )

    res.json({ message: 'Extra eliminado com sucesso' })
  } catch (err) {
    next(err)
  }
})

export default router
