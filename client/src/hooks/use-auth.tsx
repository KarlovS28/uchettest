import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  setupMutation: UseMutationResult<SetupResponse, Error, SetupData>;
  isSystemSetup: boolean;
  isSystemSetupLoading: boolean;
};

type LoginData = {
  username: string;
  password: string;
};

type SetupData = {
  organizationName: string;
  adminUsername: string;
  adminPassword: string;
  adminFullName: string;
  adminPosition: string;
};

type SetupResponse = {
  message: string;
  organization: any;
  admin: User;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Проверка статуса системы (настроена или нет)
  const {
    data: systemStatus,
    isLoading: isSystemSetupLoading,
  } = useQuery<{ isSetup: boolean }>({
    queryKey: ["/api/system-status"],
    retry: false,
  });

  // Получение данных текущего пользователя
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: systemStatus?.isSetup === true,
  });

  // Мутация для входа в систему
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Вход выполнен",
        description: `Добро пожаловать, ${user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка входа",
        description: "Неправильное имя пользователя или пароль",
        variant: "destructive",
      });
    },
  });

  // Мутация для выхода из системы
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для первоначальной настройки системы
  const setupMutation = useMutation<SetupResponse, Error, SetupData>({
    mutationFn: async (setupData: SetupData) => {
      const res = await apiRequest("POST", "/api/setup", setupData);
      return await res.json();
    },
    onSuccess: (data: SetupResponse) => {
      queryClient.setQueryData(["/api/user"], data.admin);
      queryClient.setQueryData(["/api/system-status"], { isSetup: true });
      
      toast({
        title: "Система настроена",
        description: "Начальная настройка успешно завершена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка настройки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error: error as Error,
        loginMutation,
        logoutMutation,
        setupMutation,
        isSystemSetup: systemStatus?.isSetup || false,
        isSystemSetupLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
