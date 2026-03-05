import { ArrowDown } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=15997705571&text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20uma%20análise%20da%20minha%20situação%20fiscal.%20Sou%20brasileiro(a)%20morando%20no%20exterior.';

export const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(222_40%_15%)_0%,_transparent_80%)]" />

      {/* Custom Image Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-[0.20] grayscale blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-transparent to-[#020617]" />
      </div>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl opacity-50" />

      {/* Gold accent lines */}
      <div className="absolute top-20 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <ScrollReveal className="relative z-10 section-container text-center py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-primary font-medium">Contador do Imigrante</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 max-w-5xl mx-auto">
          {t('hero.headline').split(' ').map((word, index) => {
            const highlightWords = ['fiscal', 'tax', 'taxes'];
            const isHighlight = highlightWords.some(hw => word.toLowerCase().includes(hw));
            return (
              <span key={index}>
                {isHighlight ? (
                  <span className="text-primary">{word}</span>
                ) : (
                  word
                )}{' '}
              </span>
            );
          })}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button variant="hero" size="xl" asChild>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
              <WhatsAppIcon className="w-5 h-5" />
              {t('hero.cta')}
            </a>
          </Button>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#about"
          className="inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="text-sm">{t('hero.scroll')}</span>
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </a>
      </ScrollReveal>
    </section>
  );
};
