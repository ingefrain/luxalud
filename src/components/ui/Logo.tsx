import { Activity } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="flux-gradient-primary rounded-lg p-1.5 flux-shadow-glow">
          <Activity className={`${sizeClasses[size]} text-primary-foreground`} />
        </div>
      </div>
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} text-foreground`}>
          Flux<span className="text-primary">Salud</span>
        </span>
      )}
    </div>
  );
}
