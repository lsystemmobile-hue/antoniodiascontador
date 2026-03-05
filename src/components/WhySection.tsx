import { Shield, Scale, User, Lock, Wifi, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const WhySection = () => {
  const { t } = useLanguage();

  const reasons = [
    {
      icon: Shield,
      titleKey: 'why.trust.title',
      descKey: 'why.trust.desc',
    },
    {
      icon: Scale,
      titleKey: 'why.legal.title',
      descKey: 'why.legal.desc',
    },
    {
      icon: User,
      titleKey: 'why.personal.title',
      descKey: 'why.personal.desc',
    },
    {
      icon: Lock,
      titleKey: 'why.security.title',
      descKey: 'why.security.desc',
    },
    {
      icon: Wifi,
      titleKey: 'why.online.title',
      descKey: 'why.online.desc',
    },
    {
      icon: Award,
      titleKey: 'why.experience.title',
      descKey: 'why.experience.desc',
    },
  ];

  return (
    <section id="why" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsl(222_40%_12%)_0%,_transparent_70%)]" />

      <div className="relative z-10 section-container">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
            Diferenciais
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t('why.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('why.subtitle')}
          </p>
        </ScrollReveal>

        {/* Reasons Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {reasons.map((reason, index) => (
            <ScrollReveal
              key={index}
              delay={index * 150}
            >
              <div
                className="group text-center p-8 rounded-2xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 hover-lift h-full"
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <reason.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {t(reason.titleKey)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(reason.descKey)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
