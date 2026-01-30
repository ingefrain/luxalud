import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Shield, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flux-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container relative py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center animate-slide-up">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Sistema de gestión médica profesional
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Agenda tu cita médica de forma{" "}
            <span className="text-primary">rápida y segura</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            FluxSalud te permite agendar consultas con nuestros especialistas de manera sencilla. 
            Sin crear cuenta, sin complicaciones.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendar">
              <Button size="lg" className="w-full sm:w-auto gap-2 flux-gradient-primary text-primary-foreground border-0 px-8 py-6 text-lg flux-shadow-glow transition-all hover:scale-105">
                <Calendar className="h-5 w-5" />
                Agendar Cita
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-8 py-6 text-lg">
                Acceso Personal Médico
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Calendar className="h-6 w-6" />}
            title="Agenda Fácil"
            description="Selecciona médico, fecha y hora en pocos clics. Sin necesidad de crear cuenta."
          />
          <FeatureCard 
            icon={<Clock className="h-6 w-6" />}
            title="Horarios Flexibles"
            description="Consultas presenciales y virtuales adaptadas a tu disponibilidad."
          />
          <FeatureCard 
            icon={<Users className="h-6 w-6" />}
            title="Múltiples Especialistas"
            description="Accede a diversos médicos especialistas en nuestros consultorios."
          />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flux-card flux-card-hover p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
