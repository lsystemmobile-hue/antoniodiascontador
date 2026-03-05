import { FileText, Calculator, Plane, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: FileText,
      titleKey: 'services.saida.title',
      descKey: 'services.saida.desc',
    },
    {
      icon: Calculator,
      titleKey: 'services.contabil.title',
      descKey: 'services.contabil.desc',
    },
    {
      icon: Plane,
      titleKey: 'services.imigracao.title',
      descKey: 'services.imigracao.desc',
    },
    {
      icon: Building2,
      titleKey: 'services.sucessorio.title',
      descKey: 'services.sucessorio.desc',
    },
  ];

  return (
    <section id="services" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(222_40%_12%)_0%,_transparent_70%)]" />

      <div className="relative z-10 section-container">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
            {t('nav.services')}
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t('services.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('services.subtitle')}
          </p>
        </ScrollReveal>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <ScrollReveal
              key={index}
              delay={index * 150}
            >
              <div
                className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover-lift hover-glow h-full"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {t(service.titleKey)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(service.descKey)}
                </p>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-tr-2xl" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
