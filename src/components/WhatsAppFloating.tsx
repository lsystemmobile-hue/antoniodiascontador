import { useState, useEffect } from 'react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=15997705571&text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20uma%20análise%20da%20minha%20situação%20fiscal.%20Sou%20brasileiro(a)%20morando%20no%20exterior.';

export const WhatsAppFloating = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    if (!isVisible) return null;

    return (
        <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 hover:scale-110 active:scale-95 group animate-in fade-in zoom-in duration-300"
            aria-label="Conversar no WhatsApp"
        >
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-0" />
            <WhatsAppIcon className="w-7 h-7 relative z-10" />
        </a>
    );
};
