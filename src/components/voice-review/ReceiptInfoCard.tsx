import { Card } from "@/components/ui/card";
import { Building2, Calendar, User, Hash } from "lucide-react";
import type { ReceiptMeta } from "./types";

/** بطاقة تفاصيل الإذن: الفرع، التاريخ، الفني، رقم الإذن */
export function ReceiptInfoCard({ meta }: { meta: ReceiptMeta }) {
  const rows = [
    { Icon: Building2, label: "الفرع", value: meta.branch },
    { Icon: Calendar, label: "تاريخ الإذن", value: meta.date },
    { Icon: User, label: "الفني", value: meta.technician },
    { Icon: Hash, label: "رقم الإذن", value: meta.code },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">تفاصيل الإذن</h3>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-sm font-medium truncate">{value || "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
