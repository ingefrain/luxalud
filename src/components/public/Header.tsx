import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Calendar, LogIn } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link to="/agendar">
            <Button variant="ghost" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendar Cita</span>
            </Button>
          </Link>
          <Link to="/login">
            <Button className="gap-2 flux-gradient-primary text-primary-foreground border-0">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Acceder</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
