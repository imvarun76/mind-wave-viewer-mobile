
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Activity, Settings } from "lucide-react";

export function Footer() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
    },
    {
      label: "Settings",
      href: "/settings/connection",
      icon: Settings,
    },
  ];
  
  return (
    <footer className="bg-white border-t border-gray-200 pb-safe">
      <nav className="h-16 flex items-center justify-around px-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full",
              currentPath === item.href
                ? "text-primary"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>
    </footer>
  );
}
