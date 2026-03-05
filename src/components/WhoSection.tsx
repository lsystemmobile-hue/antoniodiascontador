import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const WhoSection = () => {
  const { t } = useLanguage();

  const items = [
    'who.item1',
    'who.item2',
    'who.item3',
    'who.item4',
    'who.item5',
    'who.item6',
  ];

  return (
    <section id="who" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-light/30 to-background" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative z-10 section-container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <ScrollReveal className="text-center mb-16">
            <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
              Público Ideal
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('who.title')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('who.subtitle')}
            </p>
          </ScrollReveal>

          {/* Items Grid */}
          <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
            {items.map((itemKey, index) => (
              <ScrollReveal
                key={index}
                delay={index * 100}
              >
                <div
                  className="flex items-start gap-4 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 transition-all duration-300 h-full"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground leading-relaxed">
                    {t(itemKey)}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
