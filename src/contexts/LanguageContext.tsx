import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  pt: {
    // Navigation
    'nav.about': 'Sobre',
    'nav.services': 'Serviços',
    'nav.contact': 'Contato',
    
    // Hero
    'hero.headline': 'Cuidando da sua vida fiscal enquanto você vive fora do Brasil',
    'hero.subtitle': 'Contabilidade simples, estratégica e segura para brasileiros no exterior',
    'hero.cta': 'Fale Comigo no WhatsApp',
    'hero.scroll': 'Saiba mais',
    
    // About
    'about.title': 'Sobre Antonio Dias',
    'about.subtitle': 'Seu Contador de Confiança',
    'about.p1': 'Com anos de experiência em contabilidade internacional, me especializei em ajudar brasileiros que vivem no exterior a manterem sua situação fiscal regularizada no Brasil.',
    'about.p2': 'Entendo os desafios únicos que você enfrenta: diferentes fusos horários, complexidade tributária em dois países e a necessidade de ter alguém que fale sua língua e compreenda sua realidade.',
    'about.p3': 'Meu compromisso é oferecer um atendimento personalizado, transparente e acessível, cuidando de toda a sua documentação fiscal enquanto você foca no que realmente importa: sua vida no exterior.',
    
    // Services
    'services.title': 'Serviços Especializados',
    'services.subtitle': 'Soluções completas para brasileiros no exterior',
    
    'services.saida.title': 'Saída Fiscal Definitiva',
    'services.saida.desc': 'Regularize sua situação fiscal ao deixar o Brasil definitivamente. Cuido de toda a documentação necessária junto à Receita Federal, garantindo que você não tenha pendências futuras.',
    
    'services.contabil.title': 'Serviços Contábeis para Brasileiros no Exterior',
    'services.contabil.desc': 'Declaração de Imposto de Renda, DIRPF de espólio, e toda documentação fiscal necessária para quem mantém vínculos financeiros com o Brasil.',
    
    'services.imigracao.title': 'Imigração & Planejamento Fiscal',
    'services.imigracao.desc': 'Planejamento tributário estratégico para sua mudança internacional. Análise completa da sua situação para minimizar impostos e maximizar segurança.',
    
    'services.sucessorio.title': 'Sucessório & Patrimonial',
    'services.sucessorio.desc': 'Organização patrimonial e planejamento sucessório para proteger seu patrimônio e garantir tranquilidade para você e sua família.',
    
    // Who is this for
    'who.title': 'Para Quem É Este Serviço?',
    'who.subtitle': 'Se você se identifica com alguma dessas situações, posso te ajudar',
    'who.item1': 'Brasileiros que moram no exterior e precisam manter a situação fiscal regularizada',
    'who.item2': 'Pessoas planejando se mudar para outro país e querem fazer tudo corretamente',
    'who.item3': 'Imigrantes que ainda possuem bens, investimentos ou rendimentos no Brasil',
    'who.item4': 'Famílias que precisam de planejamento sucessório internacional',
    'who.item5': 'Profissionais que trabalham remotamente para empresas brasileiras morando fora',
    'who.item6': 'Aposentados brasileiros vivendo no exterior',
    
    // Why trust
    'why.title': 'Por Que Confiar em Antonio Dias?',
    'why.subtitle': 'Diferenciais que fazem a diferença',
    
    'why.trust.title': 'Confiança e Transparência',
    'why.trust.desc': 'Comunicação clara e honesta sobre sua situação fiscal. Sem surpresas.',
    
    'why.legal.title': 'Conformidade Legal',
    'why.legal.desc': 'Trabalho dentro da lei, garantindo que você esteja sempre em dia com a Receita Federal.',
    
    'why.personal.title': 'Atendimento Personalizado',
    'why.personal.desc': 'Cada cliente é único. Analiso sua situação individualmente para oferecer a melhor solução.',
    
    'why.security.title': 'Segurança de Dados',
    'why.security.desc': 'Seus documentos e informações são tratados com total confidencialidade e segurança.',
    
    'why.online.title': '100% Online',
    'why.online.desc': 'Atendimento remoto, independente de onde você esteja no mundo.',
    
    'why.experience.title': 'Experiência Internacional',
    'why.experience.desc': 'Conhecimento profundo das complexidades fiscais que envolvem brasileiros no exterior.',
    
    // CTA
    'cta.title': 'Sua Tranquilidade Fiscal Começa Aqui',
    'cta.subtitle': 'Não deixe sua situação fiscal te preocupar. Entre em contato e vamos resolver juntos.',
    'cta.button': 'Conversar no WhatsApp',
    'cta.note': 'Primeira consulta gratuita • Resposta em até 24h',
    
    // Footer
    'footer.brand': 'Antonio Dias',
    'footer.tagline': 'Contador do Imigrante',
    'footer.description': 'Contabilidade especializada para brasileiros no exterior',
    'footer.online': 'Atendimento 100% Online',
    'footer.rights': 'Todos os direitos reservados.',
  },
  en: {
    // Navigation
    'nav.about': 'About',
    'nav.services': 'Services',
    'nav.contact': 'Contact',
    
    // Hero
    'hero.headline': 'Taking care of your taxes while you live abroad',
    'hero.subtitle': 'Simple, strategic, and secure accounting for Brazilians living overseas',
    'hero.cta': 'Chat with Me on WhatsApp',
    'hero.scroll': 'Learn more',
    
    // About
    'about.title': 'About Antonio Dias',
    'about.subtitle': 'Your Trusted Accountant',
    'about.p1': 'With years of experience in international accounting, I specialize in helping Brazilians living abroad maintain their tax compliance in Brazil.',
    'about.p2': 'I understand the unique challenges you face: different time zones, tax complexity in two countries, and the need for someone who speaks your language and understands your reality.',
    'about.p3': 'My commitment is to provide personalized, transparent, and accessible service, handling all your tax documentation while you focus on what really matters: your life abroad.',
    
    // Services
    'services.title': 'Specialized Services',
    'services.subtitle': 'Complete solutions for Brazilians abroad',
    
    'services.saida.title': 'Definitive Tax Exit',
    'services.saida.desc': 'Regularize your tax situation when leaving Brazil permanently. I handle all necessary documentation with the Federal Revenue Service, ensuring no future issues.',
    
    'services.contabil.title': 'Accounting Services for Brazilians Abroad',
    'services.contabil.desc': 'Income Tax Declaration, estate DIRPF, and all tax documentation needed for those maintaining financial ties to Brazil.',
    
    'services.imigracao.title': 'Immigration & Tax Planning',
    'services.imigracao.desc': 'Strategic tax planning for your international move. Complete analysis of your situation to minimize taxes and maximize security.',
    
    'services.sucessorio.title': 'Estate & Wealth Planning',
    'services.sucessorio.desc': 'Wealth organization and succession planning to protect your assets and ensure peace of mind for you and your family.',
    
    // Who is this for
    'who.title': 'Who Is This Service For?',
    'who.subtitle': 'If you identify with any of these situations, I can help',
    'who.item1': 'Brazilians living abroad who need to keep their tax situation regularized',
    'who.item2': 'People planning to move to another country and want to do everything correctly',
    'who.item3': 'Immigrants who still have assets, investments, or income in Brazil',
    'who.item4': 'Families needing international succession planning',
    'who.item5': 'Professionals working remotely for Brazilian companies while living abroad',
    'who.item6': 'Brazilian retirees living overseas',
    
    // Why trust
    'why.title': 'Why Trust Antonio Dias?',
    'why.subtitle': 'What sets us apart',
    
    'why.trust.title': 'Trust and Transparency',
    'why.trust.desc': 'Clear and honest communication about your tax situation. No surprises.',
    
    'why.legal.title': 'Legal Compliance',
    'why.legal.desc': 'I work within the law, ensuring you are always up to date with the Federal Revenue Service.',
    
    'why.personal.title': 'Personalized Service',
    'why.personal.desc': 'Each client is unique. I analyze your situation individually to offer the best solution.',
    
    'why.security.title': 'Data Security',
    'why.security.desc': 'Your documents and information are handled with complete confidentiality and security.',
    
    'why.online.title': '100% Online',
    'why.online.desc': 'Remote service, no matter where you are in the world.',
    
    'why.experience.title': 'International Experience',
    'why.experience.desc': 'Deep knowledge of the tax complexities involving Brazilians abroad.',
    
    // CTA
    'cta.title': 'Your Tax Peace of Mind Starts Here',
    'cta.subtitle': "Don't let your tax situation worry you. Get in touch and let's solve it together.",
    'cta.button': 'Chat on WhatsApp',
    'cta.note': 'Free first consultation • Response within 24h',
    
    // Footer
    'footer.brand': 'Antonio Dias',
    'footer.tagline': "Immigrant's Accountant",
    'footer.description': 'Specialized accounting for Brazilians abroad',
    'footer.online': '100% Online Service',
    'footer.rights': 'All rights reserved.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['pt']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
