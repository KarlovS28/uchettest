import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type User = {
  id: number;
  username: string;
  fullName: string;
  position: string;
  organizationId: number;
  role: string;
  permissions: string[];
  createdAt: Date;
};

type Organization = {
  id: number;
  name: string;
  createdAt: Date;
};

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Получаем данные текущего пользователя
    const fetchUserData = async () => {
      try {
        const userResponse = await fetch("/api/user", {
          credentials: "include", // Важно для чтения cookie сессии
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          
          // Получаем данные организации
          if (userData.organizationId) {
            const orgResponse = await fetch(`/api/organizations/${userData.organizationId}`, {
              credentials: "include",
            });
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setOrganization(orgData);
            }
          }
        } else {
          // Если пользователь не авторизован, перенаправляем на страницу входа
          window.location.href = "/auth";
        }
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleStartWork = () => {
    setLocation("/departments");
  };
  
  const handleExcelPage = () => {
    setLocation("/excel");
  };
  
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      // После успешного выхода перенаправляем на страницу входа
      window.location.href = "/auth";
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="paper p-8 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-center mt-2">Загрузка данных...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="paper max-w-lg w-full p-8 rounded-lg text-center">
        <h1 className="font-playfair text-4xl font-bold text-primary-foreground mb-4">ДЕЛА</h1>
        <p className="text-lg mb-4 text-sepia-dark">Система складского учета имущества</p>
        
        <div className="vintage-divider my-4"></div>
        
        {user && (
          <div className="my-4">
            <p className="text-md font-semibold">{user.fullName}</p>
            <p className="text-sm">{user.position}</p>
            {organization && (
              <p className="italic text-sm mt-2">{organization.name}</p>
            )}
          </div>
        )}
        
        <div className="flex flex-col space-y-4 mt-6">
          <Button 
            onClick={handleStartWork}
            className="vintage-button py-3 px-8 rounded text-lg font-medium"
          >
            Начать работу
          </Button>
          
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="vintage-button-outline"
          >
            Выйти из системы
          </Button>
        </div>
      </div>
    </div>
  );
}
