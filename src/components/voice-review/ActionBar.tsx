import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  onApprove: () => void;
  onReject: () => void;
  warnings: number; // عدد البنود ذات الكمية المرتفعة
  disabled?: boolean;
}

/** شريط الإجراءات: اعتماد وإرسال للفرع أو طلب تعديل/رفض */
export function ActionBar({ onApprove, onReject, warnings, disabled }: Props) {
  return (
    <div className="border-t bg-card p-3 flex items-center gap-2 flex-wrap">
      {warnings > 0 && (
        <span className="text-xs text-warning">
          {warnings} بند بكمية مرتفعة — يُفضل التأكد قبل الاعتماد
        </span>
      )}
      <div className="flex items-center gap-2 mr-auto">
        <Button variant="outline" onClick={onReject} disabled={disabled}>
          <XCircle className="h-4 w-4 ml-1" />
          طلب تعديل / رفض
        </Button>
        <Button
          onClick={onApprove}
          disabled={disabled}
          className="bg-success text-success-foreground hover:bg-success/90 font-semibold"
        >
          <CheckCircle2 className="h-4 w-4 ml-1" />
          اعتماد وإرسال للفرع
          <kbd className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-background/20">Ctrl + Enter</kbd>
        </Button>
      </div>
    </div>
  );
}
