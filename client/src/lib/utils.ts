import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Форматирование даты в российском формате ДД.ММ.ГГГГ
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('ru-RU');
}

// Форматирование денежной суммы в российском формате
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}

// Склонение существительных в зависимости от числа
export function pluralize(count: number, one: string, few: string, many: string): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return `${count} ${one}`;
  } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `${count} ${few}`;
  } else {
    return `${count} ${many}`;
  }
}

// Проверка наличия разрешения у пользователя
export function hasPermission(userPermissions: string[], permission: string): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes('full_access') || userPermissions.includes(permission);
}

// Получение инициалов из полного имени
export function getInitials(fullName: string): string {
  if (!fullName) return '';
  
  const nameParts = fullName.split(' ');
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  
  return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
}

// Получение текущего года
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Превращение первой буквы строки в заглавную
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Перевод типа материальной ответственности на русский
export function translateLiabilityType(type: string): string {
  const types: Record<string, string> = {
    'individual': 'Индивидуальная',
    'collective': 'Коллективная',
    'none': 'Отсутствует'
  };
  
  return types[type] || type;
}

// Перевод роли пользователя на русский
export function translateUserRole(role: string): string {
  const roles: Record<string, string> = {
    'admin': 'Администратор',
    'manager': 'Менеджер',
    'viewer': 'Просмотр'
  };
  
  return roles[role] || role;
}

// Перевод разрешений на русский
export function translatePermission(permission: string): string {
  const permissions: Record<string, string> = {
    'full_access': 'Полный доступ',
    'manage_positions': 'Управление должностями',
    'view_employee_data': 'Просмотр данных сотрудников',
    'manage_employees': 'Управление сотрудниками',
    'manage_departments': 'Управление отделами',
    'print_documents': 'Печать документов',
    'manage_liability': 'Управление материальной ответственностью'
  };
  
  return permissions[permission] || permission;
}
