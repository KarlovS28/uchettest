import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DepartmentsPage from "@/pages/departments-page";
import EmployeesPage from "@/pages/employees-page";
import EmployeeDetailsPage from "@/pages/employee-details-page";
import EmployeeFormPage from "@/pages/employee-form-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
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
      <Router />
    </TooltipProvider>
  );
}

export default App;
