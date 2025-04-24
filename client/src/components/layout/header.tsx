import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ArrowLeft } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  title: string;
  backButton?: {
    label: string;
    onClick: () => void;
  };
}

export default function Header({ title, backButton }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="paper p-4 mb-6 rounded flex justify-between items-center">
      <div className="flex items-center">
        {backButton && (
          <Button 
            className="vintage-button text-sm mr-4"
            size="sm"
            onClick={backButton.onClick}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> {backButton.label}
          </Button>
        )}
        <h1 className="font-playfair text-2xl font-bold text-primary-foreground">{title}</h1>
      </div>
      
      <div className="flex items-center">
        {user && (
          <>
            <div className="flex items-center mr-4">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:inline">{user.fullName}</span>
            </div>
            <Button 
              className="vintage-button text-sm"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
