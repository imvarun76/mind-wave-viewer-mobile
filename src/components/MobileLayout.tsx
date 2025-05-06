
import { Link } from "react-router-dom";
import { MobileHeader } from "@/components/MobileHeader";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";

type MobileLayoutProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  rightAction?: React.ReactNode;
  showFooter?: boolean;
};

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className,
  title,
  showBack = false,
  backTo = "/",
  rightAction,
  showFooter = true
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MobileHeader 
        title={title} 
        showBack={showBack} 
        backTo={backTo} 
        rightAction={rightAction} 
      />
      
      <main className={cn("flex-1 pb-safe px-4 py-4", className)}>
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
};

export default MobileLayout;
