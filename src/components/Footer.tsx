import { Instagram, Globe } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useLanguage } from '@/contexts/LanguageContext';

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=15997705571&text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20uma%20análise%20da%20minha%20situação%20fiscal.%20Sou%20brasileiro(a)%20morando%20no%20exterior.';

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="py-12 border-t border-border">
      <div className="section-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="font-display text-2xl font-bold text-foreground">
                {t('footer.brand')}
              </span>
              <span className="text-primary">|</span>
              <span className="text-muted-foreground text-sm">
                {t('footer.tagline')}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/antonio.dias.account"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all duration-300"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all duration-300"
              aria-label="WhatsApp"
            >
              <WhatsAppIcon className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Globe className="w-4 h-4 text-primary" />
            <span>{t('footer.online')}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Antonio Dias. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};
