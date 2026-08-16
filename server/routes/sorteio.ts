import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import Sorteio from '../models/Sorteio'
import PratoDoDia, { type DiaSemana } from '../models/PratoDoDia'
import { getMaputoWeekdayNumber, isFridayInMaputo } from '../lib/businessTime'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

const PARTICIPANTES_DEFAULT = [
  { id: 'p-0023', ref: '#0023', nome: 'Ana Machava', empresa: 'Mozal S.A.', contacto: '258841001001' },
  { id: 'p-0047', ref: '#0047', nome: 'Carlos Sitoe', empresa: 'BCI Banco', contacto: '258841002002' },
  { id: 'p-0061', ref: '#0061', nome: 'Fátima Nhaca', empresa: 'Vodacom Moç.', contacto: '258841003003' },
  { id: 'p-0082', ref: '#0082', nome: 'João Cossa', empresa: 'EDM', contacto: '258841004004' },
  { id: 'p-0094', ref: '#0094', nome: 'Maria Tembe', empresa: 'Mcel', contacto: '258841005005' },
]

const DAY_MAP: Record<number, DiaSemana> = {
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
}

async function getOrCreateSorteio() {
  let doc = await Sorteio.findOne()
  if (!doc) {
    doc = await Sorteio.create({
      valorRifa: 10,
      participantes: PARTICIPANTES_DEFAULT.map((p) => ({
        ...p,
        inscritoEm: new Date(),
      })),
    })
  }
  return doc
}

function nextRef(participantes: Array<{ ref: string }>) {
  const max = participantes.reduce((acc, p) => {
    const n = Number.parseInt(p.ref.replace('#', ''), 10)
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `#${String(max + 1).padStart(4, '0')}`
}

async function getPremioHoje() {
  const dayOfWeek = getMaputoWeekdayNumber()
  const diaSemana = DAY_MAP[dayOfWeek]
  if (!diaSemana) return { pratoNome: null, premioValor: null }

  const agenda = await PratoDoDia.findOne().populate('semana.prato')
  const entrada = agenda?.semana.find((d) => d.diaSemana === diaSemana)
  const prato = entrada?.prato as { nome?: string; preco?: number } | null | undefined

  if (!prato) return { pratoNome: null, premioValor: null }
  return { pratoNome: prato.nome ?? null, premioValor: prato.preco ?? null }
}

// GET /api/sorteio
router.get('/', async (_req, res, next) => {
  try {
    const doc = await getOrCreateSorteio()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/sorteio/inscricoes
// Cliente cria inscrição pendente (aguarda confirmação de pagamento pelo admin)
router.post('/inscricoes', async (req, res, next) => {
  try {
    if (isFridayInMaputo()) {
      return res.status(403).json({ error: 'Inscrições para rifa não são permitidas às sextas-feiras' })
    }

    const { nome, empresa, contacto } = req.body as { nome?: string; empresa?: string; contacto?: string }

    if (!nome?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }

    if (!contacto?.trim()) {
      return res.status(400).json({ error: 'Contacto é obrigatório' })
    }

    const doc = await getOrCreateSorteio()

    const jaPendente = doc.inscricoesPendentes.some((i) => i.contacto === contacto.trim())
    const jaParticipante = doc.participantes.some((p) => p.contacto === contacto.trim())
    if (jaPendente || jaParticipante) {
      return res.status(400).json({ error: 'Já existe inscrição para este contacto' })
    }

    doc.inscricoesPendentes.push({
      id: randomUUID(),
      nome: nome.trim(),
      empresa: empresa?.trim() || '—',
      contacto: contacto.trim(),
      criadoEm: new Date(),
    })

    await doc.save()
    res.status(201).json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/sorteio/inscricoes/:id/confirmar
// Admin confirma pagamento e move inscrição para participante válido
router.post('/inscricoes/:id/confirmar', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params['id']
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const doc = await getOrCreateSorteio()
    const inscricao = doc.inscricoesPendentes.find((i) => i.id === id)

    if (!inscricao) {
      return res.status(404).json({ error: 'Inscrição pendente não encontrada' })
    }

    doc.inscricoesPendentes = doc.inscricoesPendentes.filter((i) => i.id !== id)
    doc.participantes.push({
      id: inscricao.id,
      ref: nextRef(doc.participantes),
      nome: inscricao.nome,
      empresa: inscricao.empresa,
      contacto: inscricao.contacto,
      inscritoEm: new Date(),
    })

    await doc.save()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/sorteio/valor-rifa
router.patch('/valor-rifa', requireAdmin, async (req, res, next) => {
  try {
    const { valorRifa } = req.body as { valorRifa?: number }
    const valor = Number(valorRifa)

    if (!Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ error: 'valorRifa deve ser um número >= 0' })
    }

    const doc = await getOrCreateSorteio()
    doc.valorRifa = valor
    await doc.save()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/sorteio/inscricoes/:id
// Admin rejeita/cancela inscrição pendente
router.delete('/inscricoes/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params['id']
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const doc = await getOrCreateSorteio()
    doc.inscricoesPendentes = doc.inscricoesPendentes.filter((i) => i.id !== id)
    await doc.save()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/sorteio/participantes
router.post('/participantes', requireAdmin, async (req, res, next) => {
  try {
    const { nome, empresa, contacto } = req.body as { nome?: string; empresa?: string; contacto?: string }

    if (!nome?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }

    const doc = await getOrCreateSorteio()
    const novoParticipante = {
      id: randomUUID(),
      ref: nextRef(doc.participantes),
      nome: nome.trim(),
      empresa: empresa?.trim() || '—',
      contacto: contacto?.trim() || '—',
      inscritoEm: new Date(),
    }

    doc.participantes.push(novoParticipante)
    await doc.save()

    res.status(201).json(doc)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/sorteio/participantes/:id
router.delete('/participantes/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params['id']
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const doc = await getOrCreateSorteio()
    doc.participantes = doc.participantes.filter((p) => p.id !== id)

    if (doc.vencedorAtual?.participanteId === id) {
      doc.vencedorAtual = null
    }

    await doc.save()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/sorteio/realizar
router.post('/realizar', requireAdmin, async (_req, res, next) => {
  try {
    if (!isFridayInMaputo()) {
      return res.status(400).json({ error: 'O sorteio só pode ser realizado à sexta-feira (Africa/Maputo)' })
    }

    const doc = await getOrCreateSorteio()
    if (doc.participantes.length === 0) {
      return res.status(400).json({ error: 'Sem participantes para sortear' })
    }

    const idx = Math.floor(Math.random() * doc.participantes.length)
    const participante = doc.participantes[idx]

    if (!participante) {
      return res.status(500).json({ error: 'Falha ao escolher participante' })
    }

    const premio = await getPremioHoje()

    const vencedor = {
      participanteId: participante.id,
      ref: participante.ref,
      nome: participante.nome,
      empresa: participante.empresa,
      contacto: participante.contacto,
      data: new Date(),
      pratoNome: premio.pratoNome,
      premioValor: premio.premioValor,
    }

    doc.vencedorAtual = vencedor
    doc.historico = [vencedor, ...doc.historico].slice(0, 30)
    await doc.save()

    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/sorteio/reset
router.post('/reset', requireAdmin, async (_req, res, next) => {
  try {
    const doc = await getOrCreateSorteio()
    doc.vencedorAtual = null
    await doc.save()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

export default router
