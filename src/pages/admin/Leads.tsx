import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Flame,
  Globe,
  Lightbulb,
  MessageSquare,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { getLeadStatusMeta, LEAD_STATUS_OPTIONS } from './leadStatus';

interface Lead {
  id: string;
  nome: string;
  contato: string;
  notificado_em?: string | null;
  assunto: string;
  resumo: string;
  status: string;
  criado_em: string;
  sessao_id: string;
}

interface Mensagem {
  id: string;
  papel: string;
  conteudo: string;
  criado_em: string;
}

type ServiceId = 'saida_fiscal' | 'dirpf' | 'imigracao' | 'sucessorio' | 'geral';

interface ContactLink {
  href: string;
  kind: 'email' | 'whatsapp';
  label: string;
  value: string;
}

interface QualificationItem {
  label: string;
  done: boolean;
}

interface LeadProfile {
  approachGoal: string;
  contextSummary: string;
  country: string | null;
  documentHints: string[];
  missingInfo: string[];
  painSignals: string[];
  qualificationItems: QualificationItem[];
  recommendedQuestions: string[];
  serviceLabel: string;
  suggestedMessage: string;
  suggestedSubject: string;
  temperatureClass: string;
  temperatureLabel: string;
  timeline: string | null;
  urgencyClass: string;
  urgencyLabel: string;
}

const SERVICE_PLAYBOOKS: Record<
  ServiceId,
  {
    defaultSummary: string;
    documentHints: string[];
    goal: string;
    label: string;
    questions: string[];
  }
> = {
  saida_fiscal: {
    defaultSummary: 'o lead precisa organizar a saida fiscal e reduzir risco de pendencia com a Receita',
    documentHints: ['Data da mudanca', 'Ultima declaracao entregue', 'Se ainda possui renda ou contas no Brasil'],
    goal: 'Entender se a saida do Brasil ja aconteceu, se ainda ha vinculos fiscais ativos e qual o risco de pendencia.',
    label: 'Saida Fiscal Definitiva',
    questions: [
      'Voce ja saiu do Brasil de forma definitiva ou ainda esta em transicao?',
      'Ainda mantem renda, conta ou investimento no Brasil?',
      'Ja fez comunicacao ou declaracao de saida definitiva?',
    ],
  },
  dirpf: {
    defaultSummary: 'o lead precisa de apoio com declaracao, revisao ou regularizacao do imposto de renda',
    documentHints: ['Ano-exercicio envolvido', 'Tipos de renda no Brasil e exterior', 'Se existe multa, malha fina ou prazo correndo'],
    goal: 'Descobrir o motivo da duvida, o periodo envolvido e se existem rendas ou bens no Brasil que exigem regularizacao.',
    label: 'Declaracao de Imposto de Renda',
    questions: [
      'Qual ano da declaracao esta trazendo a duvida principal?',
      'Voce recebeu renda no Brasil, no exterior ou nos dois?',
      'Existe algum prazo, multa ou aviso da Receita em andamento?',
    ],
  },
  imigracao: {
    defaultSummary: 'o lead quer planejar a mudanca ou a vida fiscal fora do Brasil com mais seguranca',
    documentHints: ['Pais de destino ou residencia atual', 'Data prevista da mudanca', 'Se havera renda, empresa ou investimentos em mais de um pais'],
    goal: 'Descobrir em que etapa da mudanca a pessoa esta e quais riscos tributarios precisam ser prevenidos.',
    label: 'Imigracao e Planejamento Fiscal',
    questions: [
      'Voce esta planejando a mudanca ou ja mora fora?',
      'Em qual pais esta ou pretende ficar?',
      'Vai manter renda, empresa ou investimentos ligados ao Brasil?',
    ],
  },
  sucessorio: {
    defaultSummary: 'o lead precisa estruturar patrimonio, heranca ou sucessao com conexao internacional',
    documentHints: ['Onde estao os bens', 'Quem sao os herdeiros ou familiares envolvidos', 'Se ja existe inventario, holding ou estrutura patrimonial'],
    goal: 'Entender bens, familia envolvida e riscos de sucessao internacional para orientar o primeiro passo.',
    label: 'Planejamento Sucessorio e Patrimonial',
    questions: [
      'Os bens ou investimentos estao no Brasil, no exterior ou nos dois?',
      'Ja existe alguma preocupacao imediata com heranca, inventario ou protecao patrimonial?',
      'Ha familiares ou herdeiros morando em paises diferentes?',
    ],
  },
  geral: {
    defaultSummary: 'o lead precisa de triagem inicial para direcionar o atendimento correto',
    documentHints: ['Pais de residencia', 'Servico de interesse', 'Resumo objetivo do caso'],
    goal: 'Clarificar o servico mais provavel, o contexto internacional e a proxima acao comercial.',
    label: 'Atendimento pelo site',
    questions: [
      'Em qual pais voce mora hoje?',
      'Qual e a principal duvida fiscal que quer resolver primeiro?',
      'Existe algum prazo ou decisao importante acontecendo agora?',
    ],
  },
};

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function trimText(value = '', limit = 220) {
  const clean = value.trim();
  if (!clean) return '';
  return clean.length > limit ? `${clean.slice(0, limit - 1).trim()}...` : clean;
}

function onlyDigits(value = '') {
  return value.replace(/\D/g, '');
}

function toSentence(value: string) {
  const clean = value.trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function isNameLikeMessage(value = '') {
  const clean = value.trim();
  if (!clean) return false;

  if (!/^[A-Za-zÀ-ÿ' -]{2,40}$/u.test(clean)) return false;

  const normalized = normalizeText(clean);
  if (/\b(valor|saida|fiscal|imposto|duvida|urgente|pais|whatsapp|contato)\b/.test(normalized)) {
    return false;
  }

  return clean.split(/\s+/).length <= 3;
}

function isContactLikeMessage(value = '') {
  const clean = value.trim();
  if (!clean) return false;

  if (clean.includes('@')) return true;

  const digits = onlyDigits(clean);
  const residue = clean.replace(/[+\d\s().-]/g, '');
  return digits.length >= 8 && residue.length === 0;
}

function isSmallTalkMessage(value = '') {
  const normalized = normalizeText(value);
  return [
    'obrigado',
    'obrigada',
    'valeu',
    'tmj',
    'tamo junto',
    'kkk',
    'haha',
    'ahah',
    'show',
    'blz',
    'beleza',
  ].some(snippet => normalized === snippet || normalized.startsWith(`${snippet} `) || normalized.endsWith(` ${snippet}`));
}

function getUserMessages(mensagens: Mensagem[]) {
  return mensagens
    .filter(mensagem => mensagem.papel === 'usuario')
    .map(mensagem => mensagem.conteudo?.trim() || '')
    .filter(Boolean);
}

function getMeaningfulUserMessages(mensagens: Mensagem[]) {
  return getUserMessages(mensagens).filter(message => (
    !isNameLikeMessage(message) &&
    !isContactLikeMessage(message) &&
    !isSmallTalkMessage(message)
  ));
}

function detectExplicitNoUrgency(text: string) {
  return /(nada urgente|sem urgencia|sem urgência|nao urgente|não urgente|sem pressa)/.test(normalizeText(text));
}

function asksAboutPricing(text = '') {
  const normalized = normalizeText(text);

  return [
    'valor',
    'preco',
    'orcamento',
    'quanto custa',
    'quanto fica',
    'investimento',
    'parcelado',
    'parcelamento',
    'pagamento',
    'price',
    'cost',
    'budget',
  ].some(snippet => normalized.includes(snippet));
}

function looksLikeRawLeadSummary(text = '') {
  const normalized = normalizeText(text);
  return (
    onlyDigits(text).length >= 8 ||
    normalized.includes('kkk') ||
    normalized.includes('tmj') ||
    normalized.includes('tamo junto')
  );
}

function buildCaseSummary(
  lead: Lead,
  playbookLabel: string,
  meaningfulMessages: string[],
  country: string | null,
  urgencyLabel: string,
  noUrgency: boolean,
) {
  const conversationText = meaningfulMessages.join(' ');
  const asksPrice = asksAboutPricing(conversationText);

  const parts = [
    `Lead procurou ${playbookLabel.toLowerCase()}.`,
    asksPrice ? 'A conversa foi puxada principalmente por duvida de valor.' : 'A conversa indica busca por orientacao inicial.',
    country ? `Ja informou contexto internacional: ${country}.` : 'Ainda nao informou em qual pais mora.',
    noUrgency ? 'Disse que nao ha urgencia imediata.' : urgencyLabel === 'Alta' ? 'Existe sinal de urgencia.' : 'Ainda nao deixou claro se existe prazo ou urgencia.',
  ];

  const rawSummary = lead.resumo?.trim() || '';
  if (rawSummary && !looksLikeRawLeadSummary(rawSummary) && meaningfulMessages.length === 0) {
    parts.splice(1, 1, toSentence(trimText(rawSummary, 180)));
  }

  return parts.join(' ');
}

function buildSuggestedApproachMessage(
  firstName: string,
  serviceLabel: string,
  country: string | null,
  noUrgency: boolean,
  recommendedQuestions: string[],
  meaningfulMessages: string[],
) {
  const asksPrice = asksAboutPricing(meaningfulMessages.join(' '));
  const opener = `Oi, ${firstName}! Aqui e do escritorio do Antonio Dias.`;
  const hook = asksPrice
    ? `Vi que voce pediu o valor de ${serviceLabel.toLowerCase()}.`
    : `Vi sua mensagem sobre ${serviceLabel.toLowerCase()}.`;
  const nextStep = country
    ? `Para te orientar com seguranca, queria confirmar ${recommendedQuestions[0]?.toLowerCase() || 'alguns pontos do seu caso'}.`
    : `Para te orientar com seguranca, queria confirmar ${recommendedQuestions[0]?.toLowerCase() || 'em qual pais voce mora hoje'}.`;
  const tone = noUrgency ? 'Sem pressa, so quero entender seu contexto direitinho.' : '';

  return [opener, hook, nextStep, tone].filter(Boolean).join(' ');
}

function getContactLink(contato?: string): ContactLink | null {
  const value = (contato || '').trim();
  if (!value) return null;

  if (value.includes('@')) {
    return { href: `mailto:${value}`, kind: 'email', label: 'Email', value };
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return { href: `https://wa.me/${digits}`, kind: 'whatsapp', label: 'WhatsApp', value: digits };
}

function buildOutreachHref(contatoLink: ContactLink | null, subject: string, body: string) {
  if (!contatoLink) return null;

  if (contatoLink.kind === 'email') {
    return `mailto:${contatoLink.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return `${contatoLink.href}?text=${encodeURIComponent(body)}`;
}

function detectServiceId(text: string): ServiceId {
  const normalized = normalizeText(text);
  const services: Array<{ id: ServiceId; keywords: string[] }> = [
    {
      id: 'saida_fiscal',
      keywords: ['saida fiscal', 'declaracao de saida', 'comunicacao de saida', 'deixei o brasil', 'mudanca definitiva'],
    },
    {
      id: 'dirpf',
      keywords: ['imposto de renda', 'dirpf', 'declaracao', 'irpf', 'malha fina', 'multa'],
    },
    {
      id: 'imigracao',
      keywords: ['planejamento fiscal', 'mudar para', 'moro fora', 'morando no exterior', 'dupla tributacao', 'imigracao'],
    },
    {
      id: 'sucessorio',
      keywords: ['heranca', 'sucessorio', 'patrimonio', 'inventario', 'holding familiar'],
    },
  ];

  let bestMatch: { id: ServiceId; score: number } = { id: 'geral', score: 0 };

  services.forEach(service => {
    const score = service.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestMatch.score) {
      bestMatch = { id: service.id, score };
    }
  });

  return bestMatch.id;
}

function detectUrgency(text: string) {
  const normalized = normalizeText(text);

  if (/(urgente|hoje|essa semana|esta semana|prazo|venc|multa|notificacao|malha fina|regularizar logo)/.test(normalized)) {
    return {
      className: 'border-red-500/30 bg-red-500/10 text-red-300',
      label: 'Alta',
    };
  }

  if (/(quanto antes|este mes|esse mes|planejando|nos proximos meses|quero resolver)/.test(normalized)) {
    return {
      className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
      label: 'Media',
    };
  }

  return {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    label: 'Baixa',
  };
}

function detectCountry(text: string) {
  const normalized = normalizeText(text);
  const countries = [
    ['estados unidos', 'Estados Unidos'],
    ['portugal', 'Portugal'],
    ['canada', 'Canada'],
    ['reino unido', 'Reino Unido'],
    ['irlanda', 'Irlanda'],
    ['australia', 'Australia'],
    ['espanha', 'Espanha'],
    ['italia', 'Italia'],
    ['alemanha', 'Alemanha'],
    ['franca', 'Franca'],
    ['suica', 'Suica'],
    ['emirados', 'Emirados Arabes'],
    ['dubai', 'Dubai'],
  ] as const;

  const found = countries.find(([keyword]) => normalized.includes(keyword));
  if (found) return found[1];

  const match = normalized.match(/(?:moro|vivo|estou|morando|resido)\s+(?:hoje\s+)?(?:em|na|no)\s+([a-z' -]{3,40})/i);
  if (!match?.[1]) return null;

  const country = match[1].trim();
  return country.charAt(0).toUpperCase() + country.slice(1);
}

function detectTimeline(text: string) {
  const normalized = normalizeText(text);

  if (/(ja moro|estou morando|resido fora|moro fora|vivo fora)/.test(normalized)) {
    return 'Ja mora fora do Brasil';
  }

  if (/(vou mudar|pretendo mudar|mudanca marcada|me mudando|planejando mudar)/.test(normalized)) {
    return 'Mudanca em planejamento';
  }

  if (/(prazo|ate dia|ate o fim|esse mes|este mes|esta semana|esse ano|este ano)/.test(normalized)) {
    return 'Existe uma janela de tempo mencionada';
  }

  return null;
}

function detectTemperature(options: {
  hasContact: boolean;
  hasCountry: boolean;
  hasClearIntent: boolean;
  urgencyLabel: string;
  wantsPricing: boolean;
}) {
  const { hasContact, hasCountry, hasClearIntent, urgencyLabel, wantsPricing } = options;

  if (urgencyLabel === 'Alta' || (wantsPricing && hasContact && hasCountry)) {
    return {
      className: 'border-red-500/30 bg-red-500/10 text-red-300',
      label: 'Quente',
    };
  }

  if ((wantsPricing && hasContact) || (hasClearIntent && hasContact)) {
    return {
      className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
      label: 'Morno',
    };
  }

  return {
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    label: 'Frio',
  };
}

function buildLeadProfile(lead: Lead, mensagens: Mensagem[]): LeadProfile {
  const userMessages = getUserMessages(mensagens);
  const meaningfulMessages = getMeaningfulUserMessages(mensagens);
  const userConversationText = userMessages.join(' ');
  const meaningfulConversationText = meaningfulMessages.join(' ');
  const normalized = normalizeText(meaningfulConversationText || userConversationText);
  const serviceId = detectServiceId([lead.assunto, meaningfulConversationText].filter(Boolean).join(' '));
  const playbook = SERVICE_PLAYBOOKS[serviceId];
  const urgency = detectUrgency(userConversationText);
  const country = detectCountry(userConversationText);
  const timeline = detectTimeline(userConversationText);
  const noUrgency = detectExplicitNoUrgency(userConversationText);
  const wantsPricing = asksAboutPricing(userConversationText);
  const hasValidContact = Boolean(getContactLink(lead.contato));
  const hasClearIntent = Boolean(meaningfulMessages.length || lead.assunto?.trim());
  const temperature = detectTemperature({
    hasContact: hasValidContact,
    hasCountry: Boolean(country),
    hasClearIntent,
    urgencyLabel: urgency.label,
    wantsPricing,
  });
  const baseSummary = trimText(
    buildCaseSummary(lead, playbook.label, meaningfulMessages, country, urgency.label, noUrgency),
    240,
  );

  const painSignals = [
    wantsPricing ? 'Perguntou valor cedo na conversa, entao tende a responder melhor a uma abordagem direta e objetiva.' : null,
    noUrgency ? 'Deixou claro que nao e algo urgente, entao a conversa pode seguir em tom consultivo.' : null,
    !country ? 'Ainda falta confirmar em qual pais mora hoje para qualificar a orientacao.' : `Ja existe contexto internacional informado: ${country}.`,
    serviceId === 'saida_fiscal' && !/(comunicacao|declaracao de saida|saida definitiva)/.test(normalized)
      ? 'Ainda nao ficou claro se ela ja fez comunicacao ou declaracao de saida definitiva.'
      : null,
  ].filter((value): value is string => Boolean(value)).slice(0, 3);

  const qualificationItems: QualificationItem[] = [
    { done: Boolean(lead.nome?.trim()), label: 'Nome coletado' },
    { done: hasValidContact, label: 'Contato valido disponivel' },
    { done: serviceId !== 'geral', label: 'Servico principal identificado' },
    { done: Boolean(country), label: 'Pais de residencia ou destino claro' },
    { done: Boolean(timeline) || noUrgency || urgency.label !== 'Baixa', label: 'Prazo ou urgencia entendidos' },
    { done: hasClearIntent, label: 'Motivo da procura claro' },
  ];

  const missingInfo = [
    !country ? 'Confirmar em qual pais o lead mora hoje ou para onde esta se mudando.' : null,
    !timeline ? 'Entender quando a mudanca aconteceu ou qual e o prazo da demanda.' : null,
    serviceId === 'saida_fiscal' && !/(comunicacao|declaracao de saida|saida definitiva)/.test(normalized)
      ? 'Validar se ja houve comunicacao ou declaracao de saida definitiva.'
      : null,
    serviceId === 'dirpf' && !/(renda|rendimentos|conta|investimento|bem|bens)/.test(normalized)
      ? 'Descobrir se ele mantem renda, bens ou investimentos no Brasil.'
      : null,
    serviceId === 'sucessorio' && !/(herdeir|famil|bem|patrimonio|inventario)/.test(normalized)
      ? 'Mapear bens, familiares envolvidos e onde estao localizados.'
      : null,
  ].filter((value): value is string => Boolean(value)).slice(0, 4);

  const recommendedQuestions = [
    !country ? 'Em qual pais voce mora hoje e desde quando?' : null,
    !timeline ? playbook.questions[0] : null,
    ...playbook.questions,
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index).slice(0, 4);

  const firstName = lead.nome?.trim().split(' ')[0] || 'tudo bem';
  const suggestedMessage = buildSuggestedApproachMessage(
    firstName,
    playbook.label,
    country,
    noUrgency,
    recommendedQuestions,
    meaningfulMessages,
  );

  return {
    approachGoal: playbook.goal,
    contextSummary: baseSummary,
    country,
    documentHints: playbook.documentHints,
    missingInfo,
    painSignals,
    qualificationItems,
    recommendedQuestions,
    serviceLabel: playbook.label,
    suggestedMessage,
    suggestedSubject: `Contato sobre ${playbook.label}`,
    temperatureClass: temperature.className,
    temperatureLabel: temperature.label,
    timeline,
    urgencyClass: urgency.className,
    urgencyLabel: urgency.label,
  };
}

export const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [copiouMensagem, setCopiouMensagem] = useState(false);
  const [acaoErro, setAcaoErro] = useState('');
  const [excluindoLeadId, setExcluindoLeadId] = useState<string | null>(null);
  const [leadParaExcluir, setLeadParaExcluir] = useState<Lead | null>(null);

  useEffect(() => {
    carregarLeads();
  }, []);

  useEffect(() => {
    setCopiouMensagem(false);
  }, [leadSelecionado?.id]);

  const carregarLeads = async () => {
    setAcaoErro('');
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('criado_em', { ascending: false });
    setLeads(data ?? []);
    setCarregando(false);
  };

  const abrirLead = async (lead: Lead) => {
    setAcaoErro('');
    setLeadSelecionado(lead);
    setCarregandoMsgs(true);
    setMensagens([]);

    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .eq('sessao_id', lead.sessao_id)
      .order('criado_em', { ascending: true });

    setMensagens((data ?? []).filter(mensagem => mensagem.conteudo !== '__inicio__'));
    setCarregandoMsgs(false);
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    setAcaoErro('');
    await supabase.from('leads').update({ status: novoStatus }).eq('id', id);
    setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, status: novoStatus } : lead)));
    if (leadSelecionado?.id === id) {
      setLeadSelecionado(prev => (prev ? { ...prev, status: novoStatus } : null));
    }
  };

  const excluirLead = async (lead: Lead) => {
    setAcaoErro('');
    setExcluindoLeadId(lead.id);

    const { error: mensagensError } = await supabase
      .from('mensagens')
      .delete()
      .eq('sessao_id', lead.sessao_id);

    if (mensagensError) {
      setAcaoErro('Nao foi possivel excluir o historico desse lead agora.');
      setExcluindoLeadId(null);
      return;
    }

    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (leadError) {
      setAcaoErro('Nao foi possivel excluir esse lead agora.');
      setExcluindoLeadId(null);
      return;
    }

    const { error: sessaoError } = await supabase
      .from('sessoes')
      .delete()
      .eq('id', lead.sessao_id);

    if (sessaoError) {
      setAcaoErro('O lead foi excluido, mas a sessao antiga nao pode ser removida agora.');
    }

    setLeads(prev => prev.filter(item => item.id !== lead.id));
    setMensagens([]);
    setLeadParaExcluir(null);
    setLeadSelecionado(prev => (prev?.id === lead.id ? null : prev));
    setExcluindoLeadId(null);
  };

  const copiarMensagem = async (mensagem: string) => {
    if (!mensagem || !navigator?.clipboard) return;

    await navigator.clipboard.writeText(mensagem);
    setCopiouMensagem(true);
    window.setTimeout(() => setCopiouMensagem(false), 1800);
  };

  const leadsFiltrados = leads.filter(lead =>
    lead.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    lead.contato?.toLowerCase().includes(busca.toLowerCase()) ||
    lead.assunto?.toLowerCase().includes(busca.toLowerCase()) ||
    lead.resumo?.toLowerCase().includes(busca.toLowerCase())
  );

  const contatoLink = getContactLink(leadSelecionado?.contato);
  const perfilLead = leadSelecionado ? buildLeadProfile(leadSelecionado, mensagens) : null;
  const statusSelecionado = getLeadStatusMeta(leadSelecionado?.status);
  const contatoComMensagem = buildOutreachHref(
    contatoLink,
    perfilLead?.suggestedSubject || 'Contato Antonio Dias',
    perfilLead?.suggestedMessage || '',
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className={`flex flex-col border-r border-[#9C7C4C]/15 bg-[#080f1a] transition-all ${leadSelecionado ? 'hidden md:flex md:w-80 lg:w-96' : 'flex-1'}`}>
        <div className="border-b border-[#9C7C4C]/15 p-4">
          <div className="mb-3">
            <h1 className="text-xl font-display font-bold text-white">Leads e Abordagem</h1>
            <p className="mt-1 text-xs text-gray-500">{leadsFiltrados.length} lead(s) visiveis na lista</p>
          </div>

          {acaoErro && (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {acaoErro}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar nome, contato, assunto ou resumo..."
              value={busca}
              onChange={event => setBusca(event.target.value)}
              className="w-full rounded-xl border border-[#9C7C4C]/20 bg-[#0a1420] py-2 pl-9 pr-4 text-sm text-white placeholder-gray-600 focus:border-[#9C7C4C]/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : leadsFiltrados.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">Nenhum lead encontrado</p>
            </div>
          ) : (
            leadsFiltrados.map(lead => (
              (() => {
                const statusMeta = getLeadStatusMeta(lead.status);
                return (
              <button
                key={lead.id}
                onClick={() => abrirLead(lead)}
                className={`flex w-full items-start gap-3 border-b border-[#9C7C4C]/10 px-4 py-4 text-left transition-colors hover:bg-white/5 ${leadSelecionado?.id === lead.id ? 'bg-[#9C7C4C]/10' : ''}`}
              >
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#9C7C4C]/20">
                  <span className="text-sm font-semibold text-[#9C7C4C]">
                    {lead.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{lead.nome}</p>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{lead.contato}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{lead.assunto}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-600" />
              </button>
                );
              })()
            ))
          )}
        </div>
      </div>

      {leadSelecionado ? (
        <div className="flex min-w-0 flex-1 flex-col bg-[#080f1a]">
          <div className="flex items-center gap-3 border-b border-[#9C7C4C]/15 px-5 py-4">
            <button
              onClick={() => setLeadSelecionado(null)}
              className="p-1.5 text-gray-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#9C7C4C]/20">
              <span className="font-semibold text-[#9C7C4C]">
                {leadSelecionado.nome?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{leadSelecionado.nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="truncate text-xs text-gray-400">{leadSelecionado.contato}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusSelecionado.className}`}>
                  {statusSelecionado.label}
                </span>
              </div>
            </div>
            <select
              value={leadSelecionado.status}
              onChange={event => atualizarStatus(leadSelecionado.id, event.target.value)}
              className="rounded-xl border border-[#9C7C4C]/30 bg-[#0a1420] px-3 py-2 text-xs text-white focus:border-[#9C7C4C]/60 focus:outline-none"
            >
              {LEAD_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {getLeadStatusMeta(status).label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setLeadParaExcluir(leadSelecionado)}
              disabled={excluindoLeadId === leadSelecionado.id}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {excluindoLeadId === leadSelecionado.id ? 'Excluindo...' : 'Excluir lead'}
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section className="rounded-2xl border border-[#9C7C4C]/15 bg-[#09111d] p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9C7C4C]">Panorama do lead</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{leadSelecionado.assunto || 'Atendimento pelo site'}</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Capturado em {new Date(leadSelecionado.criado_em).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusSelecionado.className}`}>
                    Etapa atual: {statusSelecionado.label}
                  </span>
                  {leadSelecionado.notificado_em && (
                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                      Notificado no WhatsApp
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Resumo do caso</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">
                    {perfilLead?.contextSummary || 'Ainda nao ha um resumo estruturado para este lead.'}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Contato</p>
                  <p className="mt-2 break-words text-sm text-white">{leadSelecionado.contato || 'Contato nao informado'}</p>
                  {contatoLink && (
                    <a
                      href={contatoLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center rounded-lg border border-[#9C7C4C]/30 px-3 py-2 text-xs font-medium text-[#d5b783] transition-colors hover:bg-[#9C7C4C]/10"
                    >
                      Abrir {contatoLink.label}
                    </a>
                  )}
                </div>

                <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Leitura rapida</p>
                  <div className="mt-2 space-y-2 text-sm text-gray-200">
                    <p>Servico mais provavel: <span className="text-white">{perfilLead?.serviceLabel || 'A definir'}</span></p>
                    <p>Urgencia: <span className="text-white">{perfilLead?.urgencyLabel || 'Nao definida'}</span></p>
                    <p>Contexto internacional: <span className="text-white">{perfilLead?.country || 'Nao confirmado'}</span></p>
                  </div>
                </div>
              </div>
            </section>

            {perfilLead && (
              <>
                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-2xl border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#9C7C4C]">Ficha de abordagem</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">{perfilLead.serviceLabel}</h2>
                      </div>
                      <Target className="h-5 w-5 text-[#9C7C4C]" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#9C7C4C]/30 bg-[#9C7C4C]/10 px-3 py-1 text-xs font-medium text-[#d5b783]">
                        Servico: {perfilLead.serviceLabel}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${perfilLead.urgencyClass}`}>
                        Urgencia: {perfilLead.urgencyLabel}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${perfilLead.temperatureClass}`}>
                        Temperatura: {perfilLead.temperatureLabel}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-gray-300">{perfilLead.contextSummary}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500">
                          <Globe className="h-3.5 w-3.5" />
                          Contexto internacional
                        </div>
                        <p className="mt-2 text-sm text-white">{perfilLead.country || 'Pais ainda nao confirmado'}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Momento da demanda
                        </div>
                        <p className="mt-2 text-sm text-white">{perfilLead.timeline || 'Linha do tempo ainda difusa'}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                          Sinais observados
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {perfilLead.painSignals.map(signal => (
                          <span key={signal} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#9C7C4C]">Primeiro contato sugerido</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">Mensagem pronta para abordagem</h2>
                      </div>
                      <MessageSquare className="h-5 w-5 text-[#9C7C4C]" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#9C7C4C]/10 bg-[#0F1B2E] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{perfilLead.suggestedMessage}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copiarMensagem(perfilLead.suggestedMessage)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#9C7C4C]/30 px-3 py-2 text-xs font-medium text-[#d5b783] transition-colors hover:bg-[#9C7C4C]/10"
                      >
                        {copiouMensagem ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiouMensagem ? 'Mensagem copiada' : 'Copiar mensagem'}
                      </button>

                      {contatoComMensagem && contatoLink && (
                        <a
                          href={contatoComMensagem}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#9C7C4C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#b08d5a]"
                        >
                          Abrir {contatoLink.label} com mensagem
                        </a>
                      )}
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-gray-500">
                      Use como ponto de partida e ajuste o tom conforme a relacao que Antonio quiser construir com esse lead.
                    </p>
                  </section>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-2xl border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#9C7C4C]">Playbook rapido</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">Material de apoio para conduzir</h2>
                      </div>
                      <Lightbulb className="h-5 w-5 text-[#9C7C4C]" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/5 bg-[#0F1B2E] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Objetivo da primeira abordagem</p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-200">{perfilLead.approachGoal}</p>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Perguntas que fazem sentido agora</p>
                      <div className="mt-3 space-y-2">
                        {perfilLead.recommendedQuestions.map(question => (
                          <div key={question} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-gray-200">
                            {question}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500">
                        <FileText className="h-3.5 w-3.5" />
                        Insumos que valem pedir cedo
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {perfilLead.documentHints.map(item => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#9C7C4C]">Checklist comercial</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">O que ja sabemos e o que falta</h2>
                      </div>
                      <Flame className="h-5 w-5 text-[#9C7C4C]" />
                    </div>

                    <div className="mt-4 space-y-2">
                      {perfilLead.qualificationItems.map(item => (
                        <div
                          key={item.label}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                            item.done
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/8 bg-white/[0.03] text-gray-300'
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.done ? <Check className="h-4 w-4" /> : <span className="text-xs uppercase tracking-[0.16em] text-gray-500">pendente</span>}
                        </div>
                      ))}
                    </div>

                    {perfilLead.missingInfo.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Faltando confirmar</p>
                        <div className="mt-3 space-y-2">
                          {perfilLead.missingInfo.map(item => (
                            <p key={item} className="text-sm leading-relaxed text-amber-100">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}

            <p className="mb-4 text-xs uppercase tracking-wider text-gray-500">Historico da conversa</p>

            {carregandoMsgs ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className={`flex ${index % 2 === 0 ? '' : 'justify-end'}`}>
                    <div className="h-12 w-48 animate-pulse rounded-2xl bg-white/5" />
                  </div>
                ))}
              </div>
            ) : mensagens.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-600">Sem mensagens na conversa</p>
            ) : (
              mensagens.map(msg => (
                <div key={msg.id} className={`flex ${msg.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.papel === 'usuario'
                        ? 'rounded-br-sm bg-[#9C7C4C] text-white'
                        : 'rounded-bl-sm bg-[#1a2d47] text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                    <p className={`mt-1 text-xs ${msg.papel === 'usuario' ? 'text-[#9C7C4C]/60' : 'text-gray-500'}`}>
                      {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center text-gray-600 md:flex">
          <div className="text-center">
            <ChevronRight className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">Selecione um lead para ver o historico e a ficha de abordagem</p>
          </div>
        </div>
      )}
      </div>

      <AlertDialog
        open={Boolean(leadParaExcluir)}
        onOpenChange={(open) => {
          if (!open && !excluindoLeadId) {
            setLeadParaExcluir(null);
          }
        }}
      >
        <AlertDialogContent className="border border-[#9C7C4C]/20 bg-[#08111c] text-white shadow-2xl shadow-black/40">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-xl text-white">Excluir lead</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-gray-400">
              {leadParaExcluir
                ? `Voce esta prestes a remover ${leadParaExcluir.nome} do painel. Isso tambem apaga o historico dessa conversa e nao podera ser desfeito.`
                : 'Confirme a exclusao deste lead.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {leadParaExcluir && (
            <div className="rounded-xl border border-white/5 bg-[#0F1B2E] p-4">
              <p className="text-sm font-medium text-white">{leadParaExcluir.nome}</p>
              <p className="mt-1 text-xs text-gray-400">{leadParaExcluir.contato}</p>
              <p className="mt-2 text-xs text-gray-500">{leadParaExcluir.assunto || 'Atendimento pelo site'}</p>
            </div>
          )}

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={Boolean(excluindoLeadId)}
              className="border-[#9C7C4C]/20 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (leadParaExcluir) {
                  void excluirLead(leadParaExcluir);
                }
              }}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {leadParaExcluir && excluindoLeadId === leadParaExcluir.id ? 'Excluindo...' : 'Sim, excluir lead'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
