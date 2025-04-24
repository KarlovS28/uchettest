import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Employee } from "@shared/schema";

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  return (
    <Card 
      className="paper hover:bg-primary hover:bg-opacity-20 cursor-pointer transition" 
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-12 w-12">
          {employee.photo ? (
            <AvatarImage src={employee.photo} alt={employee.fullName} />
          ) : null}
          <AvatarFallback>{employee.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg font-medium text-primary-foreground">
            {employee.fullName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{employee.position}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium text-primary-foreground">Дата приема:</span>{" "}
            {formatDate(employee.hireDate)}
          </div>
          <div className="text-sm">
            <span className="font-medium text-primary-foreground">Приказ №:</span>{" "}
            {employee.hireOrderNumber}
          </div>
          
          {employee.dismissed && (
            <div className="text-sm text-destructive mt-2">
              <span className="font-medium">Уволен:</span>{" "}
              {formatDate(employee.dismissalDate)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
