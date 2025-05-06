
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <MobileLayout title="Page Not Found" showBack={false} showFooter={false}>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
          <span className="text-3xl">404</span>
        </div>
        
        <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground text-center mb-8 max-w-xs">
          We couldn't find the page you were looking for.
        </p>
        
        <Button onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </div>
    </MobileLayout>
  );
};

export default NotFound;
