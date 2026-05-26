import { useEffect, useRef, useState } from 'react';
import { Menu, X, Globe, User, Briefcase, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { openAssistantChat } from '@/lib/chatEvents';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const desktopNavLinkClass =
    'group relative flex items-center gap-2 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-primary';
  const desktopNavLabelClass =
    'relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-primary/80 after:transition-transform after:duration-300 after:content-[\'\'] group-hover:after:scale-x-100';

  const toggleLanguage = () => {
    setLanguage(language === 'pt' ? 'en' : 'pt');
  };

  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  const smoothScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const header = document.querySelector('header');
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
    const targetY = Math.max(
      element.getBoundingClientRect().top + window.scrollY - headerHeight - 8,
      0
    );

    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 600;
    const startTime = performance.now();

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      scrollAnimationRef.current = null;
    };

    scrollAnimationRef.current = requestAnimationFrame(animate);
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    smoothScrollToSection(id);
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#hero" onClick={(e) => handleScroll(e, 'hero')} className="flex items-center gap-2">
            <span className="font-display text-xl md:text-2xl font-bold text-foreground">
              Antonio <span className="text-primary">Dias</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              onClick={(e) => handleScroll(e, 'about')}
              className={desktopNavLinkClass}
            >
              <User className="w-4 h-4" />
              <span className={desktopNavLabelClass}>{t('nav.about')}</span>
            </a>
            <a
              href="#services"
              onClick={(e) => handleScroll(e, 'services')}
              className={desktopNavLinkClass}
            >
              <Briefcase className="w-4 h-4" />
              <span className={desktopNavLabelClass}>{t('nav.services')}</span>
            </a>
            <a
              href="#contact"
              onClick={(e) => handleScroll(e, 'contact')}
              className={desktopNavLinkClass}
            >
              <Phone className="w-4 h-4" />
              <span className={desktopNavLabelClass}>{t('nav.contact')}</span>
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
              onClick={() => openAssistantChat()}
            >
              {t('hero.cta')}
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
              <Button
                variant="gold"
                className="mt-2 w-full"
                onClick={() => {
                  openAssistantChat();
                  setIsMenuOpen(false);
                }}
              >
                {t('hero.cta')}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
