import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Схема для формы входа
const loginSchema = z.object({
  username: z.string().min(1, "Введите имя пользователя"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function SimpleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();

  // Проверяем статус системы
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch("/api/system-status");
        if (response.ok) {
          const data = await response.json();
          setIsSetup(data.isSetup);
          setActiveTab(data.isSetup ? "login" : "setup");
        } else {
          throw new Error("Не удалось проверить статус системы");
        }
      } catch (error) {
        console.error("Ошибка при проверке статуса системы:", error);
        toast({
          title: "Ошибка подключения",
          description: "Не удалось проверить статус системы",
          variant: "destructive",
        });
      }
    };

    checkSystemStatus();
  }, [toast]);

  // Форма для входа
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Отправка формы входа
  const onLoginSubmit = async (values: LoginData) => {
    setIsLoading(true);
    console.log("Вход:", values);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Неверное имя пользователя или пароль");
      }
      
      const user = await response.json();
      console.log("Вход успешен:", user);
      
      toast({
        title: "Вход выполнен",
        description: `Добро пожаловать, ${user.fullName}!`,
      });
      
      // Перенаправляем на главную
      window.location.href = "/";
    } catch (error) {
      console.error("Ошибка при входе:", error);
      toast({
        title: "Ошибка входа",
        description: error instanceof Error ? error.message : "Ошибка входа в систему",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Если статус системы еще не определен, показываем загрузку
  if (isSetup === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="paper p-8 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-center mt-2">Проверка статуса системы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="paper max-w-md w-full p-8 rounded-lg">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary-foreground mb-2">ДЕЛА</h1>
          <p className="text-sm text-primary-foreground italic">Система учета имущества</p>
          <div className="vintage-divider my-4"></div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" disabled={!isSetup}>Вход</TabsTrigger>
            <TabsTrigger value="setup" disabled={isSetup}>Настройка</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
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
                  control={loginForm.control}
                  name="password"
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
                      Вход...
                    </> 
                    : "Войти"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <p className="text-center mb-4">
              Система еще не настроена. Перейдите на страницу настройки.
            </p>
            <Button 
              className="w-full vintage-button"
              onClick={() => window.location.href = "/setup"}
            >
              Настроить систему
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}