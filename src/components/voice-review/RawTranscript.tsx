import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

/** التفريغ النصي الأصلي لكلام الفني — للرجوع إليه عند الشك في أي بند */
export function RawTranscript({ text }: { text: string }) {
  return (
    <Card className="p-4 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">التفريغ النصي الأصلي</h3>
      </div>
      <div className="flex-1 overflow-auto rounded-md bg-muted/40 p-3 text-sm leading-7 whitespace-pre-wrap">
        {text || "لا يوجد تفريغ نصي متاح لهذا التسجيل."}
      </div>
    </Card>
  );
}
