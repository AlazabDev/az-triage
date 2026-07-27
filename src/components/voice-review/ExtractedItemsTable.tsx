import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { QuantityBadge } from "./QuantityBadge";
import type { VoiceItem } from "./types";

interface Props {
  items: VoiceItem[];
  onChange: (id: string, patch: Partial<VoiceItem>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

/** جدول البنود المستخرجة مع تعديل مباشر داخل الخلايا وإضافة بند يدوي */
export function ExtractedItemsTable({ items, onChange, onDelete, onAdd }: Props) {
  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b">
        <ListChecks className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">البنود المستخرجة</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
        <Button size="sm" variant="outline" className="mr-auto" onClick={onAdd}>
          <Plus className="h-4 w-4 ml-1" />
          إضافة بند
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs text-muted-foreground">
            <tr>
              <th className="text-right font-medium p-2 w-10">م</th>
              <th className="text-right font-medium p-2">الوصف</th>
              <th className="text-right font-medium p-2 w-32">الكمية</th>
              <th className="text-right font-medium p-2 w-48">ملاحظات</th>
              <th className="text-right font-medium p-2 w-12">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                  لا توجد بنود — أضف بنداً يدوياً إذا نسي الفني ذكره.
                </td>
              </tr>
            )}
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b last:border-0 hover:bg-muted/30 align-top">
                <td className="p-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                <td className="p-2">
                  {/* تعديل مباشر للوصف */}
                  <Input
                    value={it.description}
                    onChange={(e) => onChange(it.id, { description: e.target.value })}
                    placeholder="وصف البند"
                    className="h-8 border-transparent bg-transparent hover:border-input focus:border-input"
                  />
                </td>
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => onChange(it.id, { quantity: Number(e.target.value) })}
                      className="h-8 w-20 tabular-nums border-transparent bg-transparent hover:border-input focus:border-input"
                    />
                    <QuantityBadge quantity={it.quantity} />
                  </div>
                </td>
                <td className="p-2">
                  <Input
                    value={it.note}
                    onChange={(e) => onChange(it.id, { note: e.target.value })}
                    placeholder="—"
                    className="h-8 border-transparent bg-transparent hover:border-input focus:border-input"
                  />
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(it.id)}
                    aria-label="حذف البند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
