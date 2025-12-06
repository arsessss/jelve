import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { customAuth, AuthSession } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const RoleBasedHeader = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentSession = customAuth.getSession();
    console.log("RoleBasedHeader session:", currentSession);
    setSession(currentSession);

    const handleAuthChange = () => {
      const newSession = customAuth.getSession();
      console.log("Auth changed, new session:", newSession);
      setSession(newSession);
    };

    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const handleLogout = () => {
    customAuth.logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <img 
              src={logo} 
              alt="Jelve Logo" 
              className="h-14 w-14 object-contain transition-all duration-300 group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-6" dir="rtl">
            <Link 
              to="/" 
              className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
            >
              صفحه اصلی
            </Link>
            <Link 
              to="/contact" 
              className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
            >
              ارتباط با ما
            </Link>
            
            {session?.role === "admin" && (
              <Link 
                to="/admin" 
                className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
              >
                پنل
              </Link>
            )}
            
            {session?.role === "student" && (
              <Link 
                to="/student" 
                className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
              >
                دانش‌آموز
              </Link>
            )}
            
            {!session && (
              <Link 
                to="/login" 
                className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
              >
                ورود
              </Link>
            )}

            {session && (
              <button 
                onClick={handleLogout}
                className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};
