import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell, LogIn } from "lucide-react";
import logo from "@/assets/logo.png";

const Sport = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/sport" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="جلوه اسپورت" 
              className="h-14 w-auto transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-bold text-xl hidden sm:block">جلوه اسپورت</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/sport/login">
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                ورود
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main className="pt-24 animate-fade-in">
        <section className="py-24 px-4 min-h-[calc(100vh-200px)] flex items-center">
          <div className="container mx-auto text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-12 h-12 text-primary" />
            </div>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 text-foreground" 
              dir="rtl"
            >
              جلوه اسپورت
            </h1>
            <Card className="max-w-lg mx-auto p-8 border-2">
              <p className="text-xl text-muted-foreground mb-6" dir="rtl">
                این بخش در حال توسعه است
              </p>
              <p className="text-lg text-muted-foreground mb-8" dir="rtl">
                لطفاً بعداً مراجعه کنید
              </p>
              <Link to="/">
                <Button className="gap-2">
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
          <p className="text-muted-foreground text-lg" dir="rtl">
            © ۱۴۰۴ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Sport;
