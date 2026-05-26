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
    'hero.badge': 'Contabilidade para brasileiros no exterior',
    'hero.headline': 'Você ainda declara IR no Brasil morando fora? Descubra se está pagando imposto a mais.',
    'hero.mobileHeadline': 'Pagando IR a mais morando fora?',
    'hero.subtitle': 'Em 2 minutos, nosso assistente analisa sua situação e indica exatamente o que fazer.',
    'hero.mobileSubtitle': 'Nosso assistente analisa sua situação em 2 minutos.',
    'hero.cta': 'Tirar minha dúvida agora',
    'hero.analysisCta': 'Analisar minha situação agora',
    'hero.chat.name': 'Assistente do Antonio Dias',
    'hero.chat.status': 'Online agora',
    'hero.chat.question': 'Há quanto tempo você mora fora do Brasil?',
    'hero.chat.minimizedHint': 'Toque para continuar a análise no assistente',
    'hero.chat.option.lessOne': 'Menos de 1 ano',
    'hero.chat.option.oneToThree': '1 a 3 anos',
    'hero.chat.option.moreThree': 'Mais de 3 anos',
    'hero.chat.prompt.lessOne': 'Moro fora do Brasil há menos de 1 ano.',
    'hero.chat.prompt.oneToThree': 'Moro fora do Brasil há entre 1 e 3 anos.',
    'hero.chat.prompt.moreThree': 'Moro fora do Brasil há mais de 3 anos.',
    
    // About
    'about.title': 'Sobre Antonio Dias',
    'about.subtitle': 'Seu Contador de Confiança',
    'about.p1': 'Com anos de experiência em contabilidade internacional, me especializei em ajudar brasileiros que vivem no exterior a manterem sua situação fiscal regularizada no Brasil.',
    'about.p2': 'Entendo os desafios únicos que você enfrenta: diferentes fusos horários, complexidade tributária em dois países e a necessidade de ter alguém que fale sua língua e compreenda sua realidade.',
    'about.p3': 'Meu compromisso é oferecer um atendimento personalizado, transparente e acessível, cuidando de toda a sua documentação fiscal enquanto você foca no que realmente importa: sua vida no exterior.',
    'about.feature.security': 'Segurança',
    'about.feature.international': 'Internacional',
    'about.feature.personalized': 'Personalizado',
    'about.stats.experience': 'Anos de Experiência',
    'about.stats.clients': 'Clientes Atendidos',
    'about.stats.countries': 'Países',
    
    // Services
    'services.title': 'Serviços Especializados',
    'services.subtitle': 'Soluções completas para brasileiros no exterior',
    'services.askCta': 'Tirar dúvida sobre este serviço',
    
    'services.saida.title': 'Saída Fiscal Definitiva',
    'services.saida.desc': 'Regularize sua situação fiscal ao deixar o Brasil definitivamente. Cuido de toda a documentação necessária junto à Receita Federal, garantindo que você não tenha pendências futuras.',
    
    'services.contabil.title': 'Declaração de Imposto de Renda (DIRPF)',
    'services.contabil.desc': 'Preparação e revisão da sua DIRPF, incluindo casos de patrimônio, rendimentos e vínculos mantidos no Brasil mesmo morando no exterior.',
    
    'services.imigracao.title': 'Imigração & Planejamento Fiscal',
    'services.imigracao.desc': 'Planejamento tributário estratégico para sua mudança internacional. Análise completa da sua situação para minimizar impostos e maximizar segurança.',
    
    'services.sucessorio.title': 'Sucessório & Patrimonial',
    'services.sucessorio.desc': 'Organização patrimonial e planejamento sucessório para proteger seu patrimônio e garantir tranquilidade para você e sua família.',
    
    // Who is this for
    'who.eyebrow': 'Público Ideal',
    'who.title': 'Para Quem É Este Serviço?',
    'who.subtitle': 'Se você se identifica com alguma dessas situações, posso te ajudar',
    'who.item1': 'Brasileiros que moram no exterior e precisam manter a situação fiscal regularizada',
    'who.item2': 'Pessoas planejando se mudar para outro país e querem fazer tudo corretamente',
    'who.item3': 'Imigrantes que ainda possuem bens, investimentos ou rendimentos no Brasil',
    'who.item4': 'Famílias que precisam de planejamento sucessório internacional',
    'who.item5': 'Profissionais que trabalham remotamente para empresas brasileiras morando fora',
    'who.item6': 'Aposentados brasileiros vivendo no exterior',
    
    // Why trust
    'why.eyebrow': 'Diferenciais',
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
    'cta.title': 'Receba uma orientação inicial agora',
    'cta.subtitle': 'Converse com o assistente, tire sua dúvida e deixe seu nome e WhatsApp para o Antonio continuar o atendimento.',
    'cta.button': 'Falar com o assistente',
    'cta.whatsapp': 'Falar pelo WhatsApp',
    'cta.note': 'Atendimento inicial online • Resposta objetiva • Encaminhamento para Antonio',

    // Chat
    'chat.header.title': 'Assistente',
    'chat.header.subtitle': 'Antonio Dias Contador',
    'chat.input.placeholder': 'Digite sua mensagem...',
    'chat.footer': 'Assistente virtual do Antonio Dias',
    'chat.teaser.title': 'Dúvidas fiscais?',
    'chat.teaser.subtitle': 'Fale com o assistente',
    'chat.teaser.1.title': 'Dúvidas fiscais?',
    'chat.teaser.1.subtitle': 'Fale com o assistente',
    'chat.teaser.2.title': 'Saída fiscal?',
    'chat.teaser.2.subtitle': 'Tire sua dúvida agora',
    'chat.teaser.3.title': 'Mora no exterior?',
    'chat.teaser.3.subtitle': 'Receba orientação inicial',
    'chat.teaser.4.title': 'Preço e prazo?',
    'chat.teaser.4.subtitle': 'Pergunte ao assistente',
    'chat.quick.saida': 'Saída fiscal',
    'chat.quick.ir': 'Imposto de renda',
    'chat.quick.price': 'Preço e prazo',
    'chat.quick.planning': 'Planejamento',
    'chat.prompt.saida': 'Tenho dúvidas sobre saída fiscal definitiva.',
    'chat.prompt.ir': 'Tenho dúvidas sobre declaração de imposto de renda para brasileiros no exterior.',
    'chat.prompt.price': 'Quero saber o valor e o prazo do laudo.',
    'chat.prompt.planning': 'Tenho dúvidas sobre planejamento tributário internacional.',
    'chat.prompt.sucessorio': 'Tenho dúvidas sobre planejamento sucessório e patrimonial para quem mora no exterior.',
    'chat.error.default': 'Desculpe, ocorreu um erro. Tente novamente.',
    'chat.error.connection': 'Erro de conexão. Verifique sua internet e tente novamente.',
    'chat.fallback': 'Olá! Sou o assistente do Antonio Dias. Como posso ajudar?',
    'chat.open': 'Abrir assistente virtual',
    'chat.close': 'Fechar chat',
    'chat.reset': 'Nova conversa',
    'chat.send': 'Enviar mensagem',
    
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
    'hero.badge': 'Accounting for Brazilians abroad',
    'hero.headline': 'Do you still file taxes in Brazil while living abroad? Find out if your tax situation is making you overpay.',
    'hero.mobileHeadline': 'Paying too much tax while living abroad?',
    'hero.subtitle': 'In 2 minutes, our assistant analyzes your situation and tells you exactly what to do.',
    'hero.mobileSubtitle': 'Our assistant analyzes your situation in 2 minutes.',
    'hero.cta': 'Ask my question now',
    'hero.analysisCta': 'Analyze my situation now',
    'hero.chat.name': "Antonio Dias' Assistant",
    'hero.chat.status': 'Online now',
    'hero.chat.question': 'How long have you lived outside Brazil?',
    'hero.chat.minimizedHint': 'Tap to continue the analysis in the assistant',
    'hero.chat.option.lessOne': 'Less than 1 year',
    'hero.chat.option.oneToThree': '1 to 3 years',
    'hero.chat.option.moreThree': 'More than 3 years',
    'hero.chat.prompt.lessOne': 'I have lived outside Brazil for less than 1 year.',
    'hero.chat.prompt.oneToThree': 'I have lived outside Brazil for 1 to 3 years.',
    'hero.chat.prompt.moreThree': 'I have lived outside Brazil for more than 3 years.',
    
    // About
    'about.title': 'About Antonio Dias',
    'about.subtitle': 'Your Trusted Accountant',
    'about.p1': 'With years of experience in international accounting, I specialize in helping Brazilians living abroad maintain their tax compliance in Brazil.',
    'about.p2': 'I understand the unique challenges you face: different time zones, tax complexity in two countries, and the need for someone who speaks your language and understands your reality.',
    'about.p3': 'My commitment is to provide personalized, transparent, and accessible service, handling all your tax documentation while you focus on what really matters: your life abroad.',
    'about.feature.security': 'Security',
    'about.feature.international': 'International',
    'about.feature.personalized': 'Personalized',
    'about.stats.experience': 'Years of Experience',
    'about.stats.clients': 'Clients Served',
    'about.stats.countries': 'Countries',
    
    // Services
    'services.title': 'Specialized Services',
    'services.subtitle': 'Complete solutions for Brazilians abroad',
    'services.askCta': 'Ask about this service',
    
    'services.saida.title': 'Definitive Tax Exit',
    'services.saida.desc': 'Regularize your tax situation when leaving Brazil permanently. I handle all necessary documentation with the Federal Revenue Service, ensuring no future issues.',
    
    'services.contabil.title': 'Income Tax Return (DIRPF)',
    'services.contabil.desc': 'Preparation and review of your Brazilian income tax return, including assets, income, and financial ties maintained in Brazil while living abroad.',
    
    'services.imigracao.title': 'Immigration & Tax Planning',
    'services.imigracao.desc': 'Strategic tax planning for your international move. Complete analysis of your situation to minimize taxes and maximize security.',
    
    'services.sucessorio.title': 'Estate & Wealth Planning',
    'services.sucessorio.desc': 'Wealth organization and succession planning to protect your assets and ensure peace of mind for you and your family.',
    
    // Who is this for
    'who.eyebrow': 'Ideal Audience',
    'who.title': 'Who Is This Service For?',
    'who.subtitle': 'If you identify with any of these situations, I can help',
    'who.item1': 'Brazilians living abroad who need to keep their tax situation regularized',
    'who.item2': 'People planning to move to another country and want to do everything correctly',
    'who.item3': 'Immigrants who still have assets, investments, or income in Brazil',
    'who.item4': 'Families needing international succession planning',
    'who.item5': 'Professionals working remotely for Brazilian companies while living abroad',
    'who.item6': 'Brazilian retirees living overseas',
    
    // Why trust
    'why.eyebrow': 'Why Choose Us',
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
    'cta.title': 'Get initial guidance now',
    'cta.subtitle': 'Talk to the assistant, ask your question, and leave your name and WhatsApp so Antonio can continue the service.',
    'cta.button': 'Talk to the assistant',
    'cta.whatsapp': 'Talk on WhatsApp',
    'cta.note': 'Online initial support • Clear answers • Forwarded to Antonio',

    // Chat
    'chat.header.title': 'Assistant',
    'chat.header.subtitle': 'Antonio Dias Accountant',
    'chat.input.placeholder': 'Type your message...',
    'chat.footer': 'Antonio Dias virtual assistant',
    'chat.teaser.title': 'Tax questions?',
    'chat.teaser.subtitle': 'Talk to the assistant',
    'chat.teaser.1.title': 'Tax questions?',
    'chat.teaser.1.subtitle': 'Talk to the assistant',
    'chat.teaser.2.title': 'Tax exit?',
    'chat.teaser.2.subtitle': 'Ask your question now',
    'chat.teaser.3.title': 'Living abroad?',
    'chat.teaser.3.subtitle': 'Get initial guidance',
    'chat.teaser.4.title': 'Price and deadline?',
    'chat.teaser.4.subtitle': 'Ask the assistant',
    'chat.quick.saida': 'Tax exit',
    'chat.quick.ir': 'Income tax',
    'chat.quick.price': 'Price and deadline',
    'chat.quick.planning': 'Planning',
    'chat.prompt.saida': 'I have questions about definitive tax exit.',
    'chat.prompt.ir': 'I have questions about income tax filing for Brazilians abroad.',
    'chat.prompt.price': 'I want to know the price and delivery deadline for the report.',
    'chat.prompt.planning': 'I have questions about international tax planning.',
    'chat.prompt.sucessorio': 'I have questions about estate and wealth planning while living abroad.',
    'chat.error.default': 'Sorry, an error occurred. Please try again.',
    'chat.error.connection': 'Connection error. Check your internet and try again.',
    'chat.fallback': 'Hello! I am Antonio Dias assistant. How can I help?',
    'chat.open': 'Open virtual assistant',
    'chat.close': 'Close chat',
    'chat.reset': 'New conversation',
    'chat.send': 'Send message',
    
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
