import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, FileSpreadsheet, Upload, Download, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";

export function ExcelImportExport() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"employees" | "inventory">("employees");
  const [exportType, setExportType] = useState<"employees" | "inventory">("employees");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();

  // Обработка загрузки файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  // Импорт данных из Excel
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Ошибка",
        description: "Выберите файл для импорта",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch(`/api/import/${importType}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Ошибка при импорте данных");
      }

      const result = await response.json();
      setImportResults(result);

      toast({
        title: "Импорт завершен",
        description: `Успешно: ${result.success}, Ошибок: ${result.failed}`,
        variant: result.failed === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Ошибка при импорте:", error);
      toast({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Экспорт данных в Excel
  const handleExport = async () => {
    setIsExporting(true);

    try {
      let url = `/api/export/${exportType}`;
      let params = new URLSearchParams();

      if (exportType === "employees" && departmentId) {
        params.append("departmentId", departmentId);
      } else if (exportType === "inventory") {
        if (employeeId) {
          params.append("employeeId", employeeId);
        } else if (departmentId) {
          params.append("departmentId", departmentId);
        } else {
          throw new Error("Укажите ID сотрудника или отдела");
        }
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Ошибка при экспорте данных");
      }

      // Получаем blob данные и сохраняем файл
      const blob = await response.blob();
      const filename = exportType === "employees" ? "сотрудники.xlsx" : "инвентарь.xlsx";
      saveAs(blob, filename);

      toast({
        title: "Экспорт завершен",
        description: "Файл Excel успешно создан и загружен",
      });
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
      toast({
        title: "Ошибка экспорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="paper w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-playfair">Экспорт/Импорт данных</CardTitle>
        <CardDescription>Работа с данными в формате Excel</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Импорт данных</TabsTrigger>
            <TabsTrigger value="export">Экспорт данных</TabsTrigger>
          </TabsList>

          {/* Импорт данных */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="importType">Тип данных</Label>
              <select
                id="importType"
                className="vintage-select w-full p-2 border border-border rounded"
                value={importType}
                onChange={(e) => setImportType(e.target.value as "employees" | "inventory")}
              >
                <option value="employees">Сотрудники</option>
                <option value="inventory">Инвентарь</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Файл Excel</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="vintage-input"
              />
              <p className="text-sm text-muted-foreground">
                {importFile ? `Выбран файл: ${importFile.name}` : "Выберите файл в формате Excel (.xlsx, .xls)"}
              </p>
            </div>

            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="w-full vintage-button"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Импортировать данные
                </>
              )}
            </Button>

            {importResults && (
              <div className="mt-4 p-4 border border-border rounded">
                <h3 className="text-lg font-medium mb-2">Результаты импорта:</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Успешно: {importResults.success}</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Ошибок: {importResults.failed}</span>
                </div>
                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium mb-1">Ошибки:</h4>
                    <ul className="text-sm text-muted-foreground">
                      {importResults.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li>...еще {importResults.errors.length - 5} ошибок</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Экспорт данных */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="exportType">Тип данных</Label>
              <select
                id="exportType"
                className="vintage-select w-full p-2 border border-border rounded"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as "employees" | "inventory")}
              >
                <option value="employees">Сотрудники</option>
                <option value="inventory">Инвентарь</option>
              </select>
            </div>

            {exportType === "employees" && (
              <div className="space-y-2">
                <Label htmlFor="departmentId">ID отдела (необязательно)</Label>
                <Input
                  id="departmentId"
                  type="number"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  placeholder="Оставьте пустым для всех отделов"
                  className="vintage-input"
                />
              </div>
            )}

            {exportType === "inventory" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">ID сотрудника</Label>
                  <Input
                    id="employeeId"
                    type="number"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="ID сотрудника"
                    className="vintage-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">ID отдела</Label>
                  <Input
                    id="departmentId"
                    type="number"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    placeholder="ID отдела"
                    className="vintage-input"
                  />
                  <p className="text-sm text-muted-foreground">
                    Укажите либо ID сотрудника, либо ID отдела
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting || (exportType === "inventory" && !employeeId && !departmentId)}
              className="w-full vintage-button"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Экспорт...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Экспортировать в Excel
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Поддерживаются файлы формата .xlsx, .xls
        </div>
      </CardFooter>
    </Card>
  );
}