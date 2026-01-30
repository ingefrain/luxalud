import { HeroSection } from "@/components/public/HeroSection";
import { Building2, Stethoscope, Video, FileCheck } from "lucide-react";

export default function Home() {
  return (
    <div>
      <HeroSection />
      
      {/* How it Works Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Agendar tu cita es muy sencillo. Sigue estos simples pasos.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StepCard 
              number={1}
              icon={<Stethoscope className="h-6 w-6" />}
              title="Elige tu médico"
              description="Selecciona el especialista que necesitas de nuestra lista de profesionales."
            />
            <StepCard 
              number={2}
              icon={<Building2 className="h-6 w-6" />}
              title="Selecciona consultorio"
              description="Elige el consultorio más cercano o conveniente para ti."
            />
            <StepCard 
              number={3}
              icon={<Video className="h-6 w-6" />}
              title="Elige modalidad"
              description="Consulta presencial en nuestras instalaciones o videollamada."
            />
            <StepCard 
              number={4}
              icon={<FileCheck className="h-6 w-6" />}
              title="Confirma tu cita"
              description="Recibirás un correo de confirmación con todos los detalles."
            />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 flux-gradient-primary">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            ¿Listo para agendar tu cita?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            No esperes más. Agenda tu consulta ahora y recibe la atención médica que mereces.
          </p>
          <a 
            href="/agendar" 
            className="inline-flex items-center justify-center gap-2 bg-background text-primary font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 hover:shadow-lg"
          >
            Agendar Ahora
          </a>
        </div>
      </section>
    </div>
  );
}

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StepCard({ number, icon, title, description }: StepCardProps) {
  return (
    <div className="relative text-center group">
      {/* Connector line */}
      <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border -z-10" />
      
      <div className="relative z-10 mb-6 mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110">
        {number}
      </div>
      
      <div className="flux-card p-6 h-full">
        <div className="mb-4 mx-auto w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
