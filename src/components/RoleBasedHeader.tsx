import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const RoleBasedHeader = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (roles && roles.length > 0) {
      setUserRole(roles[0].role);
    }
    setLoading(false);
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
            
            {!loading && (
              <>
                {userRole === "admin" && (
                  <Link 
                    to="/admin" 
                    className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
                  >
                    پنل
                  </Link>
                )}
                
                {userRole === "student" && (
                  <Link 
                    to="/student" 
                    className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
                  >
                    دانش‌آموز
                  </Link>
                )}
                
                {!userRole && (
                  <Link 
                    to="/login" 
                    className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
                  >
                    ورود
                  </Link>
                )}
              </>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};
