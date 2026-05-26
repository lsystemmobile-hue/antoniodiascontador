import { useEffect, useRef, useState } from 'react';
import {
  Plus, BookOpen, Trash2, ChevronDown, ChevronUp,
  Loader2, Sparkles, Upload, X, FileJson, FileText, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Artigo {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  ativo: boolean;
  embedding: unknown;
  criado_em: string;
}

interface ImportItem {
  titulo: string;
  conteudo: string;
  categoria: string;
}

interface Progresso {
  fase: 'salvando' | 'embeddings' | 'concluido';
  atual: number;
  total: number;
}

interface EmbeddingResult {
  ok: boolean;
  error?: string;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

// Resolve field value trying multiple possible key names
function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (obj[k] && typeof obj[k] === 'string' && obj[k].trim()) return obj[k].trim();
  }
  return '';
}

const TITULO_KEYS  = ['titulo', 'title', 'nome', 'name', 'assunto', 'subject', 'heading', 'topic', 'pergunta', 'question'];
const CONTEUDO_KEYS = ['conteudo', 'content', 'texto', 'text', 'body', 'description', 'descricao', 'resposta', 'answer', 'details', 'informacao', 'informacoes', 'explicacao'];
const CATEGORIA_KEYS = ['categoria', 'category', 'tipo', 'type', 'tag', 'section', 'area', 'tema'];

function normalizarItem(obj: unknown): ImportItem | null {
  if (!obj || typeof obj !== 'object') return null;
  const registro = obj as Record<string, unknown>;
  const titulo   = pick(registro, TITULO_KEYS);
  const conteudo = pick(registro, CONTEUDO_KEYS);
  if (!titulo || !conteudo) return null;
  return {
    titulo,
    conteudo,
    categoria: pick(registro, CATEGORIA_KEYS) || 'Geral',
  };
}

function extrairArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    // ChatGPT might wrap: { articles: [...] } or { base_conhecimento: [...] } etc.
    for (const v of Object.values(data as object)) {
      if (Array.isArray(v) && v.length > 0) return v;
    }
    // Single object
    return [data];
  }
  return [];
}

function parseJSON(texto: string): ImportItem[] {
  const data = JSON.parse(texto);
  const items = extrairArray(data);
  return items.map(normalizarItem).filter((i): i is ImportItem => i !== null);
}

function parseMarkdown(texto: string, nomeArquivo: string): ImportItem[] {
  // Split on ## or ### headings → each section = one article
  const partes = texto.split(/^#{2,3}\s+/m).filter(s => s.trim());
  if (partes.length > 1) {
    return partes
      .map(parte => {
        const linhas = parte.trim().split('\n');
        const titulo = linhas[0].replace(/^#+\s*/, '').trim();
        const conteudo = linhas.slice(1).join('\n').trim();
        return { titulo, conteudo: conteudo || titulo, categoria: 'Geral' };
      })
      .filter(a => a.titulo && a.conteudo.length > 10);
  }
  // Single-section markdown → one article, filename as title
  return [{
    titulo: nomeArquivo.replace(/\.(md|txt)$/i, '').replace(/[-_]/g, ' '),
    conteudo: texto.trim(),
    categoria: 'Geral',
  }];
}

function parseTxt(texto: string, nomeArquivo: string): ImportItem[] {
  return [{
    titulo: nomeArquivo.replace(/\.txt$/i, '').replace(/[-_]/g, ' '),
    conteudo: texto.trim(),
    categoria: 'Geral',
  }];
}

async function lerArquivo(file: File): Promise<ImportItem[]> {
  const texto = await file.text();
  const nome = file.name;
  if (nome.endsWith('.json')) return parseJSON(texto);
  if (nome.endsWith('.md')) return parseMarkdown(texto, nome);
  return parseTxt(texto, nome);
}

function extrairErroFunction(data: unknown, fallback?: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback || 'Falha ao gerar embedding.';
}

async function extrairErroInvoke(data: unknown, error: Error): Promise<string> {
  const fallback = extrairErroFunction(data, error.message);
  const context = (error as Error & { context?: unknown }).context;

  if (context instanceof Response) {
    const response = context.clone();
    try {
      return extrairErroFunction(await response.json(), fallback);
    } catch {
      try {
        const text = await context.clone().text();
        return text.trim() || fallback;
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

// ── Componente principal ──────────────────────────────────────────────────────

export const AdminBaseConhecimento = () => {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gerandoEmb, setGerandoEmb] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', conteudo: '', categoria: '' });

  // Import state
  const [modalImport, setModalImport] = useState(false);
  const [fila, setFila] = useState<ImportItem[]>([]);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [erroImport, setErroImport] = useState('');
  const [erroEmbedding, setErroEmbedding] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const { data } = await supabase
      .from('base_conhecimento')
      .select('id, titulo, conteudo, categoria, ativo, embedding, criado_em')
      .order('criado_em', { ascending: false });
    setArtigos(data ?? []);
    setCarregando(false);
  };

  const gerarEmbedding = async (id: string): Promise<EmbeddingResult> => {
    setErroEmbedding('');
    setGerandoEmb(id);
    const { data, error } = await supabase.functions.invoke('gerar-embedding', { body: { id } });
    if (!error) {
      setArtigos(prev => prev.map(a => a.id === id ? { ...a, embedding: 'ok' } : a));
      setGerandoEmb(null);
      return { ok: true };
    } else {
      const message = await extrairErroInvoke(data, error);
      setErroEmbedding(message);
      setGerandoEmb(null);
      return { ok: false, error: message };
    }
  };

  const salvar = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) return;
    setSalvando(true);
    const { data: novo, error } = await supabase
      .from('base_conhecimento')
      .insert({ titulo: form.titulo.trim(), conteudo: form.conteudo.trim(), categoria: form.categoria.trim() || 'Geral', ativo: true })
      .select('id')
      .single();
    if (!error && novo) {
      setForm({ titulo: '', conteudo: '', categoria: '' });
      setFormulario(false);
      await carregar();
      await gerarEmbedding(novo.id);
    }
    setSalvando(false);
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;
    await supabase.from('base_conhecimento').delete().eq('id', id);
    setArtigos(prev => prev.filter(a => a.id !== id));
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('base_conhecimento').update({ ativo: !ativo }).eq('id', id);
    setArtigos(prev => prev.map(a => a.id === id ? { ...a, ativo: !ativo } : a));
  };

  // ── Import handlers ────────────────────────────────────────────────────────

  const processarArquivos = async (files: FileList | File[]) => {
    setErroImport('');
    const lista: ImportItem[] = [];
    for (const f of Array.from(files)) {
      try {
        const items = await lerArquivo(f);
        lista.push(...items);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'formato invalido';
        setErroImport(`Erro ao ler "${f.name}": ${message}.`);
        return;
      }
    }
    if (lista.length > 0) {
      setFila(lista);
    } else {
      setErroImport(
        'Nenhum artigo encontrado no arquivo. Verifique se o JSON tem os campos de título e conteúdo. ' +
        'Campos aceitos — título: titulo, title, nome, name, assunto. ' +
        'Conteúdo: conteudo, content, texto, text, description, resposta.'
      );
    }
  };

  const confirmarImport = async () => {
    if (fila.length === 0) return;
    setErroImport('');

    // 1. Salvar todos os artigos
    setProgresso({ fase: 'salvando', atual: 0, total: fila.length });
    const ids: string[] = [];

    for (let i = 0; i < fila.length; i++) {
      const item = fila[i];
      const { data, error } = await supabase
        .from('base_conhecimento')
        .insert({ titulo: item.titulo, conteudo: item.conteudo, categoria: item.categoria, ativo: true })
        .select('id')
        .single();
      if (error) {
        setProgresso(null);
        setErroImport(`Erro ao salvar "${item.titulo}": ${error.message}`);
        return;
      }
      if (data?.id) ids.push(data.id);
      setProgresso({ fase: 'salvando', atual: i + 1, total: fila.length });
    }

    // 2. Gerar embeddings
    for (let i = 0; i < ids.length; i++) {
      setProgresso({ fase: 'embeddings', atual: i + 1, total: ids.length });
      const result = await gerarEmbedding(ids[i]);
      if (!result.ok) {
        setProgresso(null);
        setErroImport(`Erro ao gerar embedding do artigo ${i + 1}. ${result.error || 'Verifique a Edge Function gerar-embedding.'}`);
        return;
      }
    }

    setProgresso({ fase: 'concluido', atual: ids.length, total: ids.length });
    await carregar();

    // Reset after 2s
    setTimeout(() => {
      setProgresso(null);
      setFila([]);
      setModalImport(false);
    }, 2000);
  };

  const fecharModal = () => {
    if (progresso && progresso.fase !== 'concluido') return;
    setModalImport(false);
    setFila([]);
    setProgresso(null);
    setErroImport('');
    setErroEmbedding('');
  };

  const semEmbedding = artigos.filter(a => !a.embedding);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Base de Conhecimento</h1>
          <p className="text-gray-400 text-sm mt-1">Conteúdo usado pelo assistente para responder perguntas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setModalImport(true); setFila([]); setProgresso(null); }}
            className="flex items-center gap-2 bg-[#0a1420] border border-[#9C7C4C]/30 hover:border-[#9C7C4C]/60 text-[#9C7C4C] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={() => setFormulario(!formulario)}
            className="flex items-center gap-2 bg-[#9C7C4C] hover:bg-[#b08d5a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Artigo
          </button>
        </div>
      </div>

      {/* Alerta sem embedding */}
      {semEmbedding.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400 text-sm flex-1">
            {semEmbedding.length} artigo(s) sem embedding — o assistente não os encontrará na busca.
          </p>
          <button
            onClick={async () => {
              for (const a of semEmbedding) {
                const result = await gerarEmbedding(a.id);
                if (!result.ok) break;
              }
            }}
            className="text-yellow-400 text-xs font-semibold hover:text-yellow-300 underline flex-shrink-0"
          >
            Gerar todos
          </button>
        </div>
      )}

      {erroEmbedding && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-300 text-sm font-medium">Erro ao gerar embedding</p>
          <p className="text-red-200/80 text-xs mt-1 break-words">{erroEmbedding}</p>
        </div>
      )}

      {/* Formulário manual */}
      {formulario && (
        <div className="bg-[#0a1420] border border-[#9C7C4C]/30 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Novo Artigo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-1.5">Título</label>
              <input type="text" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Saída Fiscal Definitiva"
                className="w-full bg-[#0F1B2E] border border-[#9C7C4C]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9C7C4C]/50" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Categoria</label>
              <input type="text" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                placeholder="Ex: Serviços"
                className="w-full bg-[#0F1B2E] border border-[#9C7C4C]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9C7C4C]/50" />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-1.5">Conteúdo</label>
              <textarea value={form.conteudo} onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                rows={6} placeholder="Descreva o conteúdo..."
                className="w-full bg-[#0F1B2E] border border-[#9C7C4C]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9C7C4C]/50 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setFormulario(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !form.titulo.trim() || !form.conteudo.trim()}
              className="flex items-center gap-2 bg-[#9C7C4C] hover:bg-[#b08d5a] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {carregando ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : artigos.length === 0 ? (
        <div className="bg-[#0a1420] border border-[#9C7C4C]/15 rounded-2xl p-12 text-center text-gray-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum artigo ainda.</p>
          <p className="text-xs mt-1">Use "Importar" para carregar vários de uma vez.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {artigos.map(artigo => (
            <div key={artigo.id} className="bg-[#0a1420] border border-[#9C7C4C]/15 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm truncate">{artigo.titulo}</p>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">{artigo.categoria}</span>
                    {!artigo.embedding && (
                      <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex-shrink-0">sem embedding</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{new Date(artigo.criado_em).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => gerarEmbedding(artigo.id)} disabled={gerandoEmb === artigo.id}
                  title="Gerar/atualizar embedding"
                  className="p-1.5 text-gray-500 hover:text-[#9C7C4C] transition-colors flex-shrink-0">
                  {gerandoEmb === artigo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
                <button onClick={() => toggleAtivo(artigo.id, artigo.ativo)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${artigo.ativo ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-500 border-gray-500/30'}`}>
                  {artigo.ativo ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => setExpandido(expandido === artigo.id ? null : artigo.id)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                  {expandido === artigo.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => excluir(artigo.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {expandido === artigo.id && (
                <div className="px-5 pb-4 border-t border-[#9C7C4C]/10 pt-3">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{artigo.conteudo}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Importação ── */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-2xl bg-[#0a1420] border border-[#9C7C4C]/20 rounded-2xl flex flex-col max-h-[90vh]">

            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#9C7C4C]/15">
              <div>
                <h2 className="text-white font-semibold">Importar Base de Conhecimento</h2>
                <p className="text-gray-400 text-xs mt-0.5">JSON, Markdown (.md) ou texto (.txt)</p>
              </div>
              {(!progresso || progresso.fase === 'concluido') && (
                <button onClick={fecharModal} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {erroImport && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erroImport}</p>
              )}

              {/* Progresso */}
              {progresso ? (
                <div className="space-y-4">
                  {progresso.fase === 'concluido' ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <CheckCircle2 className="w-12 h-12 text-green-400" />
                      <p className="text-white font-semibold text-lg">{progresso.total} artigos importados!</p>
                      <p className="text-gray-400 text-sm">Embeddings gerados. O assistente já pode usar o conteúdo.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-white text-sm font-medium">
                        {progresso.fase === 'salvando' ? 'Salvando artigos...' : 'Gerando embeddings...'}
                        <span className="text-gray-400 ml-2">{progresso.atual} / {progresso.total}</span>
                      </p>
                      <div className="w-full bg-[#0F1B2E] rounded-full h-2">
                        <div
                          className="bg-[#9C7C4C] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs">
                        {progresso.fase === 'embeddings'
                          ? 'Cada artigo requer uma chamada à API Gemini — isso pode levar alguns segundos.'
                          : 'Inserindo no banco de dados...'}
                      </p>
                    </div>
                  )}
                </div>
              ) : fila.length > 0 ? (
                /* Preview dos artigos */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm">{fila.length} artigos encontrados</p>
                    <button onClick={() => setFila([])} className="text-gray-500 hover:text-white text-xs">Limpar</button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {fila.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 bg-[#0F1B2E] rounded-xl px-4 py-3">
                        <span className="text-gray-600 text-xs w-6 flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.titulo}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-500 text-xs">{item.categoria}</span>
                            <span className="text-gray-600 text-xs">·</span>
                            <span className="text-gray-600 text-xs">{item.conteudo.length} caracteres</span>
                          </div>
                        </div>
                        <button onClick={() => setFila(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Drop zone + formato */
                <div className="space-y-5">
                  {/* Formatos aceitos */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: FileJson, label: '.json', desc: 'Array de artigos' },
                      { icon: FileText, label: '.md', desc: 'Seções ## viram artigos' },
                      { icon: FileText, label: '.txt', desc: 'Um arquivo = um artigo' },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="bg-[#0F1B2E] rounded-xl p-3 text-center">
                        <Icon className="w-5 h-5 text-[#9C7C4C] mx-auto mb-1.5" />
                        <p className="text-white text-xs font-semibold">{label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* JSON template */}
                  <div className="bg-[#0F1B2E] rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wider">Formato JSON esperado</p>
                    <pre className="text-xs text-gray-300 leading-relaxed overflow-x-auto">{`[
  {
    "titulo": "Saída Fiscal Definitiva",
    "categoria": "Serviços",
    "conteudo": "Texto completo do artigo..."
  },
  {
    "titulo": "Declaração de IR para Não Residentes",
    "categoria": "Imposto de Renda",
    "conteudo": "..."
  }
]`}</pre>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivos(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-[#9C7C4C] bg-[#9C7C4C]/10' : 'border-[#9C7C4C]/20 hover:border-[#9C7C4C]/50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#9C7C4C]/50 mx-auto mb-3" />
                    <p className="text-white text-sm font-medium">Arraste os arquivos ou clique para selecionar</p>
                    <p className="text-gray-500 text-xs mt-1">Vários arquivos permitidos</p>
                  </div>
                  <input
                    ref={fileRef} type="file" multiple
                    accept=".json,.txt,.md"
                    className="hidden"
                    onChange={e => e.target.files && processarArquivos(e.target.files)}
                  />
                </div>
              )}
            </div>

            {/* Footer do modal */}
            {!progresso && fila.length > 0 && (
              <div className="px-6 py-4 border-t border-[#9C7C4C]/15 flex items-center justify-between">
                <p className="text-gray-400 text-sm">{fila.length} artigos + embeddings serão gerados</p>
                <div className="flex gap-3">
                  <button onClick={() => setFila([])} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Voltar</button>
                  <button
                    onClick={confirmarImport}
                    className="flex items-center gap-2 bg-[#9C7C4C] hover:bg-[#b08d5a] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Importar {fila.length} artigos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
