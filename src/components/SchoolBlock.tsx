import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface SchoolBlockProps {
  title: string;
  description: string;
  color: string;
}

export const SchoolBlock = ({ title, description, color }: SchoolBlockProps) => {
  return (
    <Card 
      className="p-6 hover-lift animate-slide-up"
      style={{ 
        borderTop: `4px solid ${color}`,
        background: `linear-gradient(135deg, hsl(var(--card)) 0%, ${color}10 100%)`
      }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 hover:rotate-6"
          style={{ backgroundColor: `${color}20` }}
        >
          <Building2 className="w-8 h-8" style={{ color }} />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
};
