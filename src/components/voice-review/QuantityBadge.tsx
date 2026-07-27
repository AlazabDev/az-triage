import { AlertTriangle } from "lucide-react";
import { HIGH_QUANTITY_THRESHOLD } from "./types";

/** شارة تنبيه ذكية تظهر فقط عند تجاوز الكمية الحد المسموح */
export function QuantityBadge({ quantity }: { quantity: number }) {
  if (quantity <= HIGH_QUANTITY_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-warning/40 bg-warning/15 text-warning whitespace-nowrap">
      <AlertTriangle className="h-3 w-3" />
      كمية مرتفعة
    </span>
  );
}
