import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface SchoolBlockProps {
  title: string;
  description: string;
  delay?: number;
}

export const SchoolBlock = ({ title, description, delay = 0 }: SchoolBlockProps) => {
  return (
    <Card 
      className="group p-8 hover-lift animate-slide-up border-2 border-border hover:border-foreground/20 transition-all duration-500 relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex flex-col items-center text-center gap-6 relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-foreground/10 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:bg-foreground/20">
          <Building2 className="w-10 h-10 text-foreground transition-all duration-500 group-hover:scale-110" />
        </div>
        <h3 className="text-2xl font-bold text-foreground transition-all duration-300 group-hover:scale-105">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};
