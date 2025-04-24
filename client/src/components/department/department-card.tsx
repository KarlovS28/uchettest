import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/utils";

interface DepartmentCardProps {
  id: number;
  name: string;
  employeeCount: number;
  inventoryCount: number;
  onClick?: () => void;
}

export default function DepartmentCard({ 
  id, 
  name, 
  employeeCount, 
  inventoryCount, 
  onClick 
}: DepartmentCardProps) {
  return (
    <Card 
      className="paper hover:bg-primary hover:bg-opacity-20 cursor-pointer transition" 
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-primary-foreground">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="text-sm text-primary-foreground font-medium">Сотрудников:</span>{" "}
            {pluralize(employeeCount, "сотрудник", "сотрудника", "сотрудников")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="text-sm text-primary-foreground font-medium">Имущества:</span>{" "}
            {pluralize(inventoryCount, "единица", "единицы", "единиц")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
