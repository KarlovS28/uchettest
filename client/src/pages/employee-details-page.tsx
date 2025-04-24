import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Employee, Department, InventoryItem, EmployeeDocument } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/app-context";
import { formatDate, formatCurrency, hasPermission, translateLiabilityType } from "@/lib/utils";

import Header from "@/components/layout/header";
import InventoryTable from "@/components/inventory/inventory-table";
import DocumentUploader from "@/components/ui/document-uploader";
import PrintDocument from "@/components/print/print-document";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Edit, Printer, UserMinus, Camera, FileText, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EmployeeDetailsPage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = parseInt(params.employeeId);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setCurrentEmployee, isEditMode, setEditMode } = useAppContext();
  
  // State
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Запрос данных о сотруднике
  const { data: employee, isLoading: isEmployeeLoading } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные сотрудника");
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentEmployee(data);
    },
  });
  
  // Запрос данных об отделе
  const { data: department, isLoading: isDepartmentLoading } = useQuery<Department>({
    queryKey: [`/api/departments/${employee?.departmentId}`],
    queryFn: async () => {
      if (!employee) throw new Error("Нет данных о сотруднике");
      const response = await fetch(`/api/departments/${employee.departmentId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные отдела");
      return response.json();
    },
    enabled: !!employee,
  });
  
  // Запрос списка имущества сотрудника
  const { data: inventoryItems, isLoading: isInventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventory`, { employeeId }],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?employeeId=${employeeId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить список имущества");
      return response.json();
    },
  });
  
  // Запрос списка документов сотрудника
  const { data: documents, isLoading: isDocumentsLoading } = useQuery<EmployeeDocument[]>({
    queryKey: [`/api/employees/${employeeId}/documents`],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить список документов");
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
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      setDismissDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось уволить сотрудника",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для загрузки фото
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await fetch(`/api/upload/photo/${employeeId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Не удалось загрузить фото");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Фото загружено",
        description: "Фотография сотрудника успешно обновлена",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      setPhotoDialogOpen(false);
      setSelectedPhoto(null);
      setUploadingPhoto(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить фотографию",
        variant: "destructive",
      });
      setUploadingPhoto(false);
    },
  });
  
  // Обработчики действий
  const handleBackToEmployees = () => {
    if (employee) {
      setLocation(`/departments/${employee.departmentId}/employees`);
    } else {
      setLocation("/departments");
    }
  };
  
  const handleEditEmployee = () => {
    setLocation(`/employees/${employeeId}/edit`);
  };
  
  const handlePrintEmployee = () => {
    setPrintDialogOpen(true);
  };
  
  const handleDismissEmployee = () => {
    setDismissDialogOpen(true);
  };
  
  const confirmDismiss = () => {
    if (!employee) return;
    
    const today = new Date().toISOString().split('T')[0];
    const orderNumber = `№У-${Math.floor(Math.random() * 10000)} от ${formatDate(new Date())}`;
    
    dismissMutation.mutate({
      id: employee.id,
      date: today,
      orderNumber: orderNumber
    });
  };
  
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedPhoto(event.target.files[0]);
    }
  };
  
  const handlePhotoUpload = () => {
    if (selectedPhoto) {
      uploadPhotoMutation.mutate(selectedPhoto);
    }
  };
  
  const handleViewDocument = (document: EmployeeDocument) => {
    window.open(document.path, '_blank');
  };
  
  const handleAddInventoryItem = () => {
    // Тут могла бы быть логика добавления имущества
    toast({
      title: "Добавление имущества",
      description: "Функциональность находится в разработке",
    });
  };
  
  // Проверка прав пользователя
  const canManageEmployees = user && hasPermission(user.permissions as string[], "manage_employees");
  const canManageLiability = user && hasPermission(user.permissions as string[], "manage_liability");
  const canPrintDocuments = user && hasPermission(user.permissions as string[], "print_documents");
  
  const isLoading = isEmployeeLoading || isDepartmentLoading;
  
  // Если сотрудник уволен, показываем штамп "УВОЛЕН"
  const showDismissedStamp = employee?.dismissed === true;
  
  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Заголовок */}
        <Header 
          title="Карточка сотрудника"
          backButton={{
            label: "Назад",
            onClick: handleBackToEmployees
          }}
        />
        
        {/* Основной контент */}
        <div className="paper p-6 rounded relative">
          {/* Штамп "УВОЛЕН" */}
          {showDismissedStamp && (
            <div className="stamp top-10 right-10 z-10">
              <span className="text-sm font-bold">УВОЛЕН</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : employee ? (
            <div className="flex flex-wrap md:flex-nowrap">
              {/* Левая колонка - Информация о сотруднике */}
              <div className="w-full md:w-1/3 md:pr-6 mb-6 md:mb-0">
                <div className="mb-6 text-center">
                  <div className="relative inline-block">
                    <Avatar className="w-32 h-32 border-2 border-primary-foreground">
                      {employee.photo ? (
                        <AvatarImage src={employee.photo} alt={employee.fullName} />
                      ) : null}
                      <AvatarFallback className="text-2xl">{employee.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {canManageEmployees && !employee.dismissed && (
                      <Button 
                        className="absolute bottom-0 right-0 bg-primary-foreground text-primary rounded-full w-8 h-8 p-0"
                        onClick={() => setPhotoDialogOpen(true)}
                        title="Изменить фото"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <h2 className="font-playfair text-xl font-bold text-center mb-4">{employee.fullName}</h2>
                
                <div className="vintage-divider mb-4"></div>
                
                <div className="mb-4">
                  <h3 className="font-playfair text-lg mb-2">Личные данные</h3>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Паспортные данные</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{employee.passport}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Дата рождения</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{formatDate(employee.birthDate)}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Адрес</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{employee.address}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Телефон</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{employee.phone}</p>
                  </div>
                </div>
                
                <div className="vintage-divider mb-4"></div>
                
                <div>
                  <h3 className="font-playfair text-lg mb-2">Информация о работе</h3>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Должность</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{employee.position}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Отдел</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{department?.name || "-"}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Дата приема</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{formatDate(employee.hireDate)}</p>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">№ приказа о принятии</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{employee.hireOrderNumber}</p>
                  </div>
                  
                  {employee.dismissed && (
                    <>
                      <div className="mb-2">
                        <label className="block text-sm text-destructive font-medium">Дата увольнения</label>
                        <p className="vintage-input px-2 py-1 rounded text-sm text-destructive">{formatDate(employee.dismissalDate)}</p>
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-sm text-destructive font-medium">№ приказа об увольнении</label>
                        <p className="vintage-input px-2 py-1 rounded text-sm text-destructive">{employee.dismissalOrderNumber}</p>
                      </div>
                    </>
                  )}
                  
                  <div className="mb-2">
                    <label className="block text-sm text-primary-foreground font-medium">Материальная ответственность</label>
                    <p className="vintage-input px-2 py-1 rounded text-sm">{translateLiabilityType(employee.materialLiabilityType)}</p>
                  </div>
                  
                  {employee.materialLiabilityDocument && (
                    <div className="mb-2">
                      <label className="block text-sm text-primary-foreground font-medium">Документ МО</label>
                      <p className="vintage-input px-2 py-1 rounded text-sm">{employee.materialLiabilityDocument}</p>
                    </div>
                  )}
                </div>
                
                <div className="vintage-divider my-4"></div>
                
                <div>
                  <h3 className="font-playfair text-lg mb-2">Документы</h3>
                  <div className="mb-4">
                    {isDocumentsLoading ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : documents && documents.length > 0 ? (
                      <ul className="list-disc list-inside text-sm">
                        {documents.map((doc) => (
                          <li key={doc.id} className="mb-1">
                            <button 
                              onClick={() => handleViewDocument(doc)}
                              className="text-primary-foreground hover:underline text-left"
                            >
                              {doc.filename}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет загруженных документов</p>
                    )}
                    
                    {canManageEmployees && !employee.dismissed && (
                      <Button 
                        onClick={() => setDocumentDialogOpen(true)}
                        className="vintage-button text-sm mt-2"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Добавить документ
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Правая колонка - Имущество */}
              <div className="w-full md:w-2/3">
                <h3 className="font-playfair text-lg mb-3">Вверенное имущество</h3>
                <div className="vintage-divider mb-4"></div>
                
                <div className="overflow-x-auto mb-4">
                  <InventoryTable 
                    items={inventoryItems || []} 
                    isLoading={isInventoryLoading} 
                    canEdit={canManageLiability && !employee.dismissed}
                  />
                </div>
                
                {canManageLiability && !employee.dismissed && (
                  <div className="flex mb-6">
                    <Button 
                      className="vintage-button text-sm"
                      onClick={handleAddInventoryItem}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Добавить имущество
                    </Button>
                  </div>
                )}
                
                <div className="vintage-divider mb-6"></div>
                
                <div className="text-center">
                  <h3 className="font-playfair text-lg mb-4">Управление сотрудником</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {canManageEmployees && !employee.dismissed && (
                      <Button 
                        className="vintage-button"
                        onClick={handleEditEmployee}
                      >
                        <Edit className="mr-1 h-4 w-4" /> Изменить
                      </Button>
                    )}
                    
                    {canPrintDocuments && (
                      <Button 
                        className="vintage-button"
                        onClick={handlePrintEmployee}
                      >
                        <Printer className="mr-1 h-4 w-4" /> Печать
                      </Button>
                    )}
                    
                    {canManageEmployees && !employee.dismissed && (
                      <Button 
                        className="vintage-button bg-destructive hover:bg-destructive text-white"
                        onClick={handleDismissEmployee}
                      >
                        <UserMinus className="mr-1 h-4 w-4" /> Уволить
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Сотрудник не найден
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
              Вы уверены, что хотите уволить сотрудника {employee?.fullName}? 
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
      
      {/* Диалог смены фотографии */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="paper sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Изменить фотографию</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center">
              {selectedPhoto ? (
                <img 
                  src={URL.createObjectURL(selectedPhoto)} 
                  alt="Предпросмотр" 
                  className="w-32 h-32 object-cover rounded-full"
                />
              ) : (
                <Avatar className="w-32 h-32">
                  {employee?.photo ? (
                    <AvatarImage src={employee.photo} alt={employee.fullName} />
                  ) : null}
                  <AvatarFallback className="text-2xl">{employee?.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoChange}
              className="text-sm"
            />
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setPhotoDialogOpen(false)}
              className="vintage-button bg-secondary"
            >
              Отмена
            </Button>
            <Button 
              onClick={handlePhotoUpload}
              className="vintage-button"
              disabled={!selectedPhoto || uploadingPhoto}
            >
              {uploadingPhoto ? "Загрузка..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления документа */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="paper sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Добавить документ</DialogTitle>
          </DialogHeader>
          
          <DocumentUploader 
            employeeId={employeeId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}/documents`] });
              setDocumentDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Диалог печати документов */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="paper sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Печать документов</DialogTitle>
          </DialogHeader>
          
          <PrintDocument 
            employeeId={employeeId}
            onClose={() => setPrintDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
