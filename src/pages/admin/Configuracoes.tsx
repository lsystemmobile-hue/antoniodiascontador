import { useEffect, useState } from 'react';
import { BookOpen, Bot, Eye, EyeOff, Loader2, MessageCircle, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Config {
  chave: string;
  valor: string;
  descricao: string;
}

type TestStatus = {
  type: 'success' | 'error' | '';
  message: string;
};

const PROVEDORES = ['gemini', 'groq', 'anthropic'] as const;
type Provedor = typeof PROVEDORES[number];

const PROVEDOR_LABELS: Record<Provedor, string> = {
  gemini: 'Gemini (Google)',
  groq: 'Groq (Llama / Mixtral)',
  anthropic: 'Anthropic (Claude)',
};

const PROVEDOR_API_KEY: Record<Provedor, string> = {
  gemini: 'gemini_api_key',
  groq: 'groq_api_key',
  anthropic: 'anthropic_api_key',
};

const MODELOS_SUGERIDOS: Record<Provedor, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Gemini 1.5 Flash (rápido)', value: 'gemini-1.5-flash' },
    { label: 'Gemini 2.0 Flash (mais recente)', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Pro (mais capaz)', value: 'gemini-1.5-pro' },
  ],
  groq: [
    { label: 'Llama 3.3 70B (recomendado)', value: 'llama-3.3-70b-versatile' },
    { label: 'Llama 3.1 8B (ultra rápido)', value: 'llama-3.1-8b-instant' },
    { label: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768' },
    { label: 'DeepSeek R1 Distill Llama 70B', value: 'deepseek-r1-distill-llama-70b' },
  ],
  anthropic: [
    { label: 'Claude Haiku 4.5 (mais rápido)', value: 'claude-haiku-4-5-20251001' },
    { label: 'Claude Sonnet 4.6 (melhor custo-benefício)', value: 'claude-sonnet-4-6' },
    { label: 'Claude Opus 4.7 (mais capaz)', value: 'claude-opus-4-7' },
  ],
};

const EMBEDDING_MODELOS = [
  {
    label: 'Gemini Embedding 001',
    value: 'gemini-embedding-001',
    description: 'Modelo atual recomendado para RAG. Usa 768 dimensoes para combinar com a tabela atual.',
  },
];

const CONFIG_LABELS: Record<string, string> = {
  provedor_ia: 'Provedor de IA',
  modelo_ia: 'Modelo',
  gemini_api_key: 'Gemini API Key',
  groq_api_key: 'Groq API Key',
  anthropic_api_key: 'Anthropic API Key',
  embedding_model: 'Modelo de Embedding',
  mensagem_inicial_pt: 'Mensagem Inicial (PT)',
  mensagem_inicial_en: 'Mensagem Inicial (EN)',
  system_prompt: 'System Prompt (instruções da IA)',
  nome_assistente: 'Nome do Assistente',
  evolution_api_url: 'Evolution API URL',
  evolution_instance: 'Evolution Instance',
  evolution_api_token: 'Evolution API Token',
  whatsapp_antonio: 'WhatsApp do Antonio',
};

const CONFIG_HINTS: Record<string, string> = {
  gemini_api_key: 'Use a chave criada no Google AI Studio ou Google Cloud. Ela tambem e obrigatoria para gerar embeddings da base de conhecimento, mesmo usando Groq ou Anthropic no chat.',
  groq_api_key: 'Use a chave criada em console.groq.com.',
  anthropic_api_key: 'Use a chave criada em console.anthropic.com.',
  embedding_model: 'Modelo usado para transformar artigos e perguntas em vetores de busca.',
  mensagem_inicial_pt: 'Primeira mensagem obrigatoria exibida quando o visitante abre o chat em portugues.',
  mensagem_inicial_en: 'Primeira mensagem exibida para navegadores em ingles. Se ficar vazia, o sistema usa a versao em portugues.',
  modelo_ia: 'Escolha uma sugestão ou digite manualmente o nome exato do modelo.',
  system_prompt: 'Instruções de comportamento do assistente no chat do site.',
  nome_assistente: 'Nome exibido no widget de atendimento.',
  evolution_api_url: 'URL base da sua Evolution API.',
  evolution_instance: 'Nome da instância conectada ao WhatsApp.',
  evolution_api_token: 'Token usado para autenticar a Evolution API.',
  whatsapp_antonio: 'Número que recebe os leads, com DDI e DDD. Exemplo: 5511999998888.',
};

const SECRET_KEYS = new Set(['gemini_api_key', 'groq_api_key', 'anthropic_api_key', 'evolution_api_token']);

function extrairErroFunction(data: unknown, fallback?: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback || 'Falha ao testar a Evolution API.';
}

async function extrairErroInvoke(data: unknown, error: { message: string; context?: unknown }): Promise<string> {
  const fallback = extrairErroFunction(data, error.message);

  if (error.context instanceof Response) {
    try {
      return extrairErroFunction(await error.context.clone().json(), fallback);
    } catch {
      try {
        const text = await error.context.clone().text();
        return text.trim() || fallback;
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

function extrairMensagemSucesso(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Mensagem de teste enviada.';
}

export const AdminConfiguracoes = () => {
  const [configs, setConfigs] = useState<Record<string, Config>>({});
  const [valores, setValores] = useState<Record<string, string>>({});
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [salvos, setSalvos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [testandoEvolution, setTestandoEvolution] = useState(false);
  const [testeEvolution, setTesteEvolution] = useState<TestStatus>({ type: '', message: '' });

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase.from('configuracoes').select('*');
      if (data) {
        const map: Record<string, Config> = {};
        const vals: Record<string, string> = {};
        data.forEach(c => {
          map[c.chave] = c;
          vals[c.chave] = c.valor ?? '';
        });
        setConfigs(map);
        setValores(vals);
      }
      setCarregando(false);
    };
    carregar();
  }, []);

  const salvar = async (chave: string) => {
    setSalvando(p => ({ ...p, [chave]: true }));
    await supabase
      .from('configuracoes')
      .upsert({ chave, valor: valores[chave] ?? '', descricao: configs[chave]?.descricao ?? '' }, { onConflict: 'chave' });
    setSalvos(p => ({ ...p, [chave]: true }));
    setTimeout(() => setSalvos(p => ({ ...p, [chave]: false })), 2000);
    setSalvando(p => ({ ...p, [chave]: false }));
  };

  const setValor = (chave: string, valor: string) => {
    setValores(p => ({ ...p, [chave]: valor }));
  };

  const testarEvolution = async () => {
    setTestandoEvolution(true);
    setTesteEvolution({ type: '', message: '' });

    const { data, error } = await supabase.functions.invoke('testar-evolution', { body: {} });
    if (error) {
      setTesteEvolution({ type: 'error', message: await extrairErroInvoke(data, error) });
    } else {
      setTesteEvolution({ type: 'success', message: extrairMensagemSucesso(data) });
    }

    setTestandoEvolution(false);
  };

  const provedorAtual = (PROVEDORES.includes(valores['provedor_ia'] as Provedor)
    ? valores['provedor_ia']
    : 'gemini') as Provedor;

  const apiKeyVisivel = PROVEDOR_API_KEY[provedorAtual];
  const embeddingModelAtual = valores['embedding_model'] || EMBEDDING_MODELOS[0].value;
  const modelosChatDisponiveis = MODELOS_SUGERIDOS[provedorAtual] ?? [];
  const modeloChatAtual = valores['modelo_ia'] ?? '';
  const modeloChatCustomizado = modeloChatAtual && !modelosChatDisponiveis.some(modelo => modelo.value === modeloChatAtual);
  const embeddingSelecionado = EMBEDDING_MODELOS.find(modelo => modelo.value === embeddingModelAtual);

  const renderSaveButton = (chave: string) => (
    <Button
      type="button"
      onClick={() => salvar(chave)}
      disabled={salvando[chave]}
      className={`h-10 flex-shrink-0 ${
        salvos[chave]
          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/20 border border-green-500/30'
          : 'bg-[#9C7C4C] text-white hover:bg-[#b08d5a]'
      }`}
    >
      {salvando[chave] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {salvos[chave] ? 'Salvo' : 'Salvar'}
    </Button>
  );

  const renderField = (chave: string, options?: { textarea?: boolean; placeholder?: string; label?: string; hint?: string; embedded?: boolean }) => {
    const label = options?.label ?? CONFIG_LABELS[chave] ?? chave;
    const hint = options?.hint ?? CONFIG_HINTS[chave];
    const ehSecret = SECRET_KEYS.has(chave);
    const visivel = visiveis[chave] ?? false;

    const content = (
      <>
        <div className="mb-3">
          <Label className="text-sm font-medium text-white">{label}</Label>
          {hint && <p className="mt-1 text-xs leading-relaxed text-gray-500">{hint}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            {options?.textarea ? (
              <Textarea
                value={valores[chave] ?? ''}
                onChange={e => setValor(chave, e.target.value)}
                rows={8}
                placeholder={options.placeholder}
                className="min-h-[220px] resize-y rounded-lg border-[#9C7C4C]/20 bg-[#0F1B2E] text-sm text-white placeholder:text-gray-600 focus-visible:ring-[#9C7C4C]/40"
              />
            ) : (
              <Input
                type={ehSecret && !visivel ? 'password' : 'text'}
                value={valores[chave] ?? ''}
                onChange={e => setValor(chave, e.target.value)}
                placeholder={options?.placeholder}
                className={`rounded-lg border-[#9C7C4C]/20 bg-[#0F1B2E] text-sm text-white placeholder:text-gray-600 focus-visible:ring-[#9C7C4C]/40 ${
                  ehSecret ? 'pr-10' : ''
                }`}
              />
            )}

            {ehSecret && (
              <button
                type="button"
                onClick={() => setVisiveis(p => ({ ...p, [chave]: !visivel }))}
                className="absolute right-3 top-3 text-gray-500 transition-colors hover:text-white"
                aria-label={visivel ? 'Ocultar valor' : 'Mostrar valor'}
              >
                {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>

          {renderSaveButton(chave)}
        </div>
      </>
    );

    if (options?.embedded) {
      return <div key={chave}>{content}</div>;
    }

    return (
      <div key={chave} className="rounded-lg border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
        {content}
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9C7C4C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-400">Chaves de API e comportamento do assistente virtual</p>
      </div>

      <Tabs defaultValue="provedor" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-lg border border-[#9C7C4C]/15 bg-[#0a1420] p-2 sm:grid-cols-3">
          <TabsTrigger
            value="provedor"
            className="gap-2 rounded-md py-2.5 text-gray-400 data-[state=active]:bg-[#9C7C4C] data-[state=active]:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Provedor de IA
          </TabsTrigger>
          <TabsTrigger
            value="assistente"
            className="gap-2 rounded-md py-2.5 text-gray-400 data-[state=active]:bg-[#9C7C4C] data-[state=active]:text-white"
          >
            <Bot className="h-4 w-4" />
            Assistente
          </TabsTrigger>
          <TabsTrigger
            value="evolution"
            className="gap-2 rounded-md py-2.5 text-gray-400 data-[state=active]:bg-[#9C7C4C] data-[state=active]:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Evolution API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provedor" className="space-y-5">
          <section className="rounded-lg border border-[#9C7C4C]/15 bg-[#0a1420] p-5">
            <div className="mb-5 flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[#9C7C4C]" />
              <div>
                <h2 className="text-sm font-semibold text-white">Chat do Assistente</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Escolha o provedor, modelo e chave usados para responder as conversas do site.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-white">Provedor</Label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={provedorAtual}
                    onChange={e => {
                      const novoProvedor = e.target.value as Provedor;
                      setValor('provedor_ia', novoProvedor);
                      if (!MODELOS_SUGERIDOS[novoProvedor].some(modelo => modelo.value === modeloChatAtual)) {
                        setValor('modelo_ia', MODELOS_SUGERIDOS[novoProvedor][0]?.value ?? '');
                      }
                    }}
                    className="h-10 flex-1 rounded-lg border border-[#9C7C4C]/20 bg-[#0F1B2E] px-3 text-sm text-white outline-none transition-colors focus:border-[#9C7C4C]/50"
                  >
                    {PROVEDORES.map(provedor => (
                      <option key={provedor} value={provedor}>
                        {PROVEDOR_LABELS[provedor]}
                      </option>
                    ))}
                  </select>

                  {renderSaveButton('provedor_ia')}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white">Modelo</Label>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">Selecione um dos modelos disponiveis para o provedor escolhido.</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={modeloChatAtual}
                    onChange={e => setValor('modelo_ia', e.target.value)}
                    className="h-10 flex-1 rounded-lg border border-[#9C7C4C]/20 bg-[#0F1B2E] px-3 text-sm text-white outline-none transition-colors focus:border-[#9C7C4C]/50"
                  >
                    <option value="">Selecione um modelo</option>
                    {modeloChatCustomizado && (
                      <option value={modeloChatAtual}>{modeloChatAtual}</option>
                    )}
                    {modelosChatDisponiveis.map(modelo => (
                      <option key={modelo.value} value={modelo.value}>
                        {modelo.label}
                      </option>
                    ))}
                  </select>

                  {renderSaveButton('modelo_ia')}
                </div>
              </div>

              {renderField(apiKeyVisivel, { embedded: true })}
            </div>
          </section>

          <section className="rounded-lg border border-[#9C7C4C]/15 bg-[#0a1420] p-5">
            <div className="mb-5 flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 text-[#9C7C4C]" />
              <div>
                <h2 className="text-sm font-semibold text-white">Base de Conhecimento</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Configuracoes usadas para gerar embeddings e fazer a busca RAG nos artigos.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {renderField('gemini_api_key', {
                embedded: true,
                label: 'Gemini API Key',
                hint: 'Obrigatoria para gerar embeddings, mesmo quando o chat usa Groq ou Anthropic.',
              })}

              <div>
                <Label className="text-sm font-medium text-white">Modelos disponiveis</Label>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  A tabela atual usa vetores com 768 dimensoes. Troque somente se tambem migrar a estrutura da base.
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 space-y-2">
                    <select
                      value={embeddingModelAtual}
                      onChange={e => setValor('embedding_model', e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#9C7C4C]/20 bg-[#0F1B2E] px-3 text-sm text-white outline-none transition-colors focus:border-[#9C7C4C]/50"
                    >
                      {EMBEDDING_MODELOS.map(modelo => (
                        <option key={modelo.value} value={modelo.value}>
                          {modelo.label}
                        </option>
                      ))}
                    </select>
                    {embeddingSelecionado && (
                      <p className="text-xs leading-relaxed text-gray-500">{embeddingSelecionado.description}</p>
                    )}
                  </div>

                  {renderSaveButton('embedding_model')}
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="assistente" className="space-y-4">
          {renderField('nome_assistente', { placeholder: 'Ex: Assistente Antonio Dias' })}
          {renderField('mensagem_inicial_pt', {
            textarea: true,
            placeholder: 'Ex: Ola! Sou o assistente virtual do Antonio Dias. Para comecar, qual e seu nome e seu contato de WhatsApp?',
          })}
          {renderField('mensagem_inicial_en', {
            textarea: true,
            placeholder: 'Optional English opening message for visitors with browser language set to English.',
          })}
          {renderField('system_prompt', {
            textarea: true,
            placeholder: 'Defina as instruções, tom de voz, regras de coleta de lead e limites do assistente...',
          })}
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4">
          {renderField('evolution_api_url', { placeholder: 'https://sua-evolution-api.com' })}
          {renderField('evolution_instance', { placeholder: 'Nome da instância' })}
          {renderField('evolution_api_token')}
          {renderField('whatsapp_antonio', { placeholder: '5511999998888' })}

          <div className="rounded-lg border border-[#9C7C4C]/15 bg-[#0a1420] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Teste de conexão</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Envia uma mensagem de teste para o WhatsApp configurado acima.
                </p>
              </div>
              <Button
                type="button"
                onClick={testarEvolution}
                disabled={testandoEvolution}
                className="h-10 flex-shrink-0 bg-[#9C7C4C] text-white hover:bg-[#b08d5a]"
              >
                {testandoEvolution ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                {testandoEvolution ? 'Testando...' : 'Testar conexão'}
              </Button>
            </div>

            {testeEvolution.message && (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                  testeEvolution.type === 'success'
                    ? 'border-green-500/30 bg-green-500/10 text-green-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {testeEvolution.message}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
