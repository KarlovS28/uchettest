import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Department } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hasPermission, pluralize } from "@/lib/utils";

import Header from "@/components/layout/header";
import DepartmentCard from "@/components/department/department-card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

// Интерфейс для статистики отдела
interface DepartmentStats {
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  inventoryCount: number;
}

// Схема для формы создания отдела
const departmentSchema = z.object({
  name: z.string().min(1, "Введите название отдела"),
});

export default function DepartmentsPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Получение данных об отделах с статистикой
  const { data: departmentsStats, isLoading } = useQuery<DepartmentStats[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments?stats=true", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить отделы");
      return response.json();
    },
  });
  
  // Форма для создания отдела
  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Мутация для создания отдела
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", "/api/departments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Отдел создан",
        description: "Новый отдел успешно добавлен",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать отдел",
        variant: "destructive",
      });
    },
  });
  
  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof departmentSchema>) => {
    createDepartmentMutation.mutate(values);
  };
  
  // Обработчик клика по карточке отдела
  const handleDepartmentClick = (departmentId: number) => {
    setLocation(`/departments/${departmentId}/employees`);
  };
  
  // Проверка прав на создание отделов
  const canCreateDepartment = user && hasPermission(user.permissions as string[], "manage_departments");
  
  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <Header title="Отделы" />
        
        {/* Основной контент */}
        <div className="paper p-6 rounded">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-playfair text-xl">Список отделов</h2>
            {canCreateDepartment && (
              <Button 
                onClick={() => setDialogOpen(true)}
                className="vintage-button"
              >
                <Plus className="mr-1 h-4 w-4" /> Добавить
              </Button>
            )}
          </div>
          
          <div className="vintage-divider mb-6"></div>
          
          {/* Список отделов */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : departmentsStats && departmentsStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentsStats.map((dept) => (
                <DepartmentCard
                  key={dept.departmentId}
                  id={dept.departmentId}
                  name={dept.departmentName}
                  employeeCount={dept.employeeCount}
                  inventoryCount={dept.inventoryCount}
                  onClick={() => handleDepartmentClick(dept.departmentId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              <p>Отделов пока нет. {canCreateDepartment ? "Добавьте первый отдел!" : "Администратор может добавить отдел."}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Диалог добавления отдела */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] paper">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl">Добавить отдел</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название отдела</FormLabel>
                    <FormControl>
                      <Input className="vintage-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="mr-2"
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  className="vintage-button"
                  disabled={createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
