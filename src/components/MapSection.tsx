import { Card } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";
interface AddressBoxProps {
  title: string;
  address: string;
  phone: string;
  color: string;
}
const AddressBox = ({
  title,
  address,
  phone,
  color
}: AddressBoxProps) => <Card className="p-6 hover-lift border-2 transition-all duration-500 hover:shadow-xl" style={{
  borderLeftColor: color,
  borderLeftWidth: '6px'
}}>
    <div className="space-y-4" dir="rtl">
      <h4 className="font-bold text-xl" style={{
      color
    }}>{title}</h4>
      <div className="flex items-start gap-3 text-muted-foreground group">
        <MapPin className="w-5 h-5 mt-1 flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{
        color
      }} />
        <p className="text-sm leading-relaxed">{address}</p>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground group">
        <Phone className="w-5 h-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" style={{
        color
      }} />
        <p className="text-sm font-mono" dir="ltr">{phone}</p>
      </div>
    </div>
  </Card>;
export const MapSection = () => {
  return <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16 animate-fade-in" dir="rtl">
          موقعیت مکانی
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="aspect-video bg-card rounded-xl overflow-hidden shadow-xl animate-scale-in border-2 border-border">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3238.9999999999995!2d51.4!3d35.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQyJzAwLjAiTiA1McKwMjQnMDAuMCJF!5e0!3m2!1sen!2s!4v1234567890123!5m2!1sen!2s" width="100%" height="100%" style={{
            border: 0
          }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>

          <div className="space-y-6 animate-slide-up bg-[#000a0e]/0">
            <AddressBox title="دبیرستان متوسط اول پسرانه" address="مهرشهر، بلوار شهرداری، خ 110، پلاک 890" phone="026-33423481" color="hsl(45, 93%, 47%)" />
            <AddressBox title="دبیرستان متوسط دوم پسرانه" address="مهرشهر، بلوار شهرداری، خ 206، پلاک 485" phone="026-33408785" color="hsl(217, 91%, 60%)" />
            <AddressBox title="دبیرستان متوسط دوم دخترانه" address="مهرشهر، بلوار شهرداری، خ 209، پلاک 165" phone="026-33400994" color="hsl(0, 84%, 60%)" />
          </div>
        </div>
      </div>
    </section>;
};