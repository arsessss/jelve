import { Header } from "@/components/Header";
import { SchoolBlock } from "@/components/SchoolBlock";
import { MapSection } from "@/components/MapSection";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto text-center">
            <h1 
              className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              dir="rtl"
            >
              مجتمع آموزشی جلوه
            </h1>
            <p 
              className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up"
              dir="rtl"
            >
              تربیت نسلی موفق با آموزش باکیفیت
            </p>
          </div>
        </section>

        {/* School Blocks Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in" dir="rtl">
              واحدهای آموزشی
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <SchoolBlock
                title="دوره اول پسرانه"
                description="دوره ابتدایی با تمرکز بر پایه‌های آموزشی قوی"
                color="hsl(217, 91%, 60%)"
              />
              <SchoolBlock
                title="دوره دوم پسرانه"
                description="دوره متوسطه با برنامه‌های آموزشی پیشرفته"
                color="hsl(199, 89%, 48%)"
              />
              <SchoolBlock
                title="دوره دوم دخترانه"
                description="دوره متوسطه با محیطی امن و پرورشی"
                color="hsl(280, 70%, 60%)"
              />
            </div>
          </div>
        </section>

        {/* Map Section */}
        <MapSection />
      </main>

      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground" dir="rtl">
            © ۱۴۰۳ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
