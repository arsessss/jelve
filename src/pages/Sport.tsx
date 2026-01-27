import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell, LogIn } from "lucide-react";
import logo from "@/assets/logo.png";

const Sport = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border animate-slide-down">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/sport" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="جلوه اسپورت" 
              className="h-14 w-auto transition-all duration-500 group-hover:scale-110"
            />
            <span className="font-bold text-xl hidden sm:block transition-colors duration-300">جلوه اسپورت</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/sport/login">
              <Button variant="outline" className="gap-2 transition-all duration-300 hover:scale-105 active:scale-95">
                <LogIn className="w-4 h-4" />
                ورود
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main className="pt-24">
        <section className="py-24 px-4 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden min-h-[calc(100vh-200px)] flex items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-foreground/5 via-transparent to-transparent" />
          
          <div className="container mx-auto text-center relative z-10">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-foreground/10 flex items-center justify-center animate-bounce-in">
              <Dumbbell className="w-12 h-12 text-foreground" />
            </div>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 animate-fade-in" 
              dir="rtl"
              style={{
                backgroundImage: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              جلوه اسپورت
            </h1>
            <Card className="max-w-lg mx-auto p-8 border-2 animate-slide-up transition-all duration-500 hover:shadow-lg">
              <p className="text-xl text-muted-foreground mb-6" dir="rtl">
                این بخش در حال توسعه است
              </p>
              <p className="text-lg text-muted-foreground mb-8" dir="rtl">
                لطفاً بعداً مراجعه کنید
              </p>
              <Link to="/">
                <Button className="gap-2 transition-all duration-300 hover:scale-105 active:scale-95">
                  <Home className="w-4 h-4" />
                  صفحه اصلی
                </Button>
              </Link>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-lg animate-fade-in" dir="rtl">
            © ۱۴۰۴ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Sport;
