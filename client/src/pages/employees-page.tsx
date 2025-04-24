import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Employee, Department } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, hasPermission } from "@/lib/utils";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Eye, Edit, UserMinus, Search } from "lucide-react";
import { useAppContext } from "@/context/app-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EmployeesPage() {
  const params = useParams<{ departmentId: string }>();
  const departmentId = parseInt(params.departmentId);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setCurrentDepartment } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Получение данных об отделе
  const { data: department, isLoading: isDepartmentLoading } = useQuery<Department>({
    queryKey: [`/api/departments/${departmentId}`],
    queryFn: async () => {
      const response = await fetch(`/api/departments/${departmentId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные отдела");
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentDepartment(data);
    },
  });
  
  // Получение списка сотрудников отдела
  const { data: employees, isLoading: isEmployeesLoading } = useQuery<Employee[]>({
    queryKey: [`/api/employees`, { departmentId }],
    queryFn: async () => {
      const response = await fetch(`/api/employees?departmentId=${departmentId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить список сотрудников");
      return response.json();
    },
  });
  
  // Мутация для увольнения сотрудника
  const dismissMutation = useMutation({
    mutationFn: async ({ id, date, orderNumber }: { id: number, date: string, orderNumber: string }) => {
      const response = await apiRequest("POST", `/api/employees/${id}/dismiss`, {
        dismissalDate: date,
        dismissalOrderNumber: orderNumber
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Сотрудник уволен",
        description: "Сотрудник успешно уволен и перемещен в архив",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees`] });
      setDismissDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось уволить сотрудника",
        variant: "destructive",
      });
    },
  });
  
  // Обработчики действий
  const handleBackToDepartments = () => {
    setLocation("/departments");
  };
  
  const handleViewEmployee = (employee: Employee) => {
    setLocation(`/employees/${employee.id}`);
  };
  
  const handleEditEmployee = (employee: Employee) => {
    setLocation(`/employees/${employee.id}/edit`);
  };
  
  const handleAddEmployee = () => {
    setLocation(`/employees/new?departmentId=${departmentId}`);
  };
  
  const handleDismissEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDismissDialogOpen(true);
  };
  
  const confirmDismiss = () => {
    if (!selectedEmployee) return;
    
    const today = new Date().toISOString().split('T')[0];
    const orderNumber = `№У-${Math.floor(Math.random() * 10000)} от ${formatDate(new Date())}`;
    
    dismissMutation.mutate({
      id: selectedEmployee.id,
      date: today,
      orderNumber: orderNumber
    });
  };
  
  // Фильтрация сотрудников по поисковому запросу
  const filteredEmployees = employees 
    ? employees.filter(emp => 
        !emp.dismissed && 
        (searchTerm === "" || 
         emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
         emp.hireOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];
  
  // Проверка прав пользователя
  const canManageEmployees = user && hasPermission(user.permissions as string[], "manage_employees");
  
  const isLoading = isDepartmentLoading || isEmployeesLoading;
  
  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <Header 
          title={department ? department.name : "Загрузка..."}
          backButton={{
            label: "Назад",
            onClick: handleBackToDepartments
          }}
        />
        
        {/* Основной контент */}
        <div className="paper p-6 rounded">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-playfair text-xl">Список сотрудников</h2>
            <div className="flex">
              <div className="relative mr-4">
                <Input 
                  type="text" 
                  placeholder="Поиск..." 
                  className="vintage-input pl-8 pr-2 py-1 rounded text-sm w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {canManageEmployees && (
                <Button 
                  onClick={handleAddEmployee}
                  className="vintage-button"
                >
                  <Plus className="mr-1 h-4 w-4" /> Добавить
                </Button>
              )}
            </div>
          </div>
          
          <div className="vintage-divider mb-6"></div>
          
          {/* Таблица сотрудников */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="vintage-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Фото</TableHead>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>№ приказа о принятии</TableHead>
                    <TableHead className="text-center">Имущество</TableHead>
                    <TableHead className="text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow 
                      key={employee.id}
                      className="hover:bg-primary hover:bg-opacity-10"
                    >
                      <TableCell className="text-center">
                        <Avatar className="h-10 w-10 mx-auto">
                          {employee.photo ? (
                            <AvatarImage src={employee.photo} alt={employee.fullName} />
                          ) : null}
                          <AvatarFallback>{employee.fullName.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{employee.fullName}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.hireOrderNumber}</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewEmployee(employee)}
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManageEmployees && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditEmployee(employee)}
                                title="Редактировать"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDismissEmployee(employee)}
                                className="text-destructive"
                                title="Уволить"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              {searchTerm ? "Нет сотрудников, соответствующих запросу" : "В этом отделе нет сотрудников"}
            </div>
          )}
        </div>
      </div>
      
      {/* Диалог подтверждения увольнения */}
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent className="paper">
          <AlertDialogHeader>
            <AlertDialogTitle>Уволить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите уволить сотрудника {selectedEmployee?.fullName}? 
              Эта операция переместит сотрудника в архив.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vintage-button bg-secondary">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              className="vintage-button bg-destructive text-white"
              onClick={confirmDismiss}
            >
              {dismissMutation.isPending ? "Выполнение..." : "Уволить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
