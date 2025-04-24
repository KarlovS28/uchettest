import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ExcelImportExport } from "@/components/excel-tools";

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

export default function ExcelPage() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Проверяем авторизацию пользователя
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Если пользователь не авторизован, перенаправляем на страницу входа
          window.location.href = "/auth";
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const handleGoBack = () => {
    setLocation("/");
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
  
  // Проверяем разрешения пользователя
  const hasAccess = user && (
    user.permissions.includes("full_access") || 
    user.permissions.includes("manage_employees") || 
    user.permissions.includes("manage_liability")
  );
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="paper max-w-md w-full p-8 rounded-lg text-center">
          <h1 className="font-playfair text-2xl font-bold text-primary-foreground mb-4">Доступ запрещен</h1>
          <p className="mb-6">У вас нет необходимых прав для доступа к этой странице.</p>
          <Button 
            onClick={handleGoBack}
            className="vintage-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button 
            onClick={handleGoBack}
            variant="outline"
            className="vintage-button-outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </div>
        
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-center">Работа с Excel</h1>
          <p className="text-center text-muted-foreground">Импорт и экспорт данных в формате электронных таблиц</p>
        </div>
        
        <ExcelImportExport />
      </div>
    </div>
  );
}