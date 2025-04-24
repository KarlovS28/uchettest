import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const handleStartWork = () => {
    setLocation("/departments");
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="paper max-w-lg w-full p-8 rounded-lg text-center">
        <h1 className="font-playfair text-4xl font-bold text-primary-foreground mb-4">ДЕЛА</h1>
        <p className="text-lg mb-8 text-sepia-dark">Система складского учета имущества</p>
        
        <div className="vintage-divider my-6"></div>
        
        <p className="italic text-sm mb-6">{user?.organizationId ? `Организация #${user.organizationId}` : ''}</p>
        
        <Button 
          onClick={handleStartWork}
          className="vintage-button py-3 px-8 rounded text-lg font-medium"
        >
          Начать работу
        </Button>
      </div>
    </div>
  );
}
