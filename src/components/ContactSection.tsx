import { Card } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";

interface AddressBoxProps {
  title: string;
  address: string;
  phone: string;
  color: string;
  delay?: number;
}

const AddressBox = ({ title, address, phone, color, delay = 0 }: AddressBoxProps) => (
  <Card 
    className="p-6 hover-lift border-2 transition-all duration-500 animate-fade-in" 
    style={{ 
      borderRightColor: color,
      borderRightWidth: '6px',
      animationDelay: `${delay}ms`
    }}
  >
    <div className="space-y-4" dir="rtl">
      <h4 className="font-bold text-xl transition-colors duration-300" style={{ color }}>
        {title}
      </h4>
      <div className="flex items-start gap-3 text-muted-foreground group">
        <MapPin 
          className="w-5 h-5 mt-1 flex-shrink-0 transition-all duration-300 group-hover:scale-110" 
          style={{ color }} 
        />
        <p className="text-sm leading-relaxed">{address}</p>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground group">
        <Phone 
          className="w-5 h-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" 
          style={{ color }} 
        />
        <p className="text-sm font-mono" dir="ltr">{phone}</p>
      </div>
    </div>
  </Card>
);

export const ContactSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16 animate-fade-in" dir="rtl">
          آدرس‌های ما
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <AddressBox 
            title="دبیرستان متوسط اول پسرانه" 
            address="مهرشهر، بلوار شهرداری، خ 110، پلاک 890" 
            phone="026-33423481" 
            color="hsl(45, 93%, 47%)"
            delay={0}
          />
          <AddressBox 
            title="دبیرستان متوسط دوم پسرانه" 
            address="مهرشهر، بلوار شهرداری، خ 206، پلاک 485" 
            phone="026-33408785" 
            color="hsl(217, 91%, 60%)"
            delay={100}
          />
          <AddressBox 
            title="دبیرستان متوسط دوم دخترانه" 
            address="مهرشهر، بلوار شهرداری، خ 209، پلاک 165" 
            phone="026-33400994" 
            color="hsl(0, 84%, 60%)"
            delay={200}
          />
        </div>
      </div>
    </section>
  );
};
