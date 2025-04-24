import { useState } from "react";
import { InventoryItem } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  canEdit: boolean;
}

export default function InventoryTable({ items, isLoading, canEdit }: InventoryTableProps) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<InventoryItem>>({});
  
  // Мутация для обновления имущества
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InventoryItem> }) => {
      const response = await apiRequest("PUT", `/api/inventory/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Имущество обновлено",
        description: "Данные имущества успешно обновлены",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/inventory`] });
      setEditingItem(null);
      setEditValues({});
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные имущества",
        variant: "destructive",
      });
    },
  });
  
  // Начало редактирования
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item.id);
    setEditValues({
      name: item.name,
      inventoryNumber: item.inventoryNumber,
      description: item.description,
      cost: item.cost
    });
  };
  
  // Отмена редактирования
  const handleCancel = () => {
    setEditingItem(null);
    setEditValues({});
  };
  
  // Сохранение изменений
  const handleSave = (id: number) => {
    if (Object.keys(editValues).length > 0) {
      updateInventoryMutation.mutate({ id, data: editValues });
    } else {
      setEditingItem(null);
    }
  };
  
  // Обработчик изменения значений полей
  const handleChange = (field: keyof InventoryItem, value: string | number) => {
    setEditValues(prev => ({
      ...prev,
      [field]: field === 'cost' ? parseInt(value as string) || 0 : value
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Этому сотруднику еще не вверено имущество
      </div>
    );
  }
  
  return (
    <Table className="vintage-table">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px] text-center">№</TableHead>
          <TableHead>Наименование</TableHead>
          <TableHead>Инв. номер</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead>Стоимость</TableHead>
          {canEdit && <TableHead className="text-center w-[100px]">Действия</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="text-center">{index + 1}</TableCell>
            
            <TableCell>
              {editingItem === item.id ? (
                <Input 
                  className="vintage-input text-sm p-1 h-auto"
                  value={editValues.name || item.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              ) : (
                item.name
              )}
            </TableCell>
            
            <TableCell>
              {editingItem === item.id ? (
                <Input 
                  className="vintage-input text-sm p-1 h-auto"
                  value={editValues.inventoryNumber || item.inventoryNumber}
                  onChange={(e) => handleChange('inventoryNumber', e.target.value)}
                />
              ) : (
                item.inventoryNumber
              )}
            </TableCell>
            
            <TableCell>
              {editingItem === item.id ? (
                <Input 
                  className="vintage-input text-sm p-1 h-auto"
                  value={editValues.description || item.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              ) : (
                item.description
              )}
            </TableCell>
            
            <TableCell>
              {editingItem === item.id ? (
                <Input 
                  className="vintage-input text-sm p-1 h-auto"
                  type="number"
                  value={editValues.cost === undefined ? item.cost : editValues.cost}
                  onChange={(e) => handleChange('cost', e.target.value)}
                />
              ) : (
                formatCurrency(item.cost)
              )}
            </TableCell>
            
            {canEdit && (
              <TableCell>
                <div className="flex justify-center space-x-1">
                  {editingItem === item.id ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleSave(item.id)}
                        title="Сохранить"
                        disabled={updateInventoryMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={handleCancel}
                        title="Отменить"
                        className="text-destructive"
                        disabled={updateInventoryMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(item)}
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
