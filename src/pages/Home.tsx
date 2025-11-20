import { Header } from "@/components/Header";
import { SchoolBlock } from "@/components/SchoolBlock";
import { MapSection } from "@/components/MapSection";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-foreground/5 via-transparent to-transparent" />
          
          <div className="container mx-auto text-center relative z-10">
            <h1 
              className="text-6xl md:text-7xl font-bold mb-8 animate-fade-in gradient-primary bg-clip-text text-transparent"
              dir="rtl"
              style={{ 
                backgroundImage: 'linear-gradient(135deg, hsl(0, 0%, 9%), hsl(0, 0%, 40%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              مجتمع آموزشی جلوه
            </h1>
            <p 
              className="text-2xl text-muted-foreground mb-16 max-w-3xl mx-auto animate-slide-up leading-relaxed"
              dir="rtl"
            >
              تربیت نسلی موفق با آموزش باکیفیت
            </p>
          </div>
        </section>

        {/* School Blocks Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 animate-fade-in" dir="rtl">
              واحدهای آموزشی
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <SchoolBlock
                title="دوره اول پسرانه"
                description="دوره ابتدایی با تمرکز بر پایه‌های آموزشی قوی و توسعه شخصیت"
                delay={0}
              />
              <SchoolBlock
                title="دوره دوم پسرانه"
                description="دوره متوسطه با برنامه‌های آموزشی پیشرفته و هدفمند"
                delay={200}
              />
              <SchoolBlock
                title="دوره دوم دخترانه"
                description="دوره متوسطه با محیطی امن، پرورشی و الهام‌بخش"
                delay={400}
              />
            </div>
          </div>
        </section>

        {/* Map Section */}
        <MapSection />
      </main>

      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-lg" dir="rtl">
            © ۱۴۰۳ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
