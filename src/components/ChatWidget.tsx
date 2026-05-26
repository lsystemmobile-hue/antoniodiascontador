import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ASSISTANT_CHAT_EVENT, AssistantChatEventDetail } from '@/lib/chatEvents';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

const START_MESSAGE = '__inicio__';
const SESSION_KEY = 'ad_chat_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ASSISTANT_AVATAR = '/avatar-assistente.png';
const DESKTOP_TEASER_ALIGNMENT_TWEAK = -15;
const LAUNCHER_WIDTH = 196;

type AssistantSide = 'left' | 'right';

interface Mensagem {
  papel: 'usuario' | 'assistente';
  conteudo: string;
}

interface ChatResponse {
  assistant_name?: string;
  error?: string;
  resposta?: string;
  sessao_id?: string;
}

interface StoredSession {
  id: string;
  updatedAt: number;
}

const QUICK_ACTION_KEYS = [
  { labelKey: 'chat.quick.saida', promptKey: 'chat.prompt.saida' },
  { labelKey: 'chat.quick.ir', promptKey: 'chat.prompt.ir' },
  { labelKey: 'chat.quick.price', promptKey: 'chat.prompt.price' },
  { labelKey: 'chat.quick.planning', promptKey: 'chat.prompt.planning' },
];

const TEASER_KEYS = [
  { titleKey: 'chat.teaser.1.title', subtitleKey: 'chat.teaser.1.subtitle' },
  { titleKey: 'chat.teaser.2.title', subtitleKey: 'chat.teaser.2.subtitle' },
  { titleKey: 'chat.teaser.3.title', subtitleKey: 'chat.teaser.3.subtitle' },
  { titleKey: 'chat.teaser.4.title', subtitleKey: 'chat.teaser.4.subtitle' },
];

function loadStoredSession(): string | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.id || !parsed.updatedAt || Date.now() - parsed.updatedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed.id;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveStoredSession(id: string) {
  const payload: StoredSession = { id, updatedAt: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function extractInvokeError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }

  return fallback;
}

async function invokePublicChat(body: Record<string, string | null | undefined>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: ChatResponse = {};

  if (text) {
    try {
      data = JSON.parse(text) as ChatResponse;
    } catch {
      throw new Error('Invalid edge function response');
    }
  }

  if (!response.ok) {
    throw new Error(extractInvokeError(data, `HTTP ${response.status}`));
  }

  return data;
}

export const ChatWidget = () => {
  const { language, t } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const [assistantSide, setAssistantSide] = useState<AssistantSide>('right');
  const [openSide, setOpenSide] = useState<AssistantSide | null>(null);
  const [mostrarFlutuante, setMostrarFlutuante] = useState(false);
  const [launcherPositionX, setLauncherPositionX] = useState(24);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const [teaserAtual, setTeaserAtual] = useState(0);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingAutoSendRef = useRef<string | null>(null);
  const mostrarSugestoesIniciais =
    !carregando && mensagens.length > 0 && mensagens.every((mensagem) => mensagem.papel === 'assistente');
  const displayedOpenSide = openSide ?? assistantSide;
  const teaser = TEASER_KEYS[teaserAtual];
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
  const openPositionClass = displayedOpenSide === 'left' ? 'left-8 sm:left-12' : 'right-8 sm:right-12';
  const openAnimationClass =
    displayedOpenSide === 'left'
      ? 'animate-in fade-in slide-in-from-bottom-4 slide-in-from-left-4 duration-300'
      : 'animate-in fade-in slide-in-from-bottom-4 slide-in-from-right-4 duration-300';

  useEffect(() => {
    setSessaoId(loadStoredSession());

    const timer = window.setTimeout(() => setMostrarFlutuante(true), 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const heroSection = document.getElementById('hero');
    const aboutSection = document.getElementById('about');
    if (!heroSection || !aboutSection) return undefined;

    const updateSideFromSection = () => {
      const focusLine = window.innerHeight * 0.45;
      const heroRect = heroSection.getBoundingClientRect();
      const aboutRect = aboutSection.getBoundingClientRect();

      if (
        window.scrollY <= Math.max(heroSection.offsetHeight * 0.2, 96) ||
        (heroRect.top <= focusLine && heroRect.bottom >= focusLine)
      ) {
        setAssistantSide('right');
        return;
      }

      if (aboutRect.top <= focusLine && aboutRect.bottom >= focusLine) {
        setAssistantSide('left');
        return;
      }

      setAssistantSide('right');
    };
    const syncSideWithScroll = () => updateSideFromSection();

    window.addEventListener('scroll', syncSideWithScroll, { passive: true });
    window.addEventListener('resize', syncSideWithScroll);
    updateSideFromSection();
    const settleTimer = window.setTimeout(updateSideFromSection, 120);

    return () => {
      window.removeEventListener('scroll', syncSideWithScroll);
      window.removeEventListener('resize', syncSideWithScroll);
      window.clearTimeout(settleTimer);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  useEffect(() => {
    if (aberto && inputRef.current) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aberto]);

  useEffect(() => {
    if (aberto) return undefined;

    const interval = window.setInterval(() => {
      setTeaserAtual((atual) => (atual + 1) % TEASER_KEYS.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [aberto]);

  useEffect(() => {
    const updateLauncherOffset = () => {
      if (window.innerWidth >= 768) {
        const firstSectionContainer = document.querySelector<HTMLElement>('main .section-container');
        const dirpfHeading = Array.from(document.querySelectorAll<HTMLElement>('#services h3')).find((heading) =>
          heading.textContent?.trim() === t('services.contabil.title')
        );
        const servicesCard = dirpfHeading?.closest<HTMLElement>('.group.relative');
        const desktopLeftOffset = Math.round(firstSectionContainer?.getBoundingClientRect().left ?? 32);

        if (servicesCard) {
          const rect = servicesCard.getBoundingClientRect();
          const desktopRightOffset = Math.max(window.innerWidth - rect.right + DESKTOP_TEASER_ALIGNMENT_TWEAK, 0);
          const nextPositionX =
            assistantSide === 'left'
              ? desktopLeftOffset
              : Math.max(window.innerWidth - desktopRightOffset - LAUNCHER_WIDTH, 0);
          setLauncherPositionX(Math.round(nextPositionX));
          return;
        }

        const fallbackDesktopX =
          assistantSide === 'left'
            ? desktopLeftOffset
            : Math.max(window.innerWidth - desktopLeftOffset - LAUNCHER_WIDTH, 0);
        setLauncherPositionX(Math.round(fallbackDesktopX));
        return;
      }

      const heroButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(t('hero.analysisCta'))
      );

      if (heroButton) {
        const rect = heroButton.getBoundingClientRect();
        const nextPositionX =
          assistantSide === 'left'
            ? rect.left
            : Math.max(rect.right - LAUNCHER_WIDTH, 0);
        setLauncherPositionX(Math.round(nextPositionX));
        return;
      }

      const fallbackOffset = window.innerWidth >= 1024 ? 32 : window.innerWidth >= 640 ? 24 : 16;
      const fallbackPositionX =
        assistantSide === 'left'
          ? fallbackOffset
          : Math.max(window.innerWidth - fallbackOffset - LAUNCHER_WIDTH, 0);
      setLauncherPositionX(fallbackPositionX);
    };

    updateLauncherOffset();
    window.addEventListener('resize', updateLauncherOffset);
    return () => window.removeEventListener('resize', updateLauncherOffset);
  }, [assistantSide, language, t]);

  const abrirChat = useCallback(() => {
    setOpenSide(assistantSide);
    setAberto(true);
  }, [assistantSide]);

  const fecharChat = useCallback(() => {
    pendingAutoSendRef.current = null;
    setAberto(false);
    setOpenSide(null);
  }, []);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const detail = (event as CustomEvent<AssistantChatEventDetail>).detail;
      if (detail?.draft) {
        setInput(detail.draft);
        pendingAutoSendRef.current = detail.autoSend ? detail.draft : null;
      }
      abrirChat();
    };

    window.addEventListener(ASSISTANT_CHAT_EVENT, handleOpenChat);
    return () => window.removeEventListener(ASSISTANT_CHAT_EVENT, handleOpenChat);
  }, [abrirChat]);

  const persistSession = useCallback((id?: string) => {
    if (!id) return;
    setSessaoId(id);
    saveStoredSession(id);
  }, []);

  const invokeChat = useCallback(async (body: Record<string, string | null | undefined>) => {
    try {
      return await invokePublicChat({ ...body, language });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const normalizedMessage = message.toLowerCase();
      const shouldHideTechnicalMessage =
        !message ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('failed to send a request') ||
        normalizedMessage.includes('networkerror') ||
        normalizedMessage.includes('invalid edge function response');

      throw new Error(shouldHideTechnicalMessage ? t('chat.error.connection') : message);
    }
  }, [language, t]);

  const iniciarConversa = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await invokeChat({ sessao_id: sessaoId, mensagem: START_MESSAGE });
      persistSession(data.sessao_id);
      setAssistantName(data.assistant_name || null);

      if (data.resposta) {
        setMensagens([{ papel: 'assistente', conteudo: data.resposta }]);
      }
    } catch {
      setMensagens([
        {
          papel: 'assistente',
          conteudo: t('chat.fallback'),
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }, [invokeChat, persistSession, sessaoId, t]);

  useEffect(() => {
    if (aberto && !iniciado && mensagens.length === 0) {
      setIniciado(true);
      void iniciarConversa();
    }
  }, [aberto, iniciado, iniciarConversa, mensagens.length]);

  const resetConversation = useCallback(() => {
    clearStoredSession();
    pendingAutoSendRef.current = null;
    setSessaoId(null);
    setMensagens([]);
    setInput('');
    setAssistantName(null);
    setIniciado(false);
  }, []);

  const enviarMensagem = useCallback(
    async (textoOriginal: string) => {
      const texto = textoOriginal.trim();
      if (!texto || carregando) return;

      const novaMensagem: Mensagem = { papel: 'usuario', conteudo: texto };
      setMensagens((prev) => [...prev, novaMensagem]);
      setInput('');
      setCarregando(true);

      try {
        const data = await invokeChat({ sessao_id: sessaoId, mensagem: texto });
        persistSession(data.sessao_id);
        setAssistantName(data.assistant_name || null);

        if (data.resposta) {
          setMensagens((prev) => [...prev, { papel: 'assistente', conteudo: data.resposta }]);
        } else if (data.error) {
          setMensagens((prev) => [
            ...prev,
            {
              papel: 'assistente',
              conteudo: data.error,
            },
          ]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t('chat.error.connection');
        setMensagens((prev) => [
          ...prev,
          {
            papel: 'assistente',
            conteudo: message || t('chat.error.connection'),
          },
        ]);
      } finally {
        setCarregando(false);
      }
    },
    [carregando, invokeChat, persistSession, sessaoId, t],
  );

  const enviar = () => {
    void enviarMensagem(input);
  };

  useEffect(() => {
    const pendingMessage = pendingAutoSendRef.current;
    if (!aberto || !iniciado || carregando || mensagens.length === 0 || !pendingMessage) return;

    pendingAutoSendRef.current = null;
    void enviarMensagem(pendingMessage);
  }, [aberto, carregando, enviarMensagem, iniciado, mensagens.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label={t('chat.close')}
          onClick={fecharChat}
          className="fixed inset-0 z-40 bg-[#020617]/18 backdrop-blur-[3px] transition-opacity duration-300"
        />
      )}

      {aberto && (
        <div
          className={`fixed bottom-6 sm:bottom-10 ${openPositionClass} z-50 w-[calc(100vw-4rem)] sm:w-96 flex flex-col bg-[#0F1B2E] border border-[#9C7C4C]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden ${openAnimationClass}`}
          style={{ maxHeight: 'min(520px, calc(100dvh - 4rem))' }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a1420] border-b border-[#9C7C4C]/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border border-[#9C7C4C]/50 overflow-hidden bg-[#9C7C4C]/20">
                  <img src={ASSISTANT_AVATAR} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0a1420]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">
                  {assistantName || t('chat.header.title')}
                </p>
                <p className="text-xs text-[#9C7C4C] mt-0.5">{t('chat.header.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t('chat.reset')}
                title={t('chat.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={fecharChat}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t('chat.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
            {mensagens.length === 0 && carregando && (
              <div className="flex justify-start">
                <div className="bg-[#1a2d47] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                  <DigitandoDots />
                </div>
              </div>
            )}

            {mensagens.map((msg, i) => (
              <div key={`${msg.papel}-${i}`} className={`flex ${msg.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[82%] text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.papel === 'usuario'
                      ? 'bg-[#9C7C4C] text-white rounded-tr-sm'
                      : 'bg-[#1a2d47] text-gray-100 rounded-tl-sm'
                  }`}
                >
                  {msg.conteudo}
                </div>
              </div>
            ))}

            {mostrarSugestoesIniciais && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_ACTION_KEYS.map((action) => (
                  <button
                    key={action.labelKey}
                    type="button"
                    onClick={() => void enviarMensagem(t(action.promptKey))}
                    className="rounded-full border border-[#9C7C4C]/25 bg-[#9C7C4C]/10 px-3 py-1.5 text-xs font-medium text-[#d5b783] transition-colors hover:border-[#9C7C4C]/50 hover:bg-[#9C7C4C]/20"
                  >
                    {t(action.labelKey)}
                  </button>
                ))}
              </div>
            )}

            {carregando && mensagens.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-[#1a2d47] rounded-2xl rounded-tl-sm px-4 py-3">
                  <DigitandoDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-[#9C7C4C]/20 bg-[#0a1420]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.input.placeholder')}
                rows={1}
                disabled={carregando}
                className="flex-1 resize-none bg-[#0F1B2E] border border-[#9C7C4C]/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#9C7C4C]/60 transition-colors disabled:opacity-50 max-h-28 overflow-y-auto"
                style={{ lineHeight: '1.4' }}
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || carregando}
                className="p-2.5 rounded-xl bg-[#9C7C4C] text-white hover:bg-[#b08d5a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label={t('chat.send')}
              >
                {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-2">{t('chat.footer')}</p>
          </div>
        </div>
      )}

      {!aberto && mostrarFlutuante && (
        <div
          className="fixed bottom-24 sm:bottom-32 z-50 pointer-events-none transition-[left,transform,opacity] duration-500 ease-in-out"
          style={{ left: `${launcherPositionX}px` }}
        >
          <div className="pointer-events-auto w-[196px] motion-reduce:transition-none">
            <div className="flex w-full flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-6 duration-700 motion-reduce:animate-none">
                <button
                  type="button"
                  onClick={abrirChat}
                  className="flex min-h-[68px] w-[196px] flex-col items-center justify-center rounded-2xl border border-[#9C7C4C]/22 bg-[#08111d] px-3.5 py-2 text-center shadow-[0_14px_34px_rgba(0,0,0,0.42)] transition-all duration-300 hover:border-[#9C7C4C]/42 hover:bg-[#0b1624]"
                >
                  <span
                    key={`${teaser.titleKey}-title`}
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f4efe6] animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    {t(teaser.titleKey)}
                  </span>
                  <span
                    key={`${teaser.subtitleKey}-subtitle`}
                    className="mt-1 block text-[10px] text-[#bfa983] animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    {t(teaser.subtitleKey)}
                  </span>
                </button>

                <button
                  onClick={abrirChat}
                  className="group relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#9C7C4C]/38 bg-[#0b1522] text-white shadow-[0_12px_28px_rgba(0,0,0,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9C7C4C]/55 hover:shadow-[0_14px_34px_rgba(156,124,76,0.26)] active:scale-95"
                  aria-label={t('chat.open')}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-[#d5b783]/55" />
                  <div className="absolute inset-[7px] rounded-full border border-[#9C7C4C]/20" />
                  <img
                    src={ASSISTANT_AVATAR}
                    alt=""
                    className="relative z-10 h-[60px] w-[60px] rounded-full object-cover"
                    aria-hidden="true"
                  />
                  <span className="absolute bottom-[7px] right-[7px] z-20 h-2.5 w-2.5 rounded-full border-2 border-[#0b1522] bg-emerald-400" />
                </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

const DigitandoDots = () => (
  <div className="flex gap-1 items-center h-4">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 bg-[#9C7C4C] rounded-full animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
      />
    ))}
  </div>
);
