import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SimpleLogin from "@/pages/simple-login";
import SetupPage from "@/pages/setup-page";
import HomePage from "@/pages/home-page";
import DepartmentsPage from "@/pages/departments-page";
import EmployeesPage from "@/pages/employees-page";
import EmployeeDetailsPage from "@/pages/employee-details-page";
import EmployeeFormPage from "@/pages/employee-form-page";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

// Компонент для маршрутизации с поддержкой аутентификации
function AppRoutes() {
  return (
    <Switch>
      <Route path="/auth" component={SimpleLogin} />
      <Route path="/setup" component={SetupPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/departments" component={DepartmentsPage} />
      <ProtectedRoute path="/departments/:departmentId/employees" component={EmployeesPage} />
      <ProtectedRoute path="/employees/:employeeId" component={EmployeeDetailsPage} />
      <ProtectedRoute path="/employees/new" component={EmployeeFormPage} />
      <ProtectedRoute path="/employees/:employeeId/edit" component={EmployeeFormPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <AppRoutes />
    </TooltipProvider>
  );
}

export default App;
