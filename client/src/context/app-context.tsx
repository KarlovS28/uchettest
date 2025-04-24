import { createContext, ReactNode, useContext, useState } from "react";
import { Department, Employee } from "@shared/schema";

type AppContextType = {
  // Активный отдел
  currentDepartment: Department | null;
  setCurrentDepartment: (department: Department | null) => void;
  
  // Активный сотрудник
  currentEmployee: Employee | null;
  setCurrentEmployee: (employee: Employee | null) => void;
  
  // Режим редактирования
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
};

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [isEditMode, setEditMode] = useState<boolean>(false);
  
  return (
    <AppContext.Provider
      value={{
        currentDepartment,
        setCurrentDepartment,
        currentEmployee,
        setCurrentEmployee,
        isEditMode,
        setEditMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
