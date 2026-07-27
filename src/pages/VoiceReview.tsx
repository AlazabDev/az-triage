import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { ReceiptInfoCard } from "@/components/voice-review/ReceiptInfoCard";
import { AudioPlayer, type AudioPlayerHandle } from "@/components/voice-review/AudioPlayer";
import { RawTranscript } from "@/components/voice-review/RawTranscript";
import { ExtractedItemsTable } from "@/components/voice-review/ExtractedItemsTable";
import { ActionBar } from "@/components/voice-review/ActionBar";
import { HIGH_QUANTITY_THRESHOLD, type ReceiptMeta, type VoiceItem } from "@/components/voice-review/types";

// بيانات مبدئية للعرض — تُستبدل لاحقًا بنتيجة الوكيل من قاعدة البيانات
const DEMO_META: ReceiptMeta = {
  branch: "فرع المعادي",
  date: "2026-07-21",
  technician: "محمد عبد الرحمن",
  code: "R-2026-0431",
};

const DEMO_TRANSCRIPT = `الفرع: المعادي. النهاردة عملنا فك أسقف في منطقة المطبخ، تقريبًا اتنين وحدة.
كمان فك دواليب خشب عدد اتنعشر، وتركيب رفوف جديدة عدد أربعة.
فيه كمان دهان حوائط للممر، حوالي ثلاثين متر مربع.`;

const DEMO_ITEMS: VoiceItem[] = [
  { id: "1", description: "فك أسقف", quantity: 2, note: "منطقة المطبخ" },
  { id: "2", description: "فك دواليب خشب", quantity: 12, note: "" },
  { id: "3", description: "تركيب رفوف", quantity: 4, note: "رفوف معدنية" },
  { id: "4", description: "دهان حوائط", quantity: 30, note: "متر مربع — الممر" },
];

export default function VoiceReview() {
  const [items, setItems] = useState<VoiceItem[]>(DEMO_ITEMS);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const playerRef = useRef<AudioPlayerHandle>(null);

  // عدد البنود ذات الكمية المرتفعة — يظهر كتحذير في شريط الإجراءات
  const warnings = useMemo(
    () => items.filter((it) => it.quantity > HIGH_QUANTITY_THRESHOLD).length,
    [items],
  );

  const updateItem = useCallback((id: string, patch: Partial<VoiceItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: 1, note: "" },
    ]);
  }, []);

  const approve = useCallback(() => {
    setDecision("approved");
    toast({ title: "تم الاعتماد", description: `أُرسل الإذن ${DEMO_META.code} إلى ${DEMO_META.branch}` });
  }, []);

  const reject = useCallback(() => {
    setDecision("rejected");
    toast({ title: "تم طلب التعديل", description: "أُعيد الإذن للفني للمراجعة", variant: "destructive" });
  }, []);

  // اختصارات الكيبورد: Ctrl+Enter = اعتماد، Space = تشغيل/إيقاف الصوت
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        approve();
      } else if (e.code === "Space" && !typing) {
        e.preventDefault();
        playerRef.current?.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approve]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col" dir="rtl">
        <header className="border-b bg-card px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-bold">مراجعة إذن صوتي</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{DEMO_META.code}</span>
          {decision === "approved" && (
            <span className="text-xs px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">معتمد</span>
          )}
          {decision === "rejected" && (
            <span className="text-xs px-2 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">مرفوض</span>
          )}
        </header>

        {/* شاشتان متقابلتان: المصدر يمينًا والبيانات المهيكلة يسارًا */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-auto">
          <section className="flex flex-col gap-4 min-h-0">
            <ReceiptInfoCard meta={DEMO_META} />
            <AudioPlayer ref={playerRef} src="/audio/sample-technician.mp3" />
            <RawTranscript text={DEMO_TRANSCRIPT} />
          </section>

          <section className="flex flex-col min-h-0">
            <ExtractedItemsTable
              items={items}
              onChange={updateItem}
              onDelete={deleteItem}
              onAdd={addItem}
            />
          </section>
        </div>

        <ActionBar onApprove={approve} onReject={reject} warnings={warnings} />
      </div>
    </AppLayout>
  );
}
