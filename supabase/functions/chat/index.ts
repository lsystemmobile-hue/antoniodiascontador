import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = "https://antoniodiascontador.com";
const PRIMARY_SITE_HOST = "antoniodiascontador.com";
const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const START_MESSAGE = "__inicio__";
const MAX_MESSAGE_LENGTH = 2000;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_INITIAL_MESSAGE_PT =
  "Ola! Sou o assistente virtual do Antonio Dias. Para comecar, me envie seu nome e seu WhatsApp.";
const DEFAULT_INITIAL_MESSAGE_EN =
  "Hello! I am Antonio Dias' virtual assistant. To get started, please send your name and your WhatsApp number.";
const LEGACY_INITIAL_MESSAGE_PT =
  "Ola! Sou o assistente virtual do Antonio Dias. Para comecar, qual e seu nome e seu contato de WhatsApp?";
const LEGACY_INITIAL_MESSAGE_EN =
  "Hello! I am Antonio Dias' virtual assistant. To get started, what is your name and your WhatsApp number?";

type ConfigRow = { chave: string; valor: string | null };
type LeadRow = {
  id?: string;
  nome?: string | null;
  contato?: string | null;
  assunto?: string | null;
  resumo?: string | null;
  notificado_em?: string | null;
  notificacao_assunto_enviado?: string | null;
  notificacao_resumo_enviado?: string | null;
};
type Provider = "gemini" | "groq" | "anthropic";
type KnowledgeRow = { titulo?: string | null; conteudo?: string | null; categoria?: string | null };

type ChatHistoryMessage = {
  papel?: string | null;
  conteudo?: string | null;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function clean(value?: string | null) {
  return (value || "").toString().trim();
}

function defaultModel(provider: Provider) {
  if (provider === "groq") return "llama-3.3-70b-versatile";
  if (provider === "anthropic") return "claude-haiku-4-5-20251001";
  return "gemini-1.5-flash";
}

function resolveModel(configured: string, provider: Provider) {
  if (!configured) return defaultModel(provider);
  if (provider === "gemini" && configured.startsWith("gemini")) return configured;
  if (provider === "groq" && !configured.startsWith("gemini") && !configured.startsWith("claude")) return configured;
  if (provider === "anthropic" && configured.startsWith("claude")) return configured;
  return defaultModel(provider);
}

function pickVariation(seed: string, variants: string[]) {
  if (variants.length === 0) return "";

  const normalized = seed || "default";
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return variants[hash % variants.length];
}

function resolveOrigin(req: Request) {
  return req.headers.get("origin")?.replace(/\/$/, "") || null;
}

function isLocalDevOrigin(origin: string | null) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return (LOCAL_DEV_HOSTS.has(url.hostname) || isPrivateNetworkHost(url.hostname)) &&
      (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function isPrivateNetworkHost(hostname: string) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    const parts = hostname.split(".").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

    const [a, b] = parts;
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  }

  return false;
}

function isTrustedSiteOrigin(origin: string | null) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      (url.hostname === PRIMARY_SITE_HOST || url.hostname.endsWith(`.${PRIMARY_SITE_HOST}`));
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | null) {
  return !origin || isTrustedSiteOrigin(origin) || isLocalDevOrigin(origin);
}

function corsHeaders(req: Request) {
  const origin = resolveOrigin(req);
  return {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function assertAllowedOrigin(req: Request) {
  const origin = resolveOrigin(req);
  if (!isAllowedOrigin(origin)) throw new HttpError(403, "Origem nao autorizada.");
}

function prefersEnglish(req: Request) {
  const language = req.headers.get("accept-language") || "";
  return language.toLowerCase().includes("en");
}

function shouldUseEnglish(req: Request, languageOverride?: string | null) {
  const normalized = clean(languageOverride).toLowerCase();
  if (normalized === "en") return true;
  if (normalized === "pt") return false;
  return prefersEnglish(req);
}

function onlyDigits(value?: string | null) {
  return clean(value).replace(/\D/g, "");
}

function normalizeContact(value?: string | null) {
  const contact = clean(value);
  if (!contact) return "";

  const emailMatch = contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) return emailMatch[0];

  const phoneDigits = onlyDigits(contact);
  return phoneDigits.length >= 8 ? phoneDigits : contact;
}

function trimSlash(value?: string | null) {
  return clean(value).replace(/\/+$/, "");
}

function hasWhatsAppContact(value?: string | null) {
  const contact = clean(value);
  if (!contact || contact.includes("@")) return false;
  return onlyDigits(contact).length >= 8;
}

function extractName(text: string) {
  const patterns = [
    /(?:meu nome e|meu nome eh|meu nome é|nome e|nome eh|nome é|me chamo|sou o|sou a)\s+([\p{L}' -]{2,80})/iu,
    /(?:my name is|this is|i am)\s+([\p{L}' -]{2,80})/iu,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1].replace(/[.,;:!?]+$/, ""));
  }

  const candidate = clean(text.replace(/[.,;:!?]+$/g, ""));
  if (looksLikeStandaloneName(candidate)) return candidate;

  return "";
}

function extractExplicitNameOnly(text: string) {
  const patterns = [
    /(?:meu nome e|meu nome eh|meu nome Ã©|nome e|nome eh|nome Ã©|me chamo|sou o|sou a)\s+([\p{L}' -]{2,80})/iu,
    /(?:my name is|this is|i am)\s+([\p{L}' -]{2,80})/iu,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1].replace(/[.,;:!?]+$/, ""));
  }

  return "";
}

function extractContact(text: string) {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch?.[0]) return emailMatch[0];

  const phoneMatch = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  if (phoneMatch?.[0]) return normalizeContact(phoneMatch[0]);

  return "";
}

function inferNameFromMessages(messages: ChatHistoryMessage[]) {
  for (const message of messages) {
    if (message.papel !== "usuario") continue;
    const name = extractName(clean(message.conteudo));
    if (name) return name;
  }

  return "";
}

function inferContactFromMessages(messages: ChatHistoryMessage[]) {
  for (const message of messages) {
    if (message.papel !== "usuario") continue;
    const contact = extractContact(clean(message.conteudo));
    if (contact) return contact;
  }

  return "";
}

function inferAssunto(text: string) {
  const normalized = normalizeForSearch(text);
  if (
    normalized.includes("saida fiscal") ||
    normalized.includes("fiscal definitiva") ||
    normalized.includes("tax exit")
  ) return "Saida Fiscal Definitiva";

  if (
    normalized.includes("dirpf") ||
    normalized.includes("imposto de renda") ||
    normalized.includes("income tax") ||
    normalized.includes("tax return") ||
    normalized.includes("ir ")
  ) {
    return "Declaracao de Imposto de Renda (DIRPF)";
  }

  if (normalized.includes("sucess") || normalized.includes("estate") || normalized.includes("patrimonial")) {
    return "Planejamento Sucessorio e Patrimonial";
  }

  if (normalized.includes("imigr") || normalized.includes("planning") || normalized.includes("tribut")) {
    return "Imigracao e Planejamento Fiscal";
  }

  return "Atendimento pelo site";
}

function assuntoLabel(assunto: string, req: Request, languageOverride?: string | null) {
  const useEnglish = shouldUseEnglish(req, languageOverride);

  switch (assunto) {
    case "Saida Fiscal Definitiva":
      return useEnglish ? "definitive tax exit" : "saida fiscal definitiva";
    case "Declaracao de Imposto de Renda (DIRPF)":
      return useEnglish ? "income tax filing" : "declaracao de imposto de renda";
    case "Planejamento Sucessorio e Patrimonial":
      return useEnglish ? "estate and wealth planning" : "planejamento sucessorio e patrimonial";
    case "Imigracao e Planejamento Fiscal":
      return useEnglish ? "immigration and tax planning" : "imigracao e planejamento fiscal";
    default:
      return useEnglish ? "your case" : "seu caso";
  }
}

function normalizeForSearch(text: string) {
  return clean(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function looksLikeStandaloneName(text: string) {
  if (!/^[\p{L}][\p{L}' -]{1,40}$/u.test(text)) return false;

  const normalized = normalizeForSearch(text);
  if (normalized.includes("whatsapp") || normalized.includes("saida") || normalized.includes("imposto")) return false;
  if (/\b(quero|preciso|duvida|informacao|ajuda|contato|telefone|numero|name|help|info|question)\b/.test(normalized)) {
    return false;
  }

  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= 3;
}

function isInfoOnlyMessage(text: string) {
  const normalized = normalizeForSearch(text);

  return [
    "so quero informacao",
    "so quero informacoes",
    "quero saber",
    "tirar duvida",
    "so isso",
    "apenas informacao",
    "only want information",
    "just want information",
    "just information",
  ].some((snippet) => normalized.includes(snippet));
}

function isRefusingDataShare(text: string) {
  const normalized = normalizeForSearch(text);
  const compact = clean(text).toLowerCase();

  if ((/n.o quero/.test(compact) || normalized.includes("nao quero")) && (
    /dados|whatsapp|enviar|passar|informar/.test(compact) ||
    ["dados", "whatsapp", "enviar", "passar", "informar"].some((snippet) => normalized.includes(snippet))
  )) {
    return true;
  }

  return [
    "nao quero enviar",
    "nao quero enviar meus dados",
    "nao quero passar",
    "nao quero passar meus dados",
    "nao quero informar",
    "nao quero informar meus dados",
    "nao quero enviar meu whatsapp",
    "nao quero passar meu whatsapp",
    "nao quero informar meu whatsapp",
    "prefiro nao informar",
    "i dont want to share my details",
    "i do not want to share my details",
    "i dont want to send my whatsapp",
    "i do not want to send my whatsapp",
  ].some((snippet) => normalized.includes(snippet));
}

function isShortNameLikeMessage(text: string) {
  const cleanText = clean(text);
  if (!cleanText) return false;
  if (!/^[\p{L}' -]{2,40}$/u.test(cleanText)) return false;

  const normalized = normalizeForSearch(cleanText);
  if (/\b(valor|saida|fiscal|imposto|duvida|urgente|pais|whatsapp|contato)\b/.test(normalized)) {
    return false;
  }

  return cleanText.split(/\s+/).length <= 3;
}

function isContactOnlyMessage(text: string) {
  const cleanText = clean(text);
  if (!cleanText) return false;
  if (cleanText.includes("@")) return true;

  const digits = onlyDigits(cleanText);
  const residue = cleanText.replace(/[+\d\s().-]/g, "");
  return digits.length >= 8 && residue.length === 0;
}

function isSmallTalkOnlyMessage(text: string) {
  const normalized = normalizeForSearch(text);
  return [
    "obrigado",
    "obrigada",
    "valeu",
    "tmj",
    "tamo junto",
    "kkk",
    "haha",
    "ahah",
    "show",
    "blz",
    "beleza",
  ].some((snippet) => normalized === snippet || normalized.startsWith(`${snippet} `) || normalized.endsWith(` ${snippet}`));
}

function isGreetingOnlyMessage(text: string) {
  const normalized = normalizeForSearch(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return /^(oi|ola|hello|hi|hey|opa|bom dia|boa tarde|boa noite|tudo bem|como vai|como voce esta)( (oi|ola|hello|hi|hey|opa|bom dia|boa tarde|boa noite|tudo bem|como vai|como voce esta))*$/.test(normalized);
}

function getMeaningfulUserMessages(messages: ChatHistoryMessage[]) {
  return messages
    .filter((message) => message.papel === "usuario")
    .map((message) => clean(message.conteudo))
    .filter(Boolean)
    .filter((text) => text !== START_MESSAGE)
    .filter((text) => (
      !isShortNameLikeMessage(text) &&
      !isContactOnlyMessage(text) &&
      !isSmallTalkOnlyMessage(text) &&
      !isGreetingOnlyMessage(text)
    ));
}

function inferConversationAssunto(messages: ChatHistoryMessage[], fallbackText?: string) {
  const conversation = messages
    .filter((message) => message.papel === "usuario")
    .map((message) => clean(message.conteudo))
    .filter(Boolean)
    .join("\n");

  return inferAssunto(`${conversation}\n${clean(fallbackText)}`);
}

function summarizeMessages(messages: ChatHistoryMessage[]) {
  const userTexts = messages
    .filter((message) => message.papel === "usuario")
    .map((message) => clean(message.conteudo))
    .filter(Boolean)
    .filter((text) => text !== START_MESSAGE);

  const meaningfulTexts = userTexts.filter((text) => (
    !isShortNameLikeMessage(text) &&
    !isContactOnlyMessage(text) &&
    !isSmallTalkOnlyMessage(text)
  ));

  const sourceText = meaningfulTexts.join(" ").trim();
  if (!sourceText) return "Lead iniciado pelo chat do site.";

  const normalized = normalizeForSearch(sourceText);
  const assunto = inferAssunto(sourceText);
  const parts: string[] = [];

  if ([
    "valor",
    "preco",
    "orcamento",
    "quanto custa",
    "pagamento",
    "parcelado",
    "parcelamento",
    "prazo",
  ].some((snippet) => normalized.includes(snippet))) {
    parts.push(`Lead perguntou principalmente sobre valor de ${assunto}.`);
  } else {
    parts.push(truncateText(sourceText, 160));
  }

  if (/(nada urgente|sem urgencia|nao urgente)/.test(normalized)) {
    parts.push("Disse que nao ha urgencia imediata.");
  }

  return parts.join(" ").trim() || "Lead iniciado pelo chat do site.";
}

function truncateText(text: string, maxLength: number) {
  const value = clean(text);
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function hasNonAscii(text: string) {
  for (const char of text) {
    if (char.charCodeAt(0) > 127) return true;
  }

  return false;
}

function buildKnowledgeContext(rows: KnowledgeRow[], query: string, assunto: string) {
  const normalizedQuery = normalizeForSearch(`${query} ${assunto}`);
  const keywords = Array.from(new Set(
    normalizedQuery
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4),
  ));

  const scored = rows
    .map((row) => {
      const haystack = normalizeForSearch(`${clean(row.titulo)} ${clean(row.categoria)} ${clean(row.conteudo)}`);
      const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return "";

  return scored
    .map(({ row }) => `- ${clean(row.titulo) || "Base de conhecimento"}: ${truncateText(clean(row.conteudo), 450)}`)
    .join("\n");
}

function isGenericAssunto(assunto?: string | null) {
  return clean(assunto) === "Atendimento pelo site";
}

function buildLeadNotificationSummary(assunto: string, resumo: string) {
  const cleanSummary = clean(resumo);
  const genericAssunto = isGenericAssunto(assunto);

  if (!cleanSummary) {
    return genericAssunto
      ? "Lead iniciou conversa e deixou contato, mas ainda nao explicou a duvida principal."
      : "Lead iniciou conversa pelo chat do site.";
  }

  if (genericAssunto && cleanSummary === "Lead iniciado pelo chat do site.") {
    return "Lead iniciou conversa e deixou contato, mas ainda nao explicou a duvida principal.";
  }

  if (genericAssunto && cleanSummary === "Lead perguntou principalmente sobre valor de Atendimento pelo site.") {
    return "Lead perguntou sobre valor, mas ainda nao deixou claro qual servico quer tratar.";
  }

  return cleanSummary;
}

function buildLeadNotificationMessage(leadName: string, leadContact: string, assunto: string, resumo: string) {
  const firstName = clean(leadName).split(/\s+/)[0] || clean(leadName);
  const genericAssunto = isGenericAssunto(assunto);
  const notificationSummary = buildLeadNotificationSummary(assunto, resumo);
  const normalizedSubject = genericAssunto ? "Interesse ainda nao identificado" : clean(assunto) || "-";
  const lines = [
    "*Novo lead pelo site 🇧🇷*",
    "",
    `*Nome:* ${firstName || "-"}`,
    `*WhatsApp:* ${clean(leadContact) || "-"}`,
    `*Assunto:* ${normalizedSubject}`,
  ];

  if (notificationSummary) {
    lines.push("");
    lines.push(`*Resumo:* ${truncateText(notificationSummary, 500)}`);
  }

  if (genericAssunto) {
    lines.push("");
    lines.push("*Proximo passo:* confirmar qual servico ou duvida fiscal o lead quer tratar.");
  }

  lines.push("");
  lines.push(`*Recebido em:* ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  return lines.join("\n");
}

function assistantDisplayName(cfg: Record<string, string>) {
  return clean(cfg.nome_assistente) || "Assistente do Antonio Dias";
}

function buildInitialGreeting(req: Request, cfg: Record<string, string>, languageOverride?: string | null) {
  const customPt = clean(cfg.mensagem_inicial_pt);
  const customEn = clean(cfg.mensagem_inicial_en);
  const normalizedPt = normalizeForSearch(customPt);
  const normalizedEn = normalizeForSearch(customEn);
  const shouldIgnoreLegacyPt = normalizedPt === normalizeForSearch(LEGACY_INITIAL_MESSAGE_PT);
  const shouldIgnoreLegacyEn = normalizedEn === normalizeForSearch(LEGACY_INITIAL_MESSAGE_EN);

  if (shouldUseEnglish(req, languageOverride)) {
    if (customEn && !shouldIgnoreLegacyEn) return customEn;
    return DEFAULT_INITIAL_MESSAGE_EN;
  }

  if (customPt && !shouldIgnoreLegacyPt) return customPt;
  return DEFAULT_INITIAL_MESSAGE_PT;
}

function buildMissingIdentityReply(
  req: Request,
  hasName: boolean,
  hasWhatsapp: boolean,
  cfg: Record<string, string>,
  assunto: string,
  lastUserMessage?: string,
  variationSeed = "",
  languageOverride?: string | null,
) {
  const useEnglish = shouldUseEnglish(req, languageOverride);
  const topic = assuntoLabel(assunto, req, languageOverride);
  const infoOnly = isInfoOnlyMessage(lastUserMessage || "");
  const refusesData = isRefusingDataShare(lastUserMessage || "");

  if (!hasName && !hasWhatsapp) {
    if (refusesData) {
      return useEnglish
        ? `I understand. I ask for this because Antonio continues the conversation through WhatsApp when needed. If that's okay, start by telling me just your name.`
        : `Entendo. Eu peco isso porque, se necessario, o Antonio continua a conversa pelo WhatsApp. Se fizer sentido para voce, pode comecar me dizendo so seu nome.`;
    }

    if (useEnglish) {
      return infoOnly
        ? pickVariation(`${variationSeed}-en-info`, [
          `I understand. I can guide you on ${topic}. Before I get into it, tell me your name first.`,
          `Sure. I can help with ${topic}. To start here, tell me your name.`,
          `No problem. Before I explain ${topic}, tell me your name so I can continue with you here.`,
        ])
        : pickVariation(`${variationSeed}-en-topic`, [
          `I can help with ${topic}. First, tell me your name.`,
          `Sure, I can help with ${topic}. Start by telling me your name.`,
          `Let's do it. Before I get into ${topic}, tell me your name.`,
        ]);
    }

    return infoOnly
      ? pickVariation(`${variationSeed}-pt-info`, [
        `Entendi. Posso te orientar sobre ${topic}. Antes de entrar nisso, me diz seu nome.`,
        `Tudo bem. Eu consigo te ajudar com ${topic}. Para comecar por aqui, me fala seu nome.`,
        `Sem problema. Antes de te explicar sobre ${topic}, me diz seu nome.`,
      ])
      : pickVariation(`${variationSeed}-pt-topic`, [
        `Posso te ajudar com ${topic}. Primeiro, me diz seu nome.`,
        `Claro, eu consigo te orientar sobre ${topic}. Para comecar, me fala seu nome.`,
        `Consigo te ajudar com ${topic}. Antes de seguir, me diz seu nome.`,
      ]);
  }

  if (!hasName) {
    if (refusesData) {
      return useEnglish
        ? `I understand. To continue with ${topic} here, I still need your name first.`
        : `Entendo. Para seguir com ${topic} por aqui, eu ainda preciso do seu nome primeiro.`;
    }

    return useEnglish
      ? pickVariation(`${variationSeed}-en-name`, [
        `Before I continue, tell me your name.`,
        `I just need your name first.`,
        `Tell me your name so I can continue here with you.`,
      ])
      : pickVariation(`${variationSeed}-pt-name`, [
        `Antes de continuar, me diz seu nome.`,
        `Eu so preciso primeiro do seu nome.`,
        `Me fala seu nome para eu seguir com voce por aqui.`,
      ]);
  }

  if (!hasWhatsapp) {
    if (refusesData) {
      return useEnglish
        ? `I still need your WhatsApp number because Antonio uses it to continue the conversation when needed.`
        : `Eu ainda preciso do seu WhatsApp, porque e por ele que o Antonio continua a conversa quando necessario.`;
    }

    return useEnglish
      ? pickVariation(`${variationSeed}-en-whatsapp`, [
        `Perfect. Now send me your WhatsApp number.`,
        `Thanks. I just need your WhatsApp now.`,
        `Great. Send me your WhatsApp and I will continue from here.`,
      ])
      : pickVariation(`${variationSeed}-pt-whatsapp`, [
        `Perfeito. Agora me passa seu WhatsApp.`,
        `Obrigado. So falta seu WhatsApp.`,
        `Boa. Me envia seu WhatsApp e eu sigo daqui.`,
      ]);
  }

  return useEnglish
    ? "Thanks. Now tell me briefly what you need help with."
    : "Perfeito. Agora me conta brevemente como eu posso te ajudar.";
}

function asksAboutPricing(text: string) {
  const normalized = normalizeForSearch(text);
  return [
    "valor",
    "preco",
    "orcamento",
    "quanto custa",
    "pagamento",
    "parcelado",
    "parcelamento",
    "prazo",
    "price",
    "cost",
    "budget",
    "payment",
    "delivery time",
  ].some((snippet) => normalized.includes(snippet));
}

function buildServiceReply(
  req: Request,
  leadName: string,
  assunto: string,
  lastUserMessage?: string,
  languageOverride?: string | null,
) {
  const useEnglish = shouldUseEnglish(req, languageOverride);
  const firstName = clean(leadName).split(/\s+/)[0] || leadName;
  const asksPricing = asksAboutPricing(lastUserMessage || "");

  if (asksPricing) {
    if (useEnglish) {
      return `For ${assunto}, the cash price is R$ 1.990,00. The installment price is R$ 2.200,00, with 50% upfront and 50% on delivery. The delivery time is 7 business days.`;
    }

    return `Para ${assunto}, o valor a vista e R$ 1.990,00. No parcelado, fica R$ 2.200,00, com 50% de entrada e 50% na entrega. O prazo de entrega e de 7 dias uteis.`;
  }

  if (useEnglish) {
    return `Thanks, ${firstName}. I noted that your case is about "${assunto}". If you want, send me a short summary and the country where you live so Antonio can pick this up with more context.`;
  }

  return `Obrigado, ${firstName}. Anotei que seu caso e sobre "${assunto}". Se quiser, me envie um breve resumo e o pais onde voce mora para o Antonio receber isso com mais contexto.`;
}

function buildIdentityCaptureSystemPrompt(
  req: Request,
  assunto: string,
  hasName: boolean,
  hasWhatsapp: boolean,
  languageOverride?: string | null,
) {
  const useEnglish = shouldUseEnglish(req, languageOverride);
  const topic = assuntoLabel(assunto, req, languageOverride);
  const missing = [
    hasName ? "" : (useEnglish ? "name" : "nome"),
    hasWhatsapp ? "" : (useEnglish ? "WhatsApp number" : "WhatsApp"),
  ].filter(Boolean).join(useEnglish ? " and " : " e ");
  const requestStep = !hasName
    ? (useEnglish ? "Ask only for the name now." : "Peca apenas o nome agora.")
    : (useEnglish ? "Ask only for the WhatsApp number now." : "Peca apenas o WhatsApp agora.");

  if (useEnglish) {
    return [
      "You are Antonio Dias' assistant for Brazilian clients living abroad.",
      "Your tone must sound human, calm, and concise. Never sound like a scripted chatbot, a lead form, or a generic support bot.",
      "Acknowledge the user's intent briefly, but do not provide the substantive tax answer yet.",
      `Your current goal is to collect the missing data: ${missing}.`,
      `The topic is: ${topic}.`,
      requestStep,
      "Reply in English only if the requested language is English; otherwise reply in Portuguese.",
      "Use at most 2 short sentences and ask only one focused question in this turn.",
      "Do not use bullet points.",
      "Do not greet again.",
      "If the user resists sharing data, explain the reason briefly and reduce friction instead of repeating the same request.",
      "Never say the required data is optional and never offer to continue without it.",
      "Avoid bureaucratic wording like register your service, start your service, continue your service request, or similar phrases.",
      "Speak like a real concierge on WhatsApp.",
      "If both name and WhatsApp are missing, ask for the name first. Only ask for WhatsApp after the name is captured.",
      "If the name is already known, never ask for the name again.",
    ].join(" ");
  }

  return [
    "Voce e o assistente do Antonio Dias para brasileiros que vivem no exterior.",
    "Seu tom deve soar humano, calmo e objetivo. Nunca pareca um chatbot engessado, um formulario ou um robo de suporte generico.",
    "Reconheca brevemente a intencao da pessoa, mas ainda nao entregue a resposta tecnica principal.",
    `Seu objetivo agora e coletar os dados que faltam: ${missing}.`,
    `O assunto da conversa e: ${topic}.`,
    requestStep,
    "Responda em portugues.",
    "Use no maximo 2 frases curtas e faca apenas uma pergunta por vez.",
    "Nao use bullets.",
    "Nao cumprimente de novo.",
    "Se a pessoa resistir em compartilhar dados, explique o motivo de forma breve e reduza a friccao em vez de repetir o mesmo pedido.",
    "Nunca diga que esses dados sao opcionais e nunca ofereca continuar sem eles.",
    "Evite frases burocraticas como registrar atendimento, iniciar atendimento, dar seguimento ao atendimento ou similares.",
    "Soe como uma pessoa real atendendo pelo WhatsApp.",
    "Se faltarem nome e WhatsApp, peca primeiro o nome. So peca o WhatsApp depois que o nome estiver claro.",
    "Se o nome ja estiver identificado, nunca volte a pedir o nome.",
  ].join(" ");
}

function buildGeneralAssistantSystemPrompt(
  req: Request,
  cfg: Record<string, string>,
  assunto: string,
  leadName: string,
  leadContact: string,
  knowledgeContext: string,
  languageOverride?: string | null,
) {
  const useEnglish = shouldUseEnglish(req, languageOverride);
  const adminPrompt = clean(cfg.system_prompt);
  const topic = assuntoLabel(assunto, req, languageOverride);
  const firstName = clean(leadName).split(/\s+/)[0] || clean(leadName);
  const contact = clean(leadContact);

  const operationalRules = useEnglish
    ? [
      "Operational rules for this conversation:",
      `- The visitor has already provided name (${firstName}) and WhatsApp (${contact}).`,
      "- Do not ask again for name or WhatsApp unless the visitor explicitly wants to change them.",
      `- Current topic: ${topic}.`,
      "- Follow the admin system prompt below as the main behavior source.",
      "- Keep replies natural, direct, and useful.",
      "- Use at most 3 short sentences unless the visitor asks for more detail.",
      "- Ask at most one follow-up question when it helps move the conversation forward.",
      "- If the visitor asks about value, price, budget, payment, parceling, or delivery time, answer directly with the exact information available in the admin instructions.",
      knowledgeContext ? `Relevant knowledge base snippets:\n${knowledgeContext}` : "",
    ].filter(Boolean).join("\n")
    : [
      "Regras operacionais desta conversa:",
      `- O visitante ja informou nome (${firstName}) e WhatsApp (${contact}).`,
      "- Nao volte a pedir nome nem WhatsApp, a menos que a pessoa queira corrigir esses dados.",
      `- Assunto atual: ${topic}.`,
      "- Siga o system prompt do admin abaixo como base principal de comportamento.",
      "- Responda de forma natural, objetiva e util.",
      "- Use no maximo 3 frases curtas por resposta, salvo se a pessoa pedir mais detalhes.",
      "- Faca no maximo uma pergunta de follow-up quando isso ajudar a avancar a conversa.",
      "- Se a pessoa perguntar sobre valor, preco, orcamento, pagamento, parcelamento ou prazo, responda diretamente com as informacoes exatas disponiveis nas instrucoes do admin.",
      knowledgeContext ? `Trechos relevantes da base de conhecimento:\n${knowledgeContext}` : "",
    ].filter(Boolean).join("\n");

  return [
    adminPrompt || (useEnglish
      ? "You are Antonio Dias' assistant for Brazilians living abroad."
      : "Voce e o assistente do Antonio Dias para brasileiros que vivem no exterior."),
    operationalRules,
  ].join("\n\n");
}

function isGeneralReplyValid(reply: string, languageOverride?: string | null) {
  const text = clean(reply);
  if (!text) return false;
  if (text.length > 1200) return false;

  const normalized = normalizeForSearch(text);
  const forbiddenSnippets = [
    "me envie seu nome",
    "me diga seu nome",
    "qual e seu nome",
    "me envie seu whatsapp",
    "me passe seu whatsapp",
    "qual e seu whatsapp",
    "send me your name",
    "what is your name",
    "send me your whatsapp",
    "whatsapp number",
  ];

  if (forbiddenSnippets.some((snippet) => normalized.includes(snippet))) return false;

  const useEnglish = clean(languageOverride).toLowerCase() === "en";
  if (useEnglish && hasNonAscii(text)) return false;

  return true;
}

function isIdentityCaptureReplyValid(
  reply: string,
  hasName: boolean,
  hasWhatsapp: boolean,
  languageOverride?: string | null,
) {
  const text = clean(reply);
  if (!text) return false;
  if (text.length > 280) return false;

  const normalized = normalizeForSearch(text);
  const sentenceCount = text
    .split(/[.!?]+/)
    .map((part) => clean(part))
    .filter(Boolean)
    .length;

  if (sentenceCount > 3) return false;

  const mentionsName = normalized.includes("nome") || normalized.includes("name");
  const mentionsWhatsapp = normalized.includes("whatsapp");

  if (!hasName && !mentionsName) return false;
  if (hasName && !hasWhatsapp && !mentionsWhatsapp) return false;
  if (!hasName && hasWhatsapp && !mentionsName) return false;

  const forbiddenSnippets = [
    "podemos continuar sem",
    "podemos seguir sem",
    "nao e necessario compartilhar",
    "nao precisa compartilhar",
    "if you prefer we can continue without",
    "you can continue without",
    "you do not need to share",
    "you dont need to share",
  ];

  if (forbiddenSnippets.some((snippet) => normalized.includes(snippet))) return false;

  const useEnglish = clean(languageOverride).toLowerCase() === "en";
  if (useEnglish && hasNonAscii(text)) return false;

  return true;
}

async function callGeminiText(
  key: string,
  model: string,
  system: string,
  history: ChatHistoryMessage[],
) {
  const contents = history
    .filter((message) => clean(message.conteudo))
    .map((message) => ({
      role: message.papel === "usuario" ? "user" : "model",
      parts: [{ text: clean(message.conteudo) }],
    }));

  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.5, maxOutputTokens: 120 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini: ${await response.text()}`);
  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part: { text?: string }) => part.text || "").join("").trim();
}

async function callGroqText(
  key: string,
  model: string,
  system: string,
  history: ChatHistoryMessage[],
) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        ...history
          .filter((message) => clean(message.conteudo))
          .map((message) => ({
            role: message.papel === "usuario" ? "user" : "assistant",
            content: clean(message.conteudo),
          })),
      ],
    }),
  });

  if (!response.ok) throw new Error(`Groq: ${await response.text()}`);
  const data = await response.json();
  return clean(data.choices?.[0]?.message?.content);
}

async function callAnthropicText(
  key: string,
  model: string,
  system: string,
  history: ChatHistoryMessage[],
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": key,
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 120,
      messages: history
        .filter((message) => clean(message.conteudo))
        .map((message) => ({
          role: message.papel === "usuario" ? "user" : "assistant",
          content: clean(message.conteudo),
        })),
    }),
  });

  if (!response.ok) throw new Error(`Anthropic: ${await response.text()}`);
  const data = await response.json();
  return clean((data.content ?? []).map((chunk: { type?: string; text?: string }) => chunk.type === "text" ? chunk.text || "" : "").join(""));
}

async function generateIdentityCaptureReply(
  cfg: Record<string, string>,
  req: Request,
  history: ChatHistoryMessage[],
  assunto: string,
  hasName: boolean,
  hasWhatsapp: boolean,
  languageOverride?: string | null,
) {
  const provider = (cfg.provedor_ia || "gemini") as Provider;
  const model = resolveModel(cfg.modelo_ia || "", provider);
  const geminiKey = clean(cfg.gemini_api_key);
  const groqKey = clean(cfg.groq_api_key);
  const anthropicKey = clean(cfg.anthropic_api_key);
  const activeKey = provider === "gemini" ? geminiKey : provider === "groq" ? groqKey : anthropicKey;

  if (!activeKey) return "";

  const system = [
    clean(cfg.system_prompt),
    buildIdentityCaptureSystemPrompt(req, assunto, hasName, hasWhatsapp, languageOverride),
  ].filter(Boolean).join("\n\n");

  if (provider === "groq") return await callGroqText(activeKey, model, system, history);
  if (provider === "anthropic") return await callAnthropicText(activeKey, model, system, history);
  return await callGeminiText(activeKey, model, system, history);
}

async function generateGeneralAssistantReply(
  req: Request,
  cfg: Record<string, string>,
  history: ChatHistoryMessage[],
  assunto: string,
  leadName: string,
  leadContact: string,
  knowledgeContext: string,
  languageOverride?: string | null,
) {
  const provider = (cfg.provedor_ia || "gemini") as Provider;
  const model = resolveModel(cfg.modelo_ia || "", provider);
  const geminiKey = clean(cfg.gemini_api_key);
  const groqKey = clean(cfg.groq_api_key);
  const anthropicKey = clean(cfg.anthropic_api_key);
  const activeKey = provider === "gemini" ? geminiKey : provider === "groq" ? groqKey : anthropicKey;

  if (!activeKey) return "";

  const system = buildGeneralAssistantSystemPrompt(
    req,
    cfg,
    assunto,
    leadName,
    leadContact,
    knowledgeContext,
    languageOverride,
  );

  if (provider === "groq") return await callGroqText(activeKey, model, system, history);
  if (provider === "anthropic") return await callAnthropicText(activeKey, model, system, history);
  return await callGeminiText(activeKey, model, system, history);
}

async function notifyAntonioLead(
  cfg: Record<string, string>,
  leadName: string,
  leadContact: string,
  assunto: string,
  resumo: string,
) {
  const evolutionUrl = trimSlash(cfg.evolution_api_url);
  const instance = clean(cfg.evolution_instance);
  const token = clean(cfg.evolution_api_token);
  const antonioNumber = onlyDigits(cfg.whatsapp_antonio);

  if (!evolutionUrl || !instance || !token || !antonioNumber) {
    return { ok: false, reason: "missing_config" } as const;
  }

  const message = buildLeadNotificationMessage(leadName, leadContact, assunto, resumo);
  const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": token },
    body: JSON.stringify({
      number: antonioNumber,
      options: { delay: 1000 },
      text: message,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    return { ok: false, reason: `evolution_${response.status}`, body } as const;
  }

  return { ok: true } as const;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(resolveOrigin(req))) return json(req, { error: "Origem nao autorizada." }, 403);
    return json(req, { ok: true });
  }

  try {
    assertAllowedOrigin(req);

    const body = await req.json();
    const incomingSessionId = clean(body.sessao_id);
    const mensagem = clean(body.mensagem);
    const language = clean(body.language);

    if (!mensagem) throw new HttpError(400, "Mensagem vazia.");
    if (mensagem !== START_MESSAGE && mensagem.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(400, "Mensagem muito longa. Envie ate 2000 caracteres por vez.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new HttpError(500, "Variaveis do Supabase ausentes.");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: cfgRows } = await supabase.from("configuracoes").select("chave, valor");
    const cfg = Object.fromEntries(((cfgRows as ConfigRow[] | null) || []).map((row) => [row.chave, row.valor ?? ""]));
    const assistantName = assistantDisplayName(cfg);

    let sessaoId = incomingSessionId;
    if (!sessaoId) {
      const { data: nova, error: sessionError } = await supabase.from("sessoes").insert({ status: "ativa" }).select("id").single();
      if (sessionError) throw sessionError;
      sessaoId = nova.id;
    }

    if (mensagem === START_MESSAGE) {
      const respostaInicial = buildInitialGreeting(req, cfg, language);
      await supabase.from("mensagens").insert({ sessao_id: sessaoId, papel: "assistente", conteudo: respostaInicial });
      return json(req, { assistant_name: assistantName, resposta: respostaInicial, sessao_id: sessaoId });
    }

    await supabase.from("mensagens").insert({ sessao_id: sessaoId, papel: "usuario", conteudo: mensagem });

    const { data: historico } = await supabase
      .from("mensagens")
      .select("papel, conteudo")
      .eq("sessao_id", sessaoId)
      .order("criado_em", { ascending: true });

    const { data: leadExistente } = await supabase
      .from("leads")
      .select("id, nome, contato, assunto, resumo, notificado_em")
      .eq("sessao_id", sessaoId)
      .maybeSingle();

    const history = (historico as ChatHistoryMessage[] | null) || [];
    const existingLead = (leadExistente as LeadRow | null) || null;
    const explicitName = extractExplicitNameOnly(mensagem);
    const extractedContact = extractContact(mensagem);
    const assuntoAtual = inferConversationAssunto(history, mensagem || existingLead?.assunto || "");
    const inferredHistoryName = inferNameFromMessages(history);
    const inferredHistoryContact = inferContactFromMessages(history);
    const knownName = clean(existingLead?.nome || inferredHistoryName);
    const looseNameCandidate = explicitName || knownName ? "" : extractName(mensagem);

    const nome = clean(explicitName || knownName || looseNameCandidate);
    const contato = normalizeContact(extractedContact || inferredHistoryContact || existingLead?.contato);

    if (!nome || !hasWhatsAppContact(contato)) {
      let respostaCaptura = "";

      try {
        respostaCaptura = await generateIdentityCaptureReply(
          cfg,
          req,
          history,
          assuntoAtual,
          Boolean(nome),
          hasWhatsAppContact(contato),
          language,
        );

        if (!isIdentityCaptureReplyValid(
          respostaCaptura,
          Boolean(nome),
          hasWhatsAppContact(contato),
          language,
        )) {
          respostaCaptura = "";
        }
      } catch {
        // Fall back to deterministic copy if the configured model is unavailable.
      }

      if (!respostaCaptura) {
        respostaCaptura = buildMissingIdentityReply(
          req,
          Boolean(nome),
          hasWhatsAppContact(contato),
          cfg,
          assuntoAtual,
          mensagem,
          `${sessaoId}-${history.length}`,
          language,
        );
      }

      await supabase.from("mensagens").insert({ sessao_id: sessaoId, papel: "assistente", conteudo: respostaCaptura });
      return json(req, { assistant_name: assistantName, resposta: respostaCaptura, sessao_id: sessaoId });
    }

    const assunto = assuntoAtual;
    const resumo = summarizeMessages(history);
    let leadId = existingLead?.id || "";
    const alreadyNotified = Boolean(existingLead?.notificado_em);

    if (existingLead?.id) {
      await supabase.from("leads").update({ nome, contato, assunto, resumo }).eq("id", existingLead.id);
    } else {
      const { data: insertedLead, error: insertLeadError } = await supabase
        .from("leads")
        .insert({ sessao_id: sessaoId, nome, contato, assunto, resumo, status: "novo" })
        .select("id")
        .single();

      if (insertLeadError) throw insertLeadError;
      leadId = clean(insertedLead?.id);
    }

    if (leadId && !alreadyNotified) {
      try {
        const notification = await notifyAntonioLead(cfg, nome, contato, assunto, resumo);
        if (notification.ok) {
          await supabase.from("leads").update({ notificado_em: new Date().toISOString() }).eq("id", leadId);
        } else {
          console.error("[chat] falha ao notificar whatsapp", notification.reason);
        }
      } catch (notificationError) {
        console.error("[chat] erro ao notificar whatsapp", notificationError);
      }
    }

    const userMsgs = history
      .filter((message) => message.papel === "usuario")
      .map((message) => clean(message.conteudo))
      .slice(-6);
    const queryText = userMsgs.concat([assunto]).join(" ");
    const geminiKeyForEmb = clean(cfg.gemini_api_key);
    let knowledgeContext = "";

    if (geminiKeyForEmb) {
      try {
        const embRes = await fetch(
          `${GEMINI_BASE}/gemini-embedding-001:embedContent?key=${geminiKeyForEmb}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: { parts: [{ text: queryText }] }, output_dimensionality: 768 }),
          },
        );
        if (embRes.ok) {
          const embData = await embRes.json();
          const qVec = embData.embedding?.values as number[] | undefined;
          if (qVec && qVec.length > 0) {
            const { data: vRows } = await supabase.rpc("buscar_conhecimento", {
              query_embedding: `[${qVec.join(",")}]`,
              limite: 3,
            });
            const matched = (vRows as KnowledgeRow[] | null) ?? [];
            if (matched.length > 0) {
              knowledgeContext = matched
                .map((row) => `- ${clean(row.titulo) || "Base de conhecimento"}: ${truncateText(clean(row.conteudo), 450)}`)
                .join("\n");
            }
          }
        }
      } catch {
        // fallback para busca por palavras-chave
      }
    }

    if (!knowledgeContext) {
      const { data: knowledgeRows } = await supabase
        .from("base_conhecimento")
        .select("titulo, conteudo, categoria")
        .eq("ativo", true)
        .limit(50);
      knowledgeContext = buildKnowledgeContext(
        ((knowledgeRows as KnowledgeRow[] | null) || []),
        userMsgs.join(" "),
        assunto,
      );
    }

    let resposta = "";

    try {
      resposta = await generateGeneralAssistantReply(
        req,
        cfg,
        history,
        assunto,
        nome,
        contato,
        knowledgeContext,
        language,
      );

      if (!isGeneralReplyValid(resposta, language)) {
        resposta = "";
      }
    } catch {
      // Fall back to deterministic copy if the configured model is unavailable.
    }

    if (!resposta) {
      resposta = buildServiceReply(req, nome, assunto, mensagem, language);
    }

    await supabase.from("mensagens").insert({ sessao_id: sessaoId, papel: "assistente", conteudo: resposta });

    return json(req, { assistant_name: assistantName, resposta, sessao_id: sessaoId });
  } catch (error) {
    if (error instanceof HttpError) {
      return json(req, { error: error.message }, error.status);
    }

    console.error("[chat]", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return json(req, { error: message }, 500);
  }
});
