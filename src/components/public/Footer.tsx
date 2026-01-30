import { Logo } from "@/components/ui/Logo";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Logo size="md" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Sistema integral de gestión de citas médicas. Agenda tu consulta de forma rápida y sencilla.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contacto</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +52 (55) 1234-5678
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                contacto@fluxsalud.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Ciudad de México, México
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Horario de Atención</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Lunes a Viernes: 8:00 - 20:00</li>
              <li>Sábados: 9:00 - 14:00</li>
              <li>Domingos: Cerrado</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FluxSalud. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
