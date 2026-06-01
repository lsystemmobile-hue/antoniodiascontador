import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { openAssistantChat } from '@/lib/chatEvents';

export const HeroSection = () => {
  const { language, t } = useLanguage();
  const renderHeadline = (text: string) =>
    text.split(' ').map((word, index) => {
      const highlightWords = ['ir', 'tax', 'taxes'];
      const normalizedWord = word.toLowerCase().replace(/[.,?]/g, '');
      const isHighlight = highlightWords.includes(normalizedWord);

      return (
        <span key={`${normalizedWord}-${index}`}>
          {isHighlight ? <span className="text-primary">{word}</span> : word}{' '}
        </span>
      );
    });
  const renderSubtitle = (text: string, forceMobileBreak = false) => {
    const highlightText = language === 'pt' ? '2 minutos' : '2 minutes';
    const breakText = language === 'pt' ? ' em 2 minutos.' : ' in 2 minutes.';
    const withBreak = forceMobileBreak ? text.replace(breakText, `\n${breakText.trimStart()}`) : text;
    const parts = withBreak.split(highlightText);

    if (parts.length === 1) return text;

    return parts.flatMap((part, index) => [
      <span key={`subtitle-part-${index}`} className="whitespace-pre-line">
        {part}
      </span>,
      index < parts.length - 1 ? (
        <span key={`subtitle-highlight-${index}`} className="font-semibold text-primary">
          {highlightText}
        </span>
      ) : null,
    ]);
  };
  const desktopHeadline = language === 'pt' ? 'Pagando IR a mais morando fora?' : t('hero.mobileHeadline');

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(222_40%_15%)_0%,_transparent_80%)]" />

      {/* Decorative background video; the poster preserves the hero while it loads. */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/hero-bg.jpg"
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.18] grayscale blur-[1px]"
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 md:bg-gradient-to-b md:from-[#020617]/72 md:via-[#020617]/32 md:to-[#020617]/76" />
      </div>

      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 opacity-50 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-primary/5 opacity-50 blur-3xl" />

      {/* Gold accent lines */}
      <div className="absolute top-20 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <ScrollReveal className="relative z-10 section-container flex min-h-[100svh] w-full items-center justify-center pt-16 pb-[15.5rem] text-center md:min-h-screen md:pt-20 md:pb-[17.5rem]">
        <div className="mx-auto flex w-full flex-col items-center justify-center">
          {/* Main Headline */}
          <h1 className="mx-auto mb-3 max-w-4xl font-display text-[1.7rem] font-bold leading-[1.08] text-foreground md:mb-4 md:text-[3.2rem] lg:text-[3.4rem]">
            <span className="md:hidden">
              Pagando <span className="text-primary">IR</span> a mais
              <br />
              morando fora?
            </span>
            <span className="hidden md:inline">{renderHeadline(desktopHeadline)}</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-5 max-w-[22rem] text-[0.95rem] leading-relaxed text-muted-foreground md:mb-7 md:max-w-none md:text-lg">
            <span className="md:hidden">{renderSubtitle(t('hero.mobileSubtitle'), true)}</span>
            <span className="hidden md:inline">{renderSubtitle(t('hero.mobileSubtitle'))}</span>
          </p>

          {/* Primary CTA */}
          <div className="flex w-full justify-center">
            <Button
              variant="hero"
              size="xl"
              onClick={() => openAssistantChat()}
              className="h-14 w-full rounded-xl px-7 text-base sm:h-16 md:max-w-sm md:text-lg"
            >
              {t('hero.analysisCta')}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
