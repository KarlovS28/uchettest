import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Схема для формы первоначальной настройки
const setupSchema = z.object({
  organizationName: z.string().min(1, "Введите название организации"),
  adminUsername: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  adminPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  adminFullName: z.string().min(1, "Введите ФИО администратора"),
  adminPosition: z.string().min(1, "Введите должность администратора"),
});

type FormData = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Форма для первоначальной настройки
  const setupForm = useForm<FormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      organizationName: "",
      adminUsername: "",
      adminPassword: "",
      adminFullName: "",
      adminPosition: "",
    },
  });

  // Отправка формы настройки
  const onSetupSubmit = async (values: FormData) => {
    setIsLoading(true);
    console.log("Настройка системы:", values);
    
    try {
      // Прямой вызов API
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Важно для сохранения cookie сессии
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка настройки системы");
      }
      
      const data = await response.json();
      console.log("Настройка успешна:", data);
      
      toast({
        title: "Система успешно настроена",
        description: "Вы будете перенаправлены на страницу входа",
      });
      
      // Перенаправляем на страницу входа
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (error) {
      console.error("Ошибка при настройке системы:", error);
      toast({
        title: "Ошибка настройки",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="paper max-w-md w-full p-8 rounded-lg">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary-foreground mb-2">ДЕЛА</h1>
          <p className="text-sm text-primary-foreground italic">Система учета имущества</p>
          <div className="vintage-divider my-4"></div>
        </div>

        <h2 className="font-playfair text-xl mb-4 text-center">Первоначальная настройка</h2>
        
        <Form {...setupForm}>
          <form onSubmit={setupForm.handleSubmit(onSetupSubmit)} className="space-y-4">
            <FormField
              control={setupForm.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название организации</FormLabel>
                  <FormControl>
                    <Input className="vintage-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={setupForm.control}
              name="adminFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ФИО администратора</FormLabel>
                  <FormControl>
                    <Input className="vintage-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={setupForm.control}
              name="adminPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Должность</FormLabel>
                  <FormControl>
                    <Input className="vintage-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={setupForm.control}
              name="adminUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя пользователя</FormLabel>
                  <FormControl>
                    <Input className="vintage-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={setupForm.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input className="vintage-input" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full vintage-button"
              disabled={isLoading}
            >
              {isLoading ? 
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </> 
                : "Создать администратора"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}