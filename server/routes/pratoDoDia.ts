import { Router } from 'express'
import PratoDoDia, { type DiaSemana, DIAS_SEMANA } from '../models/PratoDoDia'
import Prato from '../models/Prato'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

// Map JS getDay() (0=Sun, 1=Mon...) to DiaSemana
const DAY_MAP: Record<number, DiaSemana> = {
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
}

// Helper: get or create the singleton schedule document
async function getSchedule() {
  let doc = await PratoDoDia.findOne()
  if (!doc) {
    doc = await PratoDoDia.create({})
  }
  return doc
}

// ── GET /api/prato-do-dia ────────────────────────────────────────────────────
// Devolve o agendamento semanal completo com pratos populados
router.get('/', async (_req, res, next) => {
  try {
    const doc = await getSchedule()
    await doc.populate('semana.prato')
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/prato-do-dia/hoje ───────────────────────────────────────────────
// Devolve o prato do dia atual (baseado no dia da semana do servidor)
router.get('/hoje', async (_req, res, next) => {
  try {
    const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
    const diaSemana = DAY_MAP[dayOfWeek]

    if (!diaSemana) {
      return res.json({ message: 'Sem prato do dia ao domingo', prato: null })
    }

    const doc = await getSchedule()
    await doc.populate('semana.prato')

    const entrada = doc.semana.find(d => d.diaSemana === diaSemana)
    if (!entrada?.prato) {
      return res.json({ diaSemana, prato: null, message: 'Nenhum prato agendado para hoje' })
    }

    res.json({ diaSemana, prato: entrada.prato })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/prato-do-dia/:diaSemana ─────────────────────────────────────────
// Body: { pratoId: string | null }
// Atribui ou remove o prato de um dia específico
router.put('/:diaSemana', requireAdmin, async (req, res, next) => {
  try {
    const diaSemana = req.params['diaSemana'] as DiaSemana
    if (!DIAS_SEMANA.includes(diaSemana)) {
      return res.status(400).json({ error: `Dia inválido. Use: ${DIAS_SEMANA.join(', ')}` })
    }

    const { pratoId } = req.body as { pratoId: string | null }

    // Validate pratoId if provided
    if (pratoId) {
      const pratoExiste = await Prato.exists({ _id: pratoId })
      if (!pratoExiste) {
        return res.status(404).json({ error: 'Prato não encontrado' })
      }
    }

    const doc = await getSchedule()
    const entrada = doc.semana.find(d => d.diaSemana === diaSemana)

    if (entrada) {
      entrada.prato = pratoId ? (pratoId as never) : null
    } else {
      doc.semana.push({ diaSemana, prato: pratoId ? (pratoId as never) : null })
    }

    await doc.save()
    await doc.populate('semana.prato')

    res.json(doc)
  } catch (err) {
    next(err)
  }
})

export default router
