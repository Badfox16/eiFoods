/**
 * OpenAPI 3.0 specification for the eiFoods API.
 * Served at GET /api/docs via swagger-ui-express.
 */
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'eiFoods API',
    version: '2.0.0',
    description:
      'REST API para a plataforma de encomenda de refeições eiFoods. ' +
      'Gere pratos, extras, menu do dia, encomendas, identidade do cliente ' +
      '(telefone+OTP), planos pré-pagos e subscrições, sistema de streak e o ' +
      'painel de administração autenticado. ' +
      'Autenticação por cookie httpOnly: `eifoods_session` (cliente) e ' +
      '`eifoods_admin` (admin). Rotas marcadas "(admin)" exigem a sessão de admin.',
    contact: { name: 'eiFoods' },
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Desenvolvimento local' },
  ],
  tags: [
    { name: 'Saúde', description: 'Estado do servidor' },
    { name: 'Pratos', description: 'Catálogo de pratos' },
    { name: 'Extras', description: 'Extras pagos (globais e exclusivos por prato)' },
    { name: 'Menu', description: 'Menu por data de calendário (substitui o prato do dia)' },
    { name: 'Prato do Dia', description: '[deprecated] Agenda semanal do prato em destaque — substituído por Menu' },
    { name: 'Encomendas', description: 'Gestão de encomendas de clientes' },
    { name: 'Sorteio', description: 'Gestão do sorteio diário (participantes e resultado)' },
    { name: 'Empresas', description: 'Gestão de empresas, código único e menus exclusivos' },
    { name: 'Auth', description: 'Identidade do cliente por telefone + OTP (sessão em cookie httpOnly)' },
    { name: 'Admin', description: 'Autenticação do painel de administração (username + password)' },
    { name: 'Streak', description: 'Sistema de sequência/recompensas (estilo Duolingo) por cliente' },
    { name: 'Planos', description: 'Planos pré-pagos de refeições (config admin)' },
    { name: 'Subscrições', description: 'Subscrições dos clientes: compra, comprovativo e confirmação manual' },
  ],

  // ── Reusable schemas ──────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'eifoods_session',
        description: 'Sessão de cliente (JWT httpOnly) emitida por POST /auth/verify-otp.',
      },
      adminAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'eifoods_admin',
        description: 'Sessão de admin (JWT httpOnly) emitida por POST /admin/login.',
      },
    },
    schemas: {
      Cliente: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66a1f2e3b5d4c8f01234abcd' },
          telefone: { type: 'string', example: '258841234567', description: 'Normalizado para 258XXXXXXXXX' },
          nome: { type: 'string', example: 'Ana Machava' },
          empresaId: { type: 'string', nullable: true, description: 'Empresa associada (opcional; em standby)' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Imagem: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/demo/image/upload/v1/eiFoods/pratos/abc.jpg' },
          publicId: { type: 'string', example: 'eiFoods/pratos/abc' },
        },
        required: ['url', 'publicId'],
      },

      Prato: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66a1f2e3b5d4c8f01234abcd' },
          nome: { type: 'string', example: 'Frango no Caril com Arroz' },
          descricao: { type: 'string', example: 'Frango suculento em molho de caril suave' },
          preco: { type: 'number', example: 350 },
          imagem: { $ref: '#/components/schemas/Imagem' },
          disponivel: { type: 'boolean', example: true },
          extrasProprios: {
            type: 'array',
            items: { $ref: '#/components/schemas/Extra' },
            description: 'Extras exclusivos deste prato (populados)',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Extra: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66a1f2e3b5d4c8f01234ef01' },
          nome: { type: 'string', example: '+ Frango extra' },
          preco: { type: 'number', example: 50 },
          global: { type: 'boolean', example: true, description: 'Disponível para todos os pratos' },
          ativo: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      DiaAgendado: {
        type: 'object',
        properties: {
          diaSemana: {
            type: 'string',
            enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
            example: 'segunda',
          },
          prato: {
            oneOf: [{ $ref: '#/components/schemas/Prato' }, { type: 'null' }],
            description: 'Prato agendado para este dia (null se não definido)',
          },
        },
      },

      AgendaSemanal: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          semana: {
            type: 'array',
            items: { $ref: '#/components/schemas/DiaAgendado' },
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      MenuItem: {
        type: 'object',
        properties: {
          pratoId: {
            oneOf: [{ $ref: '#/components/schemas/Prato' }, { type: 'string' }],
            description: 'Prato do menu (populado nas respostas)',
          },
          destaque: { type: 'boolean', example: false, description: 'Prato em destaque do dia' },
          exclusivo: { type: 'boolean', example: false, description: 'Prato exclusivo (tier premium)' },
        },
      },

      Menu: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          data: { type: 'string', example: '2026-08-15', description: 'Chave do dia AAAA-MM-DD (timezone Maputo)' },
          itens: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } },
          ativo: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      OrderExtra: {
        type: 'object',
        properties: {
          extraId: { type: 'string' },
          nome: { type: 'string', example: '+ Camarão' },
          preco: { type: 'number', example: 100 },
        },
      },

      OrderItem: {
        type: 'object',
        properties: {
          pratoId: { type: 'string' },
          pratoNome: { type: 'string', example: 'Frango no Caril' },
          pratoPreco: { type: 'number', example: 350 },
          customizations: {
            type: 'object',
            properties: {
              free: { type: 'array', items: { type: 'string' }, example: ['Sem picante', 'Com molho extra'] },
              salt: { type: 'string', example: 'Pouco sal' },
            },
          },
          extras: { type: 'array', items: { $ref: '#/components/schemas/OrderExtra' } },
          total: { type: 'number', example: 450 },
        },
      },

      DeliveryDetails: {
        type: 'object',
        required: ['name', 'location', 'contact'],
        properties: {
          name: { type: 'string', example: 'Ana Machava' },
          company: { type: 'string', example: 'Empresa XYZ' },
          location: { type: 'string', example: 'Escritório 2º piso, Recepção' },
          contact: { type: 'string', example: '841234567' },
        },
      },

      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66a1f300b5d4c8f09988ccdd' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          deliveryDetails: { $ref: '#/components/schemas/DeliveryDetails' },
          status: {
            type: 'string',
            enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
            example: 'pending',
          },
          total: { type: 'number', example: 900 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      SorteioParticipante: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'p-0023' },
          ref: { type: 'string', example: '#0023' },
          nome: { type: 'string', example: 'Ana Machava' },
          empresa: { type: 'string', example: 'Mozal S.A.' },
          contacto: { type: 'string', example: '258841001001' },
          inscritoEm: { type: 'string', format: 'date-time' },
        },
      },

      SorteioInscricao: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '2f7f4f31-2c20-4307-8f36-2a8f6d9e4ad1' },
          nome: { type: 'string', example: 'João Cossa' },
          empresa: { type: 'string', example: 'EDM' },
          contacto: { type: 'string', example: '258841004004' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },

      SorteioVencedor: {
        type: 'object',
        properties: {
          participanteId: { type: 'string', example: 'p-0023' },
          ref: { type: 'string', example: '#0023' },
          nome: { type: 'string', example: 'Ana Machava' },
          empresa: { type: 'string', example: 'Mozal S.A.' },
          contacto: { type: 'string', example: '258841001001' },
          data: { type: 'string', format: 'date-time' },
          pratoNome: { type: 'string', nullable: true, example: 'Caril de Frango com Arroz Basmati' },
          premioValor: { type: 'number', nullable: true, example: 290 },
        },
      },

      Sorteio: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          inscricoesPendentes: {
            type: 'array',
            items: { $ref: '#/components/schemas/SorteioInscricao' },
          },
          participantes: {
            type: 'array',
            items: { $ref: '#/components/schemas/SorteioParticipante' },
          },
          vencedorAtual: {
            oneOf: [{ $ref: '#/components/schemas/SorteioVencedor' }, { type: 'null' }],
          },
          historico: {
            type: 'array',
            items: { $ref: '#/components/schemas/SorteioVencedor' },
          },
          updatedAt: { type: 'string', format: 'date-time' },
          valorRifa: { type: 'number', example: 10, description: 'Valor da rifa em centavos (inteiro)' },
        },
      },

      AdminUser: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66b0aa11c2d3e4f556677889' },
          username: { type: 'string', example: 'admin' },
          nome: { type: 'string', example: 'Administrador' },
        },
      },

      StreakTier: {
        type: 'object',
        properties: {
          dias: { type: 'integer', example: 7, description: 'Nº de dias úteis consecutivos do marco' },
          tipo: { type: 'string', enum: ['desconto', 'item_gratis'], example: 'desconto' },
          valor: { type: 'number', example: 11, description: 'Percentagem de desconto (tipo=desconto) ou 0 (item_gratis)' },
          descricao: { type: 'string', example: '11% de desconto' },
        },
      },

      StreakConfig: {
        type: 'object',
        properties: {
          tiers: { type: 'array', items: { $ref: '#/components/schemas/StreakTier' } },
        },
      },

      RecompensaGanha: {
        type: 'object',
        properties: {
          dias: { type: 'integer', example: 21 },
          descricao: { type: 'string', example: 'Uma dose de batata grátis' },
          ganhoEm: { type: 'string', format: 'date-time' },
          cumprida: { type: 'boolean', example: false, description: 'Marcado quando o prémio é entregue' },
        },
      },

      ClienteStreak: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          telefone: { type: 'string', example: '258841234567' },
          nome: { type: 'string', example: 'Ana Machava' },
          streakAtual: { type: 'integer', example: 7 },
          maiorStreak: { type: 'integer', example: 12 },
          ultimoDiaPedido: { type: 'string', nullable: true, example: '2026-08-14' },
          recompensasGanhas: { type: 'array', items: { $ref: '#/components/schemas/RecompensaGanha' } },
        },
      },

      Plano: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66b0bb22c2d3e4f556677aa0' },
          nome: { type: 'string', example: 'Plano Mensal Premium' },
          tipo: { type: 'string', enum: ['semanal', 'bissemanal', 'mensal'], example: 'mensal' },
          numRefeicoes: { type: 'integer', example: 22 },
          preco: { type: 'number', example: 4500 },
          validadeDias: { type: 'integer', example: 30 },
          premium: { type: 'boolean', example: true, description: 'Concede tier premium (desbloqueia exclusivos) enquanto ativo' },
          descricao: { type: 'string', example: '22 refeições + acesso a pratos exclusivos' },
          ativo: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Subscricao: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          clienteId: { description: 'ID do cliente (populado com { _id, telefone, nome } nas rotas admin)', oneOf: [{ type: 'string' }, { type: 'object' }] },
          planoId: { description: 'ID do plano (populado com { _id, nome, tipo } nas rotas admin)', oneOf: [{ type: 'string' }, { type: 'object' }] },
          planoNome: { type: 'string', example: 'Plano Mensal Premium' },
          numRefeicoes: { type: 'integer', example: 22 },
          preco: { type: 'number', example: 4500 },
          premium: { type: 'boolean', example: true },
          refeicoesRestantes: { type: 'integer', example: 18 },
          estado: { type: 'string', enum: ['pendente_pagamento', 'ativa', 'expirada', 'rejeitada'], example: 'ativa' },
          comprovativo: { $ref: '#/components/schemas/Imagem' },
          dataInicio: { type: 'string', format: 'date-time', nullable: true },
          dataExpiracao: { type: 'string', format: 'date-time', nullable: true },
          notaAdmin: { type: 'string', example: 'Pagamento confirmado via M-Pesa' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Prato não encontrado' },
        },
      },
    },
  },

  // ── Paths ─────────────────────────────────────────────────────────────────
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Saúde'],
        summary: 'Estado do servidor e da base de dados',
        responses: {
          200: {
            description: 'Servidor operacional',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    db: { type: 'string', example: 'connected' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Pratos ──────────────────────────────────────────────────────────────
    '/pratos': {
      get: {
        tags: ['Pratos'],
        summary: 'Listar pratos',
        parameters: [
          {
            name: 'disponivel',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filtrar por disponibilidade',
          },
        ],
        responses: {
          200: {
            description: 'Lista de pratos',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Prato' } } } },
          },
        },
      },
      post: {
        tags: ['Pratos'],
        summary: 'Criar novo prato',
        description: 'Envia `multipart/form-data`. A imagem é obrigatória no primeiro upload (guardada no Cloudinary).',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['nome', 'preco', 'imagem'],
                properties: {
                  nome: { type: 'string', example: 'Caril de Frango' },
                  descricao: { type: 'string' },
                  preco: { type: 'number', example: 350 },
                  disponivel: { type: 'boolean', default: false },
                  imagem: { type: 'string', format: 'binary', description: 'Ficheiro de imagem (JPEG/PNG/WebP, máx 5 MB)' },
                  extrasProprios: { type: 'string', example: '["<extraId1>","<extraId2>"]', description: 'JSON array de IDs de extras exclusivos' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Prato criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prato' } } } },
          400: { description: 'Imagem em falta ou dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/pratos/{id}': {
      get: {
        tags: ['Pratos'],
        summary: 'Obter prato por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Prato encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prato' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Pratos'],
        summary: 'Atualizar prato',
        description: 'Todos os campos são opcionais. Se `imagem` for enviado, a imagem anterior é apagada do Cloudinary.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  descricao: { type: 'string' },
                  preco: { type: 'number' },
                  disponivel: { type: 'boolean' },
                  imagem: { type: 'string', format: 'binary' },
                  extrasProprios: { type: 'string', description: 'JSON array de IDs' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Prato atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prato' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Pratos'],
        summary: 'Eliminar prato',
        description: 'Remove o prato e apaga a imagem correspondente do Cloudinary.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Eliminado com sucesso', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/pratos/{id}/disponivel': {
      patch: {
        tags: ['Pratos'],
        summary: 'Alternar disponibilidade do prato',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['disponivel'], properties: { disponivel: { type: 'boolean' } } },
            },
          },
        },
        responses: {
          200: { description: 'Prato atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prato' } } } },
          400: { description: "Campo 'disponivel' inválido", content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Extras ──────────────────────────────────────────────────────────────
    '/extras': {
      get: {
        tags: ['Extras'],
        summary: 'Listar extras',
        parameters: [
          {
            name: 'global',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filtrar por âmbito (global=true → disponíveis para todos)',
          },
        ],
        responses: {
          200: { description: 'Lista de extras', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Extra' } } } } },
        },
      },
      post: {
        tags: ['Extras'],
        summary: 'Criar novo extra',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'preco'],
                properties: {
                  nome: { type: 'string', example: '+ Camarão' },
                  preco: { type: 'number', example: 100 },
                  global: { type: 'boolean', default: true, description: 'Se verdadeiro, aparece em todos os pratos' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Extra criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Extra' } } } },
        },
      },
    },

    '/extras/prato/{pratoId}': {
      get: {
        tags: ['Extras'],
        summary: 'Listar extras disponíveis para um prato',
        description: 'Devolve a união dos extras globais (ativos) com os extras exclusivos do prato, sem duplicados.',
        parameters: [{ name: 'pratoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Lista combinada de extras', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Extra' } } } } },
          404: { description: 'Prato não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/extras/{id}': {
      put: {
        tags: ['Extras'],
        summary: 'Atualizar extra',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  preco: { type: 'number' },
                  global: { type: 'boolean' },
                  ativo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Extra atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Extra' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Extras'],
        summary: 'Eliminar extra',
        description: 'Remove o extra e limpa todas as referências em `Prato.extrasProprios`.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Eliminado com sucesso', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Menu por dia ─────────────────────────────────────────────────────────
    '/menu/hoje': {
      get: {
        tags: ['Menu'],
        summary: 'Menu do dia atual',
        description: 'Devolve o menu do dia atual (timezone Maputo) com os pratos populados em `itens.pratoId`. Se não existir menu, devolve `{ data, itens: [], ativo: false, message }`.',
        responses: {
          200: { description: 'Menu de hoje', content: { 'application/json': { schema: { $ref: '#/components/schemas/Menu' } } } },
        },
      },
    },

    '/menu': {
      get: {
        tags: ['Menu'],
        summary: 'Menu por data ou lista de menus futuros',
        description: 'Com `?data=AAAA-MM-DD` devolve o menu dessa data (ou `null`). Sem query devolve a lista de menus com data >= hoje, ordenados por data.',
        parameters: [
          {
            name: 'data',
            in: 'query',
            required: false,
            schema: { type: 'string', example: '2026-08-15' },
            description: 'Chave do dia AAAA-MM-DD',
          },
        ],
        responses: {
          200: {
            description: 'Menu(s)',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/Menu' },
                    { type: 'array', items: { $ref: '#/components/schemas/Menu' } },
                    { type: 'null' },
                  ],
                },
              },
            },
          },
          400: { description: 'Data inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/menu/{data}': {
      put: {
        tags: ['Menu'],
        summary: 'Criar ou atualizar (upsert) o menu de uma data',
        parameters: [
          {
            name: 'data',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '2026-08-15' },
            description: 'Chave do dia AAAA-MM-DD',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itens'],
                properties: {
                  itens: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['pratoId'],
                      properties: {
                        pratoId: { type: 'string', example: '66a1f2e3b5d4c8f01234abcd' },
                        destaque: { type: 'boolean', example: true },
                        exclusivo: { type: 'boolean', example: false },
                      },
                    },
                  },
                  ativo: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Menu criado/atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Menu' } } } },
          400: { description: 'Data ou itens inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Prato do Dia (@deprecated — substituído por Menu) ────────────────────
    '/prato-do-dia': {
      get: {
        tags: ['Prato do Dia'],
        summary: 'Obter agenda semanal completa',
        description: 'Devolve o documento singleton com a agenda de Segunda a Sábado, pratos populados.',
        responses: {
          200: { description: 'Agenda semanal', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgendaSemanal' } } } },
        },
      },
    },

    '/prato-do-dia/hoje': {
      get: {
        tags: ['Prato do Dia'],
        summary: 'Prato do dia de hoje',
        description: 'Determina o dia da semana no servidor. Devolve `{ prato: null }` ao domingo ou quando não há prato agendado.',
        responses: {
          200: {
            description: 'Prato do dia',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    diaSemana: { type: 'string', enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] },
                    prato: { oneOf: [{ $ref: '#/components/schemas/Prato' }, { type: 'null' }] },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/prato-do-dia/{diaSemana}': {
      put: {
        tags: ['Prato do Dia'],
        summary: 'Definir ou remover o prato de um dia',
        parameters: [
          {
            name: 'diaSemana',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] },
            example: 'segunda',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pratoId'],
                properties: {
                  pratoId: {
                    oneOf: [{ type: 'string' }, { type: 'null' }],
                    description: 'ID do prato a agendar, ou null para limpar o dia',
                    example: '66a1f2e3b5d4c8f01234abcd',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Agenda atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgendaSemanal' } } } },
          400: { description: 'Dia inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Prato não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Encomendas ────────────────────────────────────────────────────────────
    '/orders': {
      post: {
        tags: ['Encomendas'],
        summary: 'Criar encomenda',
        description: 'O total de cada item e o total global são **sempre recalculados no servidor** com base nos preços actuais da BD.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'deliveryDetails'],
                properties: {
                  items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['pratoId'],
                      properties: {
                        pratoId: { type: 'string' },
                        customizations: {
                          type: 'object',
                          properties: {
                            free: { type: 'array', items: { type: 'string' }, example: ['Sem picante'] },
                            salt: { type: 'string', example: 'Normal' },
                          },
                        },
                        extraIds: { type: 'array', items: { type: 'string' }, description: 'IDs dos extras selecionados' },
                      },
                    },
                  },
                  deliveryDetails: { $ref: '#/components/schemas/DeliveryDetails' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Encomenda criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Prato ou extra não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Encomendas'],
        summary: 'Listar encomendas',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] },
            description: 'Filtrar por estado',
          },
        ],
        responses: {
          200: { description: 'Lista de encomendas', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
        },
      },
    },

    '/orders/{id}': {
      get: {
        tags: ['Encomendas'],
        summary: 'Obter encomenda por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Encomenda encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/orders/{id}/status': {
      patch: {
        tags: ['Encomendas'],
        summary: 'Atualizar estado de uma encomenda',
        description: 'Fluxo típico: `pending` → `preparing` → `ready` → `delivered`.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Encomenda atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: 'Status inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Sorteio ──────────────────────────────────────────────────────────────
    '/sorteio': {
      get: {
        tags: ['Sorteio'],
        summary: 'Obter estado atual do sorteio',
        description: 'Devolve participantes, vencedor atual e histórico de sorteios.',
        responses: {
          200: {
            description: 'Estado do sorteio',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
        },
      },
    },

    '/sorteio/participantes': {
      post: {
        tags: ['Sorteio'],
        summary: 'Adicionar participante ao sorteio',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome'],
                properties: {
                  nome: { type: 'string', example: 'João Cossa' },
                  empresa: { type: 'string', example: 'EDM' },
                  contacto: { type: 'string', example: '258841004004' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Participante adicionado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          400: {
            description: 'Dados inválidos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/sorteio/inscricoes': {
      post: {
        tags: ['Sorteio'],
        summary: 'Criar inscrição pendente no sorteio',
        description: 'Endpoint público para cliente se inscrever. A inscrição só vira participante válido após confirmação de pagamento no admin. Novas inscrições ficam bloqueadas às sextas-feiras (Africa/Maputo).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'contacto'],
                properties: {
                  nome: { type: 'string', example: 'João Cossa' },
                  empresa: { type: 'string', example: 'EDM' },
                  contacto: { type: 'string', example: '258841004004' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Inscrição criada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          400: {
            description: 'Dados inválidos ou inscrição duplicada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          403: {
            description: 'Inscrições bloqueadas na sexta-feira',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/sorteio/inscricoes/{id}/confirmar': {
      post: {
        tags: ['Sorteio'],
        summary: 'Confirmar pagamento e ativar participante',
        description: 'Admin confirma o pagamento; a inscrição pendente passa a participante válido para sorteio.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Inscrição confirmada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          404: {
            description: 'Inscrição não encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/sorteio/inscricoes/{id}': {
      delete: {
        tags: ['Sorteio'],
        summary: 'Rejeitar/cancelar inscrição pendente',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Inscrição removida',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
        },
      },
    },

    '/sorteio/participantes/{id}': {
      delete: {
        tags: ['Sorteio'],
        summary: 'Remover participante do sorteio',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Participante removido',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          400: {
            description: 'ID inválido',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/sorteio/realizar': {
      post: {
        tags: ['Sorteio'],
        summary: 'Realizar sorteio e publicar vencedor atual',
        description: 'O sorteio só pode ser realizado à sexta-feira (Africa/Maputo).',
        responses: {
          200: {
            description: 'Sorteio realizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          400: {
            description: 'Sem participantes para sortear ou tentativa fora da sexta-feira',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/sorteio/reset': {
      post: {
        tags: ['Sorteio'],
        summary: 'Limpar resultado atual do sorteio',
        responses: {
          200: {
            description: 'Resultado atual removido',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
        },
      },
    },

    '/sorteio/valor-rifa': {
      patch: {
        tags: ['Sorteio'],
        summary: 'Atualizar valor da rifa (admin)',
        description: 'Permite ao admin definir o valor cobrado por participação no sorteio.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['valorRifa'],
                properties: {
                  valorRifa: { type: 'number', example: 10, description: 'Valor da rifa em centavos' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sorteio atualizado com novo valor',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Sorteio' } } },
          },
          400: { description: 'Valor inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/empresas/{id}/codigo/ativo': {
      patch: {
        tags: ['Empresas'],
        summary: 'Ativar/desativar código único da empresa',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ativo'],
                properties: {
                  ativo: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Empresa atualizada',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          400: { description: 'Payload inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Empresa não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Auth ─────────────────────────────────────────────────────────────────
    '/auth/request-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Pedir código OTP',
        description: 'Gera um código de 6 dígitos e envia-o para o telefone (em dev, apenas logado no console). Rate-limit por telefone.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['telefone'],
                properties: {
                  telefone: { type: 'string', example: '841234567', description: 'Aceita vários formatos; normalizado para 258XXXXXXXXX' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Código enviado', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, telefone: { type: 'string' }, message: { type: 'string' } } } } } },
          400: { description: 'Telefone inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate-limit (aguardar antes de novo pedido)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verificar OTP e iniciar sessão',
        description: 'Valida o código, cria o cliente se não existir e emite a sessão via cookie httpOnly (JWT).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['telefone', 'codigo'],
                properties: {
                  telefone: { type: 'string', example: '841234567' },
                  codigo: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sessão iniciada', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, novo: { type: 'boolean', description: 'true se o cliente foi criado agora' }, cliente: { $ref: '#/components/schemas/Cliente' } } } } } },
          400: { description: 'Telefone ou código inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Código incorreto/expirado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Terminar sessão',
        description: 'Limpa o cookie de sessão.',
        responses: {
          200: { description: 'Sessão terminada', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Cliente da sessão atual',
        description: 'Requer sessão válida (cookie httpOnly). Inclui `premium` (tier da Fase 3).',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Cliente autenticado', content: { 'application/json': { schema: { type: 'object', properties: { cliente: { allOf: [{ $ref: '#/components/schemas/Cliente' }, { type: 'object', properties: { premium: { type: 'boolean', example: false } } }] } } } } } },
          401: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Admin (autenticação do painel) ────────────────────────────────────────
    '/admin/login': {
      post: {
        tags: ['Admin'],
        summary: 'Iniciar sessão de administrador',
        description: 'Valida username + password e emite a sessão de admin no cookie httpOnly `eifoods_admin`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', format: 'password', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sessão de admin iniciada', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, admin: { $ref: '#/components/schemas/AdminUser' } } } } } },
          400: { description: 'Campos em falta', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Credenciais inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/admin/logout': {
      post: {
        tags: ['Admin'],
        summary: 'Terminar sessão de administrador',
        responses: {
          200: { description: 'Sessão terminada', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
        },
      },
    },

    '/admin/me': {
      get: {
        tags: ['Admin'],
        summary: 'Admin da sessão atual',
        security: [{ adminAuth: [] }],
        responses: {
          200: { description: 'Admin autenticado', content: { 'application/json': { schema: { type: 'object', properties: { admin: { $ref: '#/components/schemas/AdminUser' } } } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Streak ────────────────────────────────────────────────────────────────
    '/streak/config': {
      get: {
        tags: ['Streak'],
        summary: 'Escada de recompensas (pública)',
        responses: {
          200: { description: 'Configuração de streak', content: { 'application/json': { schema: { $ref: '#/components/schemas/StreakConfig' } } } },
        },
      },
      put: {
        tags: ['Streak'],
        summary: 'Substituir a escada de recompensas (admin)',
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['tiers'], properties: { tiers: { type: 'array', items: { $ref: '#/components/schemas/StreakTier' } } } },
            },
          },
        },
        responses: {
          200: { description: 'Configuração atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/StreakConfig' } } } },
          400: { description: 'Escalões inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/streak/config/reset': {
      post: {
        tags: ['Streak'],
        summary: 'Repor a escada para os valores por omissão (admin)',
        security: [{ adminAuth: [] }],
        responses: {
          200: { description: 'Configuração reposta', content: { 'application/json': { schema: { $ref: '#/components/schemas/StreakConfig' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/streak/me': {
      get: {
        tags: ['Streak'],
        summary: 'Estado de streak do cliente da sessão',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Estado de streak + desconto atual e próxima recompensa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    streakAtual: { type: 'integer', example: 7 },
                    maiorStreak: { type: 'integer', example: 12 },
                    ultimoDiaPedido: { type: 'string', nullable: true, example: '2026-08-14' },
                    descontoAtual: { type: 'number', example: 11 },
                    proximaRecompensa: { oneOf: [{ $ref: '#/components/schemas/StreakTier' }, { type: 'null' }] },
                    tiers: { type: 'array', items: { $ref: '#/components/schemas/StreakTier' } },
                    recompensasGanhas: { type: 'array', items: { $ref: '#/components/schemas/RecompensaGanha' } },
                  },
                },
              },
            },
          },
          401: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/streak/clientes': {
      get: {
        tags: ['Streak'],
        summary: 'Clientes ordenados por streak (admin)',
        security: [{ adminAuth: [] }],
        responses: {
          200: { description: 'Lista de clientes por sequência', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ClienteStreak' } } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Planos ────────────────────────────────────────────────────────────────
    '/planos': {
      get: {
        tags: ['Planos'],
        summary: 'Listar planos',
        description: 'Por omissão devolve apenas os ativos; `?todos=1` inclui inativos (admin).',
        parameters: [{ name: 'todos', in: 'query', schema: { type: 'string', example: '1' }, description: 'todos=1 inclui planos inativos' }],
        responses: {
          200: { description: 'Lista de planos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plano' } } } } },
        },
      },
      post: {
        tags: ['Planos'],
        summary: 'Criar plano (admin)',
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'tipo', 'numRefeicoes', 'preco', 'validadeDias'],
                properties: {
                  nome: { type: 'string', example: 'Plano Semanal' },
                  tipo: { type: 'string', enum: ['semanal', 'bissemanal', 'mensal'] },
                  numRefeicoes: { type: 'integer', example: 5 },
                  preco: { type: 'number', example: 1100 },
                  validadeDias: { type: 'integer', example: 7 },
                  premium: { type: 'boolean', default: false },
                  descricao: { type: 'string' },
                  ativo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Plano criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plano' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/planos/{id}': {
      get: {
        tags: ['Planos'],
        summary: 'Obter plano por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Plano encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plano' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Planos'],
        summary: 'Atualizar plano (admin)',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Plano' } } },
        },
        responses: {
          200: { description: 'Plano atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plano' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Planos'],
        summary: 'Desativar plano (admin, soft-delete)',
        description: 'Marca `ativo: false` para não afetar subscrições históricas.',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Plano desativado', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, plano: { $ref: '#/components/schemas/Plano' } } } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Subscrições ───────────────────────────────────────────────────────────
    '/subscricoes': {
      post: {
        tags: ['Subscrições'],
        summary: 'Comprar plano (cria subscrição pendente)',
        description: 'Envia `multipart/form-data` com `planoId` e o ficheiro `comprovativo`. Fica em `pendente_pagamento` até o admin confirmar.',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['planoId'],
                properties: {
                  planoId: { type: 'string' },
                  comprovativo: { type: 'string', format: 'binary', description: 'Comprovativo de pagamento (imagem)' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Subscrição criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscricao' } } } },
          400: { description: 'planoId em falta', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Plano indisponível', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Subscrições'],
        summary: 'Listar subscrições (admin)',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendente_pagamento', 'ativa', 'expirada', 'rejeitada'] }, description: 'Filtrar por estado' }],
        responses: {
          200: { description: 'Lista de subscrições (cliente e plano populados)', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscricao' } } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/subscricoes/me': {
      get: {
        tags: ['Subscrições'],
        summary: 'Subscrições do cliente da sessão',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Subscrições do cliente', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscricao' } } } } },
          401: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/subscricoes/{id}/comprovativo': {
      post: {
        tags: ['Subscrições'],
        summary: '(Re)enviar comprovativo de uma subscrição pendente do próprio cliente',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', required: ['comprovativo'], properties: { comprovativo: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: {
          200: { description: 'Comprovativo atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscricao' } } } },
          400: { description: 'Ficheiro em falta', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Subscrição não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Subscrição já não está pendente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/subscricoes/{id}/confirmar': {
      patch: {
        tags: ['Subscrições'],
        summary: 'Confirmar pagamento e ativar subscrição (admin)',
        description: 'Credita `numRefeicoes` e define a janela de validade a partir de agora.',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { notaAdmin: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Subscrição ativada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscricao' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Só subscrições pendentes podem ser confirmadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/subscricoes/{id}/rejeitar': {
      patch: {
        tags: ['Subscrições'],
        summary: 'Rejeitar subscrição pendente (admin)',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { notaAdmin: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Subscrição rejeitada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscricao' } } } },
          401: { description: 'Não autenticado (admin)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Só subscrições pendentes podem ser rejeitadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
}

export default spec
