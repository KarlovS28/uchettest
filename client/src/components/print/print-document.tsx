import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Employee, Department, InventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, FileText } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface PrintDocumentProps {
  employeeId: number;
  onClose?: () => void;
}

export default function PrintDocument({ employeeId, onClose }: PrintDocumentProps) {
  const [documentType, setDocumentType] = useState<string>("liability");
  
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
  
  const isLoading = isEmployeeLoading || isDepartmentLoading || isInventoryLoading;
  
  // Функция для генерации и печати документов в разных форматах
  const handlePrint = () => {
    if (!employee || !department) return;
    
    let content = '';
    
    // Формируем содержимое документа в зависимости от выбранного типа
    switch (documentType) {
      case 'liability':
        content = generateLiabilityDocument(employee, department, inventoryItems || []);
        break;
      case 'profile':
        content = generateEmployeeProfile(employee, department);
        break;
      case 'inventory':
        content = generateInventoryList(employee, inventoryItems || []);
        break;
      default:
        content = generateLiabilityDocument(employee, department, inventoryItems || []);
    }
    
    // Создаем новое окно и выводим в него документ
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <title>Печать документа</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              margin: 2cm;
              font-size: 12pt;
              line-height: 1.5;
            }
            h1, h2, h3 {
              text-align: center;
              font-weight: bold;
            }
            h1 { font-size: 16pt; }
            h2 { font-size: 14pt; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            table, th, td {
              border: 1px solid black;
            }
            th, td {
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .footer {
              margin-top: 50px;
            }
            .signature {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .signature-line {
              border-bottom: 1px solid black;
              width: 200px;
              display: inline-block;
              margin-left: 10px;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${content}
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.print();" style="padding: 10px 20px; font-size: 14px; cursor: pointer;">Печать</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  // Генерация документа о материальной ответственности
  const generateLiabilityDocument = (employee: Employee, department: Department, items: InventoryItem[]) => {
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    
    return `
      <div class="header">
        <h1>ДОГОВОР О МАТЕРИАЛЬНОЙ ОТВЕТСТВЕННОСТИ</h1>
        <p>г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatDate(new Date())}</p>
      </div>
      
      <p>Настоящий договор о материальной ответственности заключен между работодателем и работником:</p>
      
      <p><strong>Работник:</strong> ${employee.fullName}</p>
      <p><strong>Должность:</strong> ${employee.position}</p>
      <p><strong>Отдел:</strong> ${department.name}</p>
      <p><strong>Дата приема на работу:</strong> ${formatDate(employee.hireDate)}</p>
      <p><strong>Приказ о приеме на работу:</strong> ${employee.hireOrderNumber}</p>
      
      <p>Работнику передано следующее имущество:</p>
      
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Инвентарный номер</th>
            <th>Описание</th>
            <th>Стоимость</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name}</td>
              <td>${item.inventoryNumber}</td>
              <td>${item.description}</td>
              <td>${formatCurrency(item.cost)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" style="text-align: right;"><strong>Итого:</strong></td>
            <td><strong>${formatCurrency(totalCost)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <p>Работник принимает на себя полную материальную ответственность за недостачу вверенного ему работодателем имущества, а также за ущерб, возникший у работодателя в результате возмещения им ущерба иным лицам.</p>
      
      <div class="footer">
        <div class="signature">
          <p>Работодатель: <span class="signature-line"></span></p>
          <p>Работник: <span class="signature-line"></span></p>
        </div>
        <div class="signature" style="margin-top: 10px;">
          <p>М.П.</p>
          <p></p>
        </div>
      </div>
    `;
  };
  
  // Генерация профиля сотрудника
  const generateEmployeeProfile = (employee: Employee, department: Department) => {
    return `
      <div class="header">
        <h1>ЛИЧНАЯ КАРТОЧКА СОТРУДНИКА</h1>
      </div>
      
      <h2>1. Общие сведения</h2>
      <p><strong>ФИО:</strong> ${employee.fullName}</p>
      <p><strong>Должность:</strong> ${employee.position}</p>
      <p><strong>Отдел:</strong> ${department.name}</p>
      <p><strong>Дата рождения:</strong> ${formatDate(employee.birthDate)}</p>
      <p><strong>Паспортные данные:</strong> ${employee.passport}</p>
      <p><strong>Адрес:</strong> ${employee.address}</p>
      <p><strong>Телефон:</strong> ${employee.phone}</p>
      
      <h2>2. Сведения о работе</h2>
      <p><strong>Дата приема на работу:</strong> ${formatDate(employee.hireDate)}</p>
      <p><strong>Приказ о приеме на работу:</strong> ${employee.hireOrderNumber}</p>
      <p><strong>Тип материальной ответственности:</strong> ${
        employee.materialLiabilityType === 'individual' ? 'Индивидуальная' :
        employee.materialLiabilityType === 'collective' ? 'Коллективная' : 'Отсутствует'
      }</p>
      ${employee.materialLiabilityDocument ? `<p><strong>Документ о материальной ответственности:</strong> ${employee.materialLiabilityDocument}</p>` : ''}
      ${employee.dismissed ? `
        <p><strong>Дата увольнения:</strong> ${formatDate(employee.dismissalDate)}</p>
        <p><strong>Приказ об увольнении:</strong> ${employee.dismissalOrderNumber}</p>
      ` : ''}
      
      <div class="footer">
        <div class="signature">
          <p>Руководитель отдела кадров: <span class="signature-line"></span></p>
          <p>Дата: ${formatDate(new Date())}</p>
        </div>
      </div>
    `;
  };
  
  // Генерация списка имущества
  const generateInventoryList = (employee: Employee, items: InventoryItem[]) => {
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    
    return `
      <div class="header">
        <h1>ОПИСЬ ИМУЩЕСТВА</h1>
        <p>Ответственное лицо: ${employee.fullName}</p>
        <p>Должность: ${employee.position}</p>
        <p>Дата составления: ${formatDate(new Date())}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Инвентарный номер</th>
            <th>Описание</th>
            <th>Стоимость</th>
          </tr>
        </thead>
        <tbody>
          ${items.length > 0 ? items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name}</td>
              <td>${item.inventoryNumber}</td>
              <td>${item.description}</td>
              <td>${formatCurrency(item.cost)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" style="text-align: center;">Имущество не найдено</td>
            </tr>
          `}
          ${items.length > 0 ? `
            <tr>
              <td colspan="4" style="text-align: right;"><strong>Итого:</strong></td>
              <td><strong>${formatCurrency(totalCost)}</strong></td>
            </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div class="footer">
        <div class="signature">
          <p>Составил: <span class="signature-line"></span></p>
          <p>Проверил: <span class="signature-line"></span></p>
        </div>
      </div>
    `;
  };
  
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="document-type">Выберите тип документа</Label>
        <Select 
          value={documentType}
          onValueChange={setDocumentType}
        >
          <SelectTrigger id="document-type" className="vintage-input">
            <SelectValue placeholder="Выберите тип документа" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="liability">Договор о материальной ответственности</SelectItem>
            <SelectItem value="profile">Личная карточка сотрудника</SelectItem>
            <SelectItem value="inventory">Опись имущества</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline"
          onClick={onClose}
        >
          Отмена
        </Button>
        <Button 
          className="vintage-button"
          onClick={handlePrint}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
