import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message === "Invalid login credentials" 
          ? "Credenciales inválidas. Verifica tu correo y contraseña."
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flux-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flux-card p-8 animate-slide-up">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-4" />
            <h1 className="text-2xl font-bold text-foreground">
              Acceso Personal
            </h1>
            <p className="text-muted-foreground mt-2">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 flux-gradient-primary text-primary-foreground border-0 gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
