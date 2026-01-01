import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell, Construction } from "lucide-react";
import logo from "@/assets/logo.png";

const SportLogin = () => {
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
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main className="pt-24">
        <section className="py-24 px-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="max-w-md w-full p-8 border-2 animate-scale-in text-center transition-all duration-500 hover:shadow-lg">
            <div className="flex justify-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center animate-bounce-in">
                <Dumbbell className="w-8 h-8 text-foreground" />
              </div>
              <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center animate-bounce-in" style={{ animationDelay: '100ms' }}>
                <Construction className="w-8 h-8 text-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4 animate-fade-in" dir="rtl" style={{ animationDelay: '200ms' }}>
              ورود به جلوه اسپورت
            </h1>
            <p className="text-lg text-muted-foreground mb-4 animate-fade-in" dir="rtl" style={{ animationDelay: '300ms' }}>
              این بخش در حال توسعه است
            </p>
            <p className="text-muted-foreground mb-8 animate-fade-in" dir="rtl" style={{ animationDelay: '400ms' }}>
              لطفاً بعداً مراجعه کنید
            </p>
            <Link to="/">
              <Button className="gap-2 transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in" style={{ animationDelay: '500ms' }}>
                <Home className="w-4 h-4" />
                صفحه اصلی
              </Button>
            </Link>
          </Card>
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

export default SportLogin;
