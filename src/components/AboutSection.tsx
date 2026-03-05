import { Shield, Globe, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const AboutSection = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Shield, label: 'Segurança' },
    { icon: Globe, label: 'Internacional' },
    { icon: Users, label: 'Personalizado' },
  ];

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-light/50 to-background" />

      <div className="relative z-10 section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Image/Visual */}
          <ScrollReveal className="relative group">
            {/* Main Image Container */}
            <div className="relative aspect-[4/5] md:aspect-square lg:aspect-[3/4] rounded-3xl overflow-hidden border border-primary/20 shadow-2xl">
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

              <img
                src="/antonio-dias.jpg"
                alt="Antonio Dias - Contador especializado para brasileiros no exterior"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105"
              />

              {/* Overlay Content */}
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-wider">{t('about.subtitle')}</span>
                </div>
                <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                  Antonio Dias
                </h3>
              </div>
            </div>

            {/* Decorative Background Glows */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-[80px] -z-10" />

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-card border border-primary/10 shadow-sm"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">{feature.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Right Column - Text */}
          <ScrollReveal delay={300}>
            <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
              {t('nav.about')}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-8">
              {t('about.title')}
            </h2>

            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>{t('about.p1')}</p>
              <p>{t('about.p2')}</p>
              <p>{t('about.p3')}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-border">
              <div>
                <div className="font-display text-3xl font-bold text-primary">10+</div>
                <div className="text-sm text-muted-foreground mt-1">Anos de Experiência</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground mt-1">Clientes Atendidos</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-primary">20+</div>
                <div className="text-sm text-muted-foreground mt-1">Países</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
