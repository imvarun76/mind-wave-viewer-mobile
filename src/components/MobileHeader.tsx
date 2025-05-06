
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

type MobileHeaderProps = {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  rightAction?: React.ReactNode;
};

export function MobileHeader({
  title,
  showBack = false,
  backTo = "/",
  rightAction,
}: MobileHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 pt-safe sticky top-0 z-10">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex-1 flex items-center">
          {showBack && (
            <Link to={backTo} className="mr-2 -ml-2 p-2">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
        </div>
        
        <div className="flex-1 text-center">
          {title && (
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          )}
        </div>
        
        <div className="flex-1 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  );
}
