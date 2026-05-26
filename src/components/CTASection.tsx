import { ArrowRight, Bot } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { openAssistantChat } from '@/lib/chatEvents';
import { WHATSAPP_LINK } from '@/lib/contact';

export const CTASection = () => {
  const { t } = useLanguage();

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-light/50 to-background" />

      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative z-10 section-container">
        <div className="max-w-3xl mx-auto text-center">
          {/* Main CTA Card */}
          <ScrollReveal>
            <div className="p-8 md:p-12 lg:p-16 rounded-3xl bg-card border border-primary/20 shadow-[0_0_60px_hsl(43_85%_55%_/_0.1)]">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-8 animate-pulse-gold">
                <Bot className="w-10 h-10 text-primary" />
              </div>

              {/* Content */}
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                {t('cta.title')}
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-xl mx-auto">
                {t('cta.subtitle')}
              </p>

              {/* CTA Button */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="gold"
                className="group h-auto w-full justify-center rounded-2xl px-8 py-4 text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/20 sm:w-[20rem]"
                onClick={() => openAssistantChat()}
              >
                  <Bot className="w-5 h-5" />
                  {t('cta.button')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="goldOutline"
                className="h-auto w-full justify-center rounded-2xl px-8 py-4 text-base sm:w-[20rem]"
                asChild
              >
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-3">
                  <WhatsAppIcon className="w-5 h-5" />
                  {t('cta.whatsapp')}
                </a>
              </Button>
              </div>

              {/* Note */}
              <p className="text-muted-foreground text-sm mt-6">
                {t('cta.note')}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
