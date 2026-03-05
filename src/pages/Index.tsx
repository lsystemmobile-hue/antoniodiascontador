import { LanguageProvider } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { AboutSection } from '@/components/AboutSection';
import { ServicesSection } from '@/components/ServicesSection';
import { WhoSection } from '@/components/WhoSection';
import { WhySection } from '@/components/WhySection';
import { CTASection } from '@/components/CTASection';
import { WhatsAppFloating } from '@/components/WhatsAppFloating';
import { Footer } from '@/components/Footer';

const Index = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main>
          <HeroSection />
          <AboutSection />
          <ServicesSection />
          <WhoSection />
          <WhySection />
          <CTASection />
        </main>
        <WhatsAppFloating />
        <Footer />
      </div>
    </LanguageProvider>
  );
};

export default Index;
