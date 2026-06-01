# Antonio Dias - Contador dos Imigrantes

Site institucional de **Antonio Dias**, contador brasileiro especializado em atender brasileiros vivendo no exterior. SPA estática, single-page, bilíngue (PT/EN), 100% online. CTAs principais vão para WhatsApp; possui também um **assistente virtual IA** (Gemini) integrado via Supabase Edge Functions para captura de leads e atendimento inicial.

- **Produção:** https://antoniodiascontador.com/
- **WhatsApp oficial:** `+1 599 770 5571` (no código aparece como `15997705571`)
- **Instagram:** [@contabilizando_no_exterior](https://www.instagram.com/contabilizando_no_exterior/)

---

## Stack & comandos

- **Vite 7** + **React 18** + **TypeScript 5.8**
- **Tailwind CSS 3.4** + **shadcn/ui** (componentes Radix em [src/components/ui/](src/components/ui/))
- **react-router-dom v6** (rotas: `/`, `/admin/*`, `*` → 404)
- `@tanstack/react-query` (instalado, mas o site não faz fetch — está aí caso seja necessário)
- Alias de import: `@/*` → `src/*`

Scripts ([package.json](package.json)):

```bash
npm run dev        # dev server na porta 8080
npm run build      # build de produção
npm run build:dev  # build em modo development
npm run lint       # eslint
npm run preview    # preview do build
```

---

## Arquitetura

A homepage é montada em [src/pages/Index.tsx](src/pages/Index.tsx) compondo seções em ordem fixa dentro de um `LanguageProvider`:

```
Header → Hero → About → Services → Who → Why → CTA → Footer
                                                    + WhatsAppFloating
```

Reordenar/adicionar/remover seções é feito **só** nesse arquivo.

---

## Mapa de arquivos críticos

| Arquivo | Para que serve |
|---|---|
| [src/pages/Index.tsx](src/pages/Index.tsx) | Composição da homepage (ordem das seções) |
| [src/contexts/LanguageContext.tsx](src/contexts/LanguageContext.tsx) | **Todos os textos PT/EN do site** — editar aqui, não nos componentes |
| [src/components/Header.tsx](src/components/Header.tsx) | Nav, toggle PT/EN, CTA WhatsApp, menu mobile |
| [src/components/HeroSection.tsx](src/components/HeroSection.tsx) | Headline principal + CTA — conteúdo centralizado no desktop (sem padding assimétrico) |
| [src/components/AboutSection.tsx](src/components/AboutSection.tsx) | Bio, foto (`/antonio-dias.jpg`), stats (10+ anos, 500+ clientes, 20+ países) |
| [src/components/ServicesSection.tsx](src/components/ServicesSection.tsx) | 4 cards de serviços |
| [src/components/WhoSection.tsx](src/components/WhoSection.tsx) | 6 personas-alvo |
| [src/components/WhySection.tsx](src/components/WhySection.tsx) | 6 diferenciais |
| [src/components/CTASection.tsx](src/components/CTASection.tsx) | Chamada final (âncora `#contact`) |
| [src/components/Footer.tsx](src/components/Footer.tsx) | Links sociais + copyright |
| [src/components/WhatsAppFloating.tsx](src/components/WhatsAppFloating.tsx) | Botão flutuante (aparece após 300px de scroll) |
| [index.html](index.html) | Meta tags SEO + Open Graph + Twitter Card + JSON-LD + bloco H1/nav oculto |
| [public/robots.txt](public/robots.txt) | Permite todos crawlers + aponta sitemap |
| [public/sitemap.xml](public/sitemap.xml) | Single URL com hreflang pt-BR/en |
| [tailwind.config.ts](tailwind.config.ts) | Paleta gold/navy + animações customizadas |
| [vite.config.ts](vite.config.ts) | Porta 8080, alias `@`, plugin lovable-tagger em dev |
| [src/App.tsx](src/App.tsx) | Rotas globais: `/` (site), `/admin/*` (CRM), `*` (404) |
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) | Sessão Supabase Auth para o painel admin |
| [src/pages/admin/Login.tsx](src/pages/admin/Login.tsx) | Login do painel (`/admin/login`) |
| [src/pages/admin/Layout.tsx](src/pages/admin/Layout.tsx) | Sidebar + `AdminGuard` (redireciona se não autenticado) |
| [src/pages/admin/Dashboard.tsx](src/pages/admin/Dashboard.tsx) | Métricas: total/status de leads, lista recente |
| [src/pages/admin/Leads.tsx](src/pages/admin/Leads.tsx) | Lista de leads + histórico de conversa no painel lateral |
| [src/pages/admin/BaseConhecimento.tsx](src/pages/admin/BaseConhecimento.tsx) | CRUD de artigos da base RAG + botão gerar embedding por artigo |
| [src/pages/admin/Configuracoes.tsx](src/pages/admin/Configuracoes.tsx) | Edição de API keys, seletor de provedor (Gemini/Groq/Anthropic) e model picker |
| [supabase/functions/gerar-embedding/index.ts](supabase/functions/gerar-embedding/index.ts) | Edge Function — gera embedding Gemini para artigo da base de conhecimento |

---

## Painel Admin CRM (`/admin`)

Protegido por Supabase Auth. Acesso via `/admin/login`.

**Credenciais padrão:** manter fora do repositório e consultar apenas no cofre interno/equipe responsável

**Estrutura de rotas:**
```
/admin/login         → AdminLogin (página pública)
/admin               → AdminGuard → AdminLayout → AdminDashboard
/admin/leads         → AdminGuard → AdminLayout → AdminLeads
/admin/conhecimento  → AdminGuard → AdminLayout → AdminBaseConhecimento
/admin/configuracoes → AdminGuard → AdminLayout → AdminConfiguracoes
```

**Status de lead** (campo `status` na tabela `leads`):
- `novo` — lead recém-capturado
- `em_contato` — Antonio já abordou
- `fechado` — negócio concluído

Status é editável inline na página de Leads (dropdown no painel lateral).

---

## Assistente Virtual IA (Chat Widget)

**Arquitetura:**
```
ChatWidget (React) → Supabase Edge Function /chat → Gemini API
                                                  → tabelas Supabase (sessoes, mensagens, leads)
                                                  → Evolution API → WhatsApp Antonio
```

| Arquivo/Recurso | Função |
|---|---|
| [src/components/ChatWidget.tsx](src/components/ChatWidget.tsx) | Botão flutuante (bottom-left) + janela de chat |
| [supabase/functions/chat/index.ts](supabase/functions/chat/index.ts) | Edge Function — orquestra Gemini, RAG, salva lead, notifica Antonio |
| Supabase Project ID | `qtxtvmgpxgnjtrrukggn` |
| Edge Function URL | `https://qtxtvmgpxgnjtrrukggn.supabase.co/functions/v1/chat` |

**Tabelas Supabase (todas em português):**

| Tabela | Uso |
|---|---|
| `sessoes` | Cada conversa (status: ativa/encerrada) |
| `mensagens` | Histórico de mensagens (papel: usuario/assistente) |
| `leads` | CRM — leads capturados (nome, contato, assunto, resumo, status) |
| `base_conhecimento` | Base RAG com embeddings Gemini (vector 768d) |
| `configuracoes` | API keys e configs (gemini_api_key, evolution_api_url, etc.) |

**Chaves de configuração em `configuracoes`:**
- `provedor_ia` — `gemini` | `groq` | `anthropic` (default: `gemini`)
- `modelo_ia` — nome do modelo (ex: `gemini-1.5-flash`, `llama-3.3-70b-versatile`, `claude-haiku-4-5-20251001`)
- `gemini_api_key` — **sempre obrigatória** (usada para embeddings RAG mesmo quando outro provedor é o chat LLM)
- `groq_api_key` — Groq API key (console.groq.com — gratuito)
- `anthropic_api_key` — Anthropic API key (console.anthropic.com)
- `evolution_api_url`, `evolution_instance`, `evolution_api_token` — notificação WhatsApp via Evolution API
- `whatsapp_antonio` — número que recebe leads (ex: `5511999998888`)
- `system_prompt` — comportamento do assistente
- `nome_assistente` — nome exibido no widget

**Edge Functions ativas:**
| Função | Endpoint | Descrição |
|---|---|---|
| `chat` | `/functions/v1/chat` | Chat principal — multi-provedor, RAG, salva lead, notifica WhatsApp |
| `gerar-embedding` | `/functions/v1/gerar-embedding` | Gera embedding Gemini para artigo da base de conhecimento |

**Re-deploy após mudanças nas Edge Functions — usar Supabase CLI (Management API causa BOOT_ERROR):**
```bash
# Requer npx (sem Docker)
npx supabase@latest functions deploy chat --project-ref qtxtvmgpxgnjtrrukggn --no-verify-jwt
npx supabase@latest functions deploy gerar-embedding --project-ref qtxtvmgpxgnjtrrukggn
```

O token de acesso (`sbp_...`) fica em `.claude/settings.json` como `SUPABASE_ACCESS_TOKEN`.
A Management API (`PATCH /functions/{slug}`) retorna 200 mas gera BOOT_ERROR — não usar para deploy de código.

Observação: o chat público do site depende das proteções aplicadas dentro da Edge Function, como validação de origem e rate limit.

---

Os 4 serviços oferecidos (devem estar consistentes entre `ServicesSection.tsx`, JSON-LD em `index.html` e bloco SEO oculto):

1. Saída Fiscal Definitiva
2. Declaração de Imposto de Renda (DIRPF)
3. Imigração e Planejamento Fiscal
4. Planejamento Sucessório e Patrimonial

---

## Identidade visual

- **Dark mode permanente** (classe `dark` sempre ativa)
- **Cores da marca** (definidas em `tailwind.config.ts`):
  - `gold` primary: `#9C7C4C` (≈ `hsl(44 37% 59%)`)
  - `navy` background: `#0F1B2E` (≈ `hsl(222 47% 6%)`)
- **Fontes:** Playfair Display (display/serifa) + Inter (corpo) — via Google Fonts

---

## Playbook: como editar coisas comuns

| Tarefa | Onde mexer |
|---|---|
| **Trocar qualquer texto visível** | [src/contexts/LanguageContext.tsx](src/contexts/LanguageContext.tsx) — adicionar/editar a chave em **PT e EN** (nunca hardcode texto nos componentes) |
| **Trocar número do WhatsApp** | Grep por `15997705571` em todo o projeto. Aparece em: `Header.tsx`, `HeroSection.tsx`, `CTASection.tsx`, `Footer.tsx`, `WhatsAppFloating.tsx`, `index.html` (JSON-LD `telephone` × 2 e bloco SEO oculto) |
| **Trocar @ do Instagram** | `Footer.tsx` (linha do `href`) + `index.html` (JSON-LD `sameAs` + bloco SEO oculto) |
| **Adicionar/remover/renomear serviço** | `ServicesSection.tsx` + `LanguageContext.tsx` (textos) + JSON-LD `hasOfferCatalog` em `index.html` + bloco SEO oculto em `index.html` |
| **Trocar foto/imagens** | Substituir em [public/](public/): `antonio-dias.jpg`, `hero-bg.jpg`, `og-image.png` (mantenha 1200×630 para OG) |
| **Mudar title/description/keywords (SEO)** | `index.html` — não esquecer de atualizar também OG (`og:title`, `og:description`), Twitter Card e o JSON-LD |
| **Mudar cores da marca** | `tailwind.config.ts` — tokens `gold` e `navy` |
| **Reordenar seções da home** | `src/pages/Index.tsx` |
| **Atualizar sitemap** | `public/sitemap.xml` — campo `<lastmod>` |

---

## Convenções & cuidados

- **`index.html` deve ser UTF-8 sem BOM.** Já foi corrigido em commit anterior — não reintroduzir BOM ao editar no Windows (PowerShell `Set-Content` adiciona BOM; usar o Write tool ou `Out-File -Encoding utf8NoBOM`).
- **Bloco `<div aria-hidden="true">` no final do `<body>`** ([index.html:85-113](index.html#L85-L113)) é proposital — contém H1 estático, `<nav>` e `<main>` invisíveis ao usuário mas indexáveis. **Não remover.** Foi adicionado em commit recente justamente para SEO.
- **Site é dark-mode-only** — não criar variantes light.
- **Sem formulário de contato.** Todo CTA → WhatsApp com mensagem pré-preenchida: `"Olá! Vim pelo site e gostaria de uma análise da minha situação fiscal. Sou brasileiro(a) morando no exterior."`
- **Componentes em [src/components/ui/](src/components/ui/)** são shadcn/ui (primitivos Radix) — não editar diretamente, criar componentes próprios em `src/components/` se precisar de variantes.
- **Texto novo sempre bilíngue:** adicionar a chave em PT e EN no `LanguageContext` antes de referenciar com `t('chave')`.
- **Charset/encoding:** o site é em português com acentos. Sempre verificar que arquivos editados (especialmente `index.html`) ficam em UTF-8.

---

## Verificação após mudanças

1. `npm run dev` (porta 8080) — abrir no browser e validar visualmente as seções alteradas (golden path + responsivo mobile)
2. Alternar idioma PT ↔ EN no toggle do header — confirmar que textos novos aparecem nos dois idiomas
3. `npm run build` — garantir que o TypeScript compila sem erros
4. `npm run lint`
5. Para mudanças de SEO: validar `index.html` no [Rich Results Test do Google](https://search.google.com/test/rich-results) (manual, fora do build)
6. Se mexeu em `index.html`: confirmar que o arquivo continua **sem BOM** (`file index.html` deve dizer "UTF-8 Unicode text", não "UTF-8 Unicode (with BOM) text")
