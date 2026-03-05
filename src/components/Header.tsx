import { useState } from 'react';
import { Menu, X, Globe, User, Briefcase, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=15997705571&text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20uma%20análise%20da%20minha%20situação%20fiscal.%20Sou%20brasileiro(a)%20morando%20no%20exterior.';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'pt' ? 'en' : 'pt');
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id.replace('#', ''));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <span className="font-display text-xl md:text-2xl font-bold text-foreground">
              Antonio <span className="text-primary">Dias</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              onClick={(e) => handleScroll(e, 'about')}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <User className="w-4 h-4" />
              {t('nav.about')}
            </a>
            <a
              href="#services"
              onClick={(e) => handleScroll(e, 'services')}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              {t('nav.services')}
            </a>
            <a
              href="#contact"
              onClick={(e) => handleScroll(e, 'contact')}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t('nav.contact')}
            </a>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'pt' ? 'EN' : 'PT'}</span>
            </button>

            {/* CTA Button - Desktop */}
            <Button
              variant="gold"
              size="sm"
              className="hidden md:flex"
              asChild
            >
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-2">
              <a
                href="#about"
                onClick={(e) => handleScroll(e, 'about')}
                className="flex items-center gap-4 text-muted-foreground hover:text-primary transition-colors py-3 px-2 rounded-lg hover:bg-secondary/50"
              >
                <User className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('nav.about')}</span>
              </a>
              <a
                href="#services"
                onClick={(e) => handleScroll(e, 'services')}
                className="flex items-center gap-4 text-muted-foreground hover:text-primary transition-colors py-3 px-2 rounded-lg hover:bg-secondary/50"
              >
                <Briefcase className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('nav.services')}</span>
              </a>
              <a
                href="#contact"
                onClick={(e) => handleScroll(e, 'contact')}
                className="flex items-center gap-4 text-muted-foreground hover:text-primary transition-colors py-3 px-2 rounded-lg hover:bg-secondary/50"
              >
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('nav.contact')}</span>
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
