import { Router } from 'express'
import cloudinary from '../lib/cloudinary'
import upload from '../lib/upload'
import Prato from '../models/Prato'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

// Helper: upload buffer to Cloudinary
async function uploadToCloudinary(buffer: Buffer, folder = 'eiFoods/pratos'): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload falhou'))
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

// ── GET /api/pratos ──────────────────────────────────────────────────────────
// Query: ?disponivel=true|false
router.get('/', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query['disponivel'] !== undefined) {
      filter['disponivel'] = req.query['disponivel'] === 'true'
    }
    const pratos = await Prato.find(filter)
      .populate('extrasProprios')
      .sort({ createdAt: -1 })
    res.json(pratos)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/pratos/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const prato = await Prato.findById(req.params['id']).populate('extrasProprios')
    if (!prato) return res.status(404).json({ error: 'Prato não encontrado' })
    res.json(prato)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/pratos ─────────────────────────────────────────────────────────
// multipart/form-data: nome, descricao, preco, imagem (file), extrasProprios (JSON array)
router.post('/', requireAdmin, upload.single('imagem'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Imagem obrigatória' })

    const { url, publicId } = await uploadToCloudinary(req.file.buffer)

    const extras: string[] = req.body['extrasProprios']
      ? JSON.parse(req.body['extrasProprios']) as string[]
      : []

    const prato = await Prato.create({
      nome:          req.body['nome'],
      descricao:     req.body['descricao'] ?? '',
      preco:         Number(req.body['preco']),
      imagem:        { url, publicId },
      disponivel:    req.body['disponivel'] === 'true',
      extrasProprios: extras,
    })

    res.status(201).json(prato)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/pratos/:id ──────────────────────────────────────────────────────
// multipart/form-data: campos opcionais + imagem opcional
router.put('/:id', requireAdmin, upload.single('imagem'), async (req, res, next) => {
  try {
    const prato = await Prato.findById(req.params['id'])
    if (!prato) return res.status(404).json({ error: 'Prato não encontrado' })

    if (req.body['nome'])      prato.nome      = req.body['nome']
    if (req.body['descricao']) prato.descricao = req.body['descricao']
    if (req.body['preco'])     prato.preco     = Number(req.body['preco'])
    if (req.body['disponivel'] !== undefined) {
      prato.disponivel = req.body['disponivel'] === 'true'
    }
    if (req.body['extrasProprios']) {
      prato.extrasProprios = JSON.parse(req.body['extrasProprios']) as never[]
    }

    // Nova imagem: apagar a antiga no Cloudinary e fazer upload da nova
    if (req.file) {
      if (prato.imagem.publicId) {
        await cloudinary.uploader.destroy(prato.imagem.publicId)
      }
      const { url, publicId } = await uploadToCloudinary(req.file.buffer)
      prato.imagem = { url, publicId }
    }

    await prato.save()
    res.json(prato)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/pratos/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const prato = await Prato.findByIdAndDelete(req.params['id'])
    if (!prato) return res.status(404).json({ error: 'Prato não encontrado' })

    if (prato.imagem.publicId) {
      await cloudinary.uploader.destroy(prato.imagem.publicId)
    }

    res.json({ message: 'Prato eliminado com sucesso' })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/pratos/:id/disponivel ────────────────────────────────────────
// Body: { disponivel: boolean }
router.patch('/:id/disponivel', requireAdmin, async (req, res, next) => {
  try {
    const { disponivel } = req.body as { disponivel: boolean }
    if (typeof disponivel !== 'boolean') {
      return res.status(400).json({ error: "'disponivel' deve ser boolean" })
    }

    const prato = await Prato.findByIdAndUpdate(
      req.params['id'],
      { disponivel },
      { returnDocument: 'after' }
    )
    if (!prato) return res.status(404).json({ error: 'Prato não encontrado' })
    res.json(prato)
  } catch (err) {
    next(err)
  }
})

export default router
