import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploaderProps {
  employeeId: number;
  onSuccess?: () => void;
}

export default function DocumentUploader({ employeeId, onSuccess }: DocumentUploaderProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Ошибка",
        description: "Выберите файл для загрузки",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('document', selectedFile);
      
      const response = await fetch(`/api/upload/document/${employeeId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }
      
      const data = await response.json();
      
      toast({
        title: "Документ загружен",
        description: "Документ успешно прикреплен к сотруднику",
      });
      
      setSelectedFile(null);
      if (onSuccess) onSuccess();
      
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось загрузить документ",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="document">Выберите документ</Label>
        <Input 
          id="document" 
          type="file" 
          className="text-sm" 
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />
        <p className="text-xs text-muted-foreground">
          Поддерживаемые форматы: PDF, Word, Excel, изображения
        </p>
      </div>
      
      {selectedFile && (
        <div className="flex items-center gap-2 text-sm">
          <File className="h-4 w-4" />
          <span>{selectedFile.name}</span>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2">
        <Button 
          variant="outline"
          onClick={onSuccess}
          disabled={uploading}
        >
          Отмена
        </Button>
        <Button 
          className="vintage-button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Загрузить
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
