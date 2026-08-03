import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** منطقة رفع بالسحب والإفلات مع عرض الملفات المختارة وإمكانية حذف أي ملف. */
export function FileDropZone({ label, hint, accept, multiple, files, onChange, disabled }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepts = (f: File) => {
    if (!accept) return true;
    const parts = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const name = f.name.toLowerCase();
    const type = (f.type || "").toLowerCase();
    return parts.some((p) =>
      p.startsWith(".") ? name.endsWith(p) : p.endsWith("/*") ? type.startsWith(p.slice(0, -1)) : type === p,
    );
  };

  const merge = useCallback(
    (incoming: File[]) => {
      const valid = incoming.filter(accepts);
      onChange(multiple ? [...files, ...valid].slice(0, 200) : valid.slice(0, 1));
    },
     
    [files, multiple, onChange, accept],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          merge(Array.from(e.dataTransfer.files ?? []));
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          over ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-muted/20",
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">اسحب الملفات هنا أو اضغط للاختيار</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            merge(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-auto">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(files.filter((_, j) => j !== i));
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
