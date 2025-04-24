import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Employee, Department, InsertEmployee } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/app-context";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Header from "@/components/layout/header";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, X } from "lucide-react";
import DocumentUploader from "@/components/ui/document-uploader";

// Схема для формы сотрудника
const employeeSchema = z.object({
  fullName: z.string().min(1, "Введите ФИО сотрудника"),
  position: z.string().min(1, "Введите должность"),
  departmentId: z.string().min(1, "Выберите отдел"),
  hireDate: z.string().min(1, "Укажите дату приема"),
  hireOrderNumber: z.string().min(1, "Введите номер приказа о принятии"),
  passport: z.string().min(1, "Введите паспортные данные"),
  birthDate: z.string().min(1, "Укажите дату рождения"),
  address: z.string().min(1, "Введите адрес"),
  phone: z.string().min(1, "Введите телефон"),
  materialLiabilityType: z.string().min(1, "Выберите тип материальной ответственности"),
  materialLiabilityDocument: z.string().optional(),
});

export default function EmployeeFormPage() {
  const params = useParams<{ employeeId: string }>();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Определяем, редактируем или создаем сотрудника
  const isEditing = !!params.employeeId;
  const employeeId = isEditing ? parseInt(params.employeeId) : undefined;
  
  // Получаем departmentId из URL параметров, если он есть (при создании сотрудника)
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const departmentIdFromUrl = searchParams.get('departmentId');
  
  // Запрос данных об отделах
  const { data: departments, isLoading: isDepartmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить список отделов");
      return response.json();
    },
  });
  
  // Запрос данных о сотруднике (если редактируем)
  const { data: employee, isLoading: isEmployeeLoading } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) throw new Error("ID сотрудника не указан");
      const response = await fetch(`/api/employees/${employeeId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные сотрудника");
      return response.json();
    },
    enabled: isEditing,
  });
  
  // Форма
  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      position: "",
      departmentId: departmentIdFromUrl || "",
      hireDate: new Date().toISOString().split('T')[0],
      hireOrderNumber: "",
      passport: "",
      birthDate: "",
      address: "",
      phone: "",
      materialLiabilityType: "none",
      materialLiabilityDocument: "",
    },
  });
  
  // Заполняем форму данными сотрудника при редактировании
  useEffect(() => {
    if (employee && isEditing) {
      form.reset({
        fullName: employee.fullName,
        position: employee.position,
        departmentId: employee.departmentId.toString(),
        hireDate: new Date(employee.hireDate).toISOString().split('T')[0],
        hireOrderNumber: employee.hireOrderNumber,
        passport: employee.passport,
        birthDate: new Date(employee.birthDate).toISOString().split('T')[0],
        address: employee.address,
        phone: employee.phone,
        materialLiabilityType: employee.materialLiabilityType,
        materialLiabilityDocument: employee.materialLiabilityDocument || "",
      });
    }
  }, [employee, isEditing, form]);
  
  // Мутации для создания и обновления сотрудника
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await apiRequest("POST", "/api/employees", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Сотрудник создан",
        description: "Новый сотрудник успешно добавлен",
      });
      setLocation(`/employees/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать сотрудника",
        variant: "destructive",
      });
    },
  });
  
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Employee> }) => {
      const response = await apiRequest("PUT", `/api/employees/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Сотрудник обновлен",
        description: "Данные сотрудника успешно обновлены",
      });
      setLocation(`/employees/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные сотрудника",
        variant: "destructive",
      });
    },
  });
  
  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof employeeSchema>) => {
    const formattedData = {
      ...values,
      departmentId: parseInt(values.departmentId),
      // @ts-ignore
      organizationId: user.organizationId,
    };
    
    if (isEditing && employeeId) {
      updateEmployeeMutation.mutate({ id: employeeId, data: formattedData });
    } else {
      createEmployeeMutation.mutate(formattedData as InsertEmployee);
    }
  };
  
  // Обработчик отмены
  const handleCancel = () => {
    if (isEditing && employeeId) {
      setLocation(`/employees/${employeeId}`);
    } else if (departmentIdFromUrl) {
      setLocation(`/departments/${departmentIdFromUrl}/employees`);
    } else {
      setLocation("/departments");
    }
  };
  
  const isLoading = (isEditing && isEmployeeLoading) || isDepartmentsLoading;
  const isSubmitting = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;
  
  const pageTitle = isEditing ? "Редактирование сотрудника" : "Добавление сотрудника";
  
  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <Header 
          title={pageTitle}
          backButton={{
            label: "Назад",
            onClick: handleCancel
          }}
        />
        
        {/* Основной контент */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="paper p-6 rounded">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Левая колонка */}
                <div>
                  <h3 className="font-playfair text-lg mb-3">Персональная информация</h3>
                  <div className="vintage-divider mb-4"></div>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>ФИО</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passport"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Паспортные данные</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Дата рождения</FormLabel>
                        <FormControl>
                          <Input type="date" className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Адрес</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isEditing && employee?.photo && (
                    <div className="mb-4">
                      <FormLabel>Фотография</FormLabel>
                      <div className="flex items-center mt-1">
                        <Avatar className="h-16 w-16 mr-4">
                          <AvatarImage src={employee.photo} alt={employee.fullName} />
                          <AvatarFallback>{employee.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          Чтобы изменить фото, сохраните форму и используйте кнопку на странице сотрудника
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Правая колонка */}
                <div>
                  <h3 className="font-playfair text-lg mb-3">Информация о работе</h3>
                  <div className="vintage-divider mb-4"></div>
                  
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Отдел</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="vintage-input">
                              <SelectValue placeholder="Выберите отдел" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Должность</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Дата приема</FormLabel>
                        <FormControl>
                          <Input type="date" className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hireOrderNumber"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>№ приказа о принятии</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <h3 className="font-playfair text-lg mb-3 mt-6">Материальная ответственность</h3>
                  <div className="vintage-divider mb-4"></div>
                  
                  <FormField
                    control={form.control}
                    name="materialLiabilityType"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Тип ответственности</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="vintage-input">
                              <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="individual">Индивидуальная</SelectItem>
                            <SelectItem value="collective">Коллективная</SelectItem>
                            <SelectItem value="none">Отсутствует</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="materialLiabilityDocument"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Документ о материальной ответственности</FormLabel>
                        <FormControl>
                          <Input className="vintage-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            <div className="vintage-divider my-6"></div>
            
            <div className="flex justify-center gap-4">
              <Button 
                type="submit" 
                className="vintage-button"
                disabled={isSubmitting}
              >
                <Save className="mr-1 h-4 w-4" /> {isSubmitting ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button 
                type="button" 
                className="vintage-button"
                onClick={handleCancel}
              >
                <X className="mr-1 h-4 w-4" /> Отмена
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
