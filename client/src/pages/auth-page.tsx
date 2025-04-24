import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Схема для формы входа
const loginSchema = z.object({
  username: z.string().min(1, "Введите имя пользователя"),
  password: z.string().min(1, "Введите пароль"),
});

// Схема для формы первоначальной настройки
const setupSchema = z.object({
  organizationName: z.string().min(1, "Введите название организации"),
  adminUsername: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  adminPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  adminFullName: z.string().min(1, "Введите ФИО администратора"),
  adminPosition: z.string().min(1, "Введите должность администратора"),
});

// Оборачиваем компонент для предотвращения ошибки useAuth
function AuthPageContent() {
  const [location, setLocation] = useLocation();
  const { user, isSystemSetup, isSystemSetupLoading, loginMutation, setupMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Форма для входа
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Форма для первоначальной настройки
  const setupForm = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      organizationName: "",
      adminUsername: "",
      adminPassword: "",
      adminFullName: "",
      adminPosition: "",
    },
  });

  // Отправка формы входа
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    console.log("Вход:", values);
    loginMutation.mutate(values);
  };

  // Отправка формы настройки
  const onSetupSubmit = (values: z.infer<typeof setupSchema>) => {
    console.log("Настройка системы:", values);
    setupMutation.mutate(values);
  };

  // Если пользователь авторизован, перенаправляем на главную
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Определяем, какую форму показывать
  useEffect(() => {
    if (!isSystemSetupLoading) {
      setActiveTab(isSystemSetup ? "login" : "setup");
    }
  }, [isSystemSetup, isSystemSetupLoading]);

  if (isSystemSetupLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="paper p-8 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-center mt-2">Загрузка...</p>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" disabled={!isSystemSetup}>Вход</TabsTrigger>
            <TabsTrigger value="setup" disabled={isSystemSetup}>Настройка</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
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
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Вход..." : "Войти"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
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
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? "Создание..." : "Создать администратора"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Компонент-обертка, который перехватывает ошибки контекста
export default function AuthPage() {
  try {
    return <AuthPageContent />;
  } catch (err) {
    // Если произошла ошибка с контекстом аутентификации, показываем заглушку
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="paper p-8 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-center mt-2">Загрузка приложения...</p>
        </div>
      </div>
    );
  }
}