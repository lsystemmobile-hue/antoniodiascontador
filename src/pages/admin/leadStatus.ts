export type LeadStatusBucket = 'active' | 'new' | 'waiting' | 'won';

const DEFAULT_STATUS_META = {
  bucket: 'active' as LeadStatusBucket,
  className: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
  label: 'Status desconhecido',
};

const LEAD_STATUS_META = {
  aguardando_resposta: {
    bucket: 'waiting' as LeadStatusBucket,
    className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    label: 'Aguardando resposta',
  },
  em_contato: {
    bucket: 'active' as LeadStatusBucket,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    label: 'Em contato',
  },
  em_negociacao: {
    bucket: 'active' as LeadStatusBucket,
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    label: 'Em negociacao',
  },
  fechado: {
    bucket: 'won' as LeadStatusBucket,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    label: 'Fechado',
  },
  novo: {
    bucket: 'new' as LeadStatusBucket,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    label: 'Novo',
  },
  primeiro_contato: {
    bucket: 'active' as LeadStatusBucket,
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    label: 'Primeiro contato',
  },
  qualificando: {
    bucket: 'new' as LeadStatusBucket,
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    label: 'Qualificando',
  },
  sem_retorno: {
    bucket: 'waiting' as LeadStatusBucket,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    label: 'Sem retorno',
  },
} as const;

export const LEAD_STATUS_OPTIONS = [
  'novo',
  'qualificando',
  'primeiro_contato',
  'aguardando_resposta',
  'em_negociacao',
  'fechado',
  'sem_retorno',
] as const;

export function getLeadStatusMeta(status?: string) {
  if (!status) return DEFAULT_STATUS_META;
  return LEAD_STATUS_META[status as keyof typeof LEAD_STATUS_META] ?? {
    ...DEFAULT_STATUS_META,
    label: status,
  };
}

export function getLeadStatusBucket(status?: string): LeadStatusBucket {
  return getLeadStatusMeta(status).bucket;
}
