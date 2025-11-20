import { Card } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";

interface AddressBoxProps {
  title: string;
  address: string;
  phone: string;
  color: string;
}

const AddressBox = ({ title, address, phone, color }: AddressBoxProps) => (
  <Card 
    className="p-6 hover-lift"
    style={{ borderRight: `4px solid ${color}` }}
  >
    <div className="space-y-3" dir="rtl">
      <h4 className="font-bold text-lg" style={{ color }}>{title}</h4>
      <div className="flex items-start gap-2 text-muted-foreground">
        <MapPin className="w-5 h-5 mt-1 flex-shrink-0" style={{ color }} />
        <p className="text-sm">{address}</p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Phone className="w-5 h-5 flex-shrink-0" style={{ color }} />
        <p className="text-sm" dir="ltr">{phone}</p>
      </div>
    </div>
  </Card>
);

export const MapSection = () => {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in" dir="rtl">
          موقعیت مکانی
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="aspect-video bg-card rounded-lg overflow-hidden shadow-lg animate-scale-in">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3238.9999999999995!2d51.4!3d35.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQyJzAwLjAiTiA1McKwMjQnMDAuMCJF!5e0!3m2!1sen!2s!4v1234567890123!5m2!1sen!2s"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="space-y-4 animate-slide-up">
            <AddressBox
              title="دوره اول پسرانه"
              address="تهران، خیابان ولیعصر، پلاک ۱۲۳"
              phone="021-12345678"
              color="hsl(217, 91%, 60%)"
            />
            <AddressBox
              title="دوره دوم پسرانه"
              address="تهران، خیابان انقلاب، پلاک ۴۵۶"
              phone="021-23456789"
              color="hsl(199, 89%, 48%)"
            />
            <AddressBox
              title="دوره دوم دخترانه"
              address="تهران، خیابان آزادی، پلاک ۷۸۹"
              phone="021-34567890"
              color="hsl(280, 70%, 60%)"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
