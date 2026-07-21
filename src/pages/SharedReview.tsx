import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { CheckCircle2, AlertTriangle, HelpCircle, XCircle } from "lucide-react";

const STATUS: Record<string, { label: string; color: string; Icon: any }> = {
  confirmed: { label: "مؤكد", color: "text-green-700 dark:text-green-400", Icon: CheckCircle2 },
  partial: { label: "مؤكد جزئياً", color: "text-amber-700 dark:text-amber-400", Icon: AlertTriangle },
  needs_review: { label: "يحتاج مراجعة", color: "text-orange-700 dark:text-orange-400", Icon: HelpCircle },
  not_in_receipt: { label: "غير موجود بالإذن", color: "text-red-700 dark:text-red-400", Icon: XCircle },
  unmatched: { label: "—", color: "text-muted-foreground", Icon: HelpCircle },
};

export default function SharedReview() {
  const { token } = useParams();
  const [session, setSession] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: s } = await (supabase as any)
        .from("reconciliation_sessions")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();
      if (!s) { setSession(null); return; }
      setSession(s);
      const [{ data: p }, { data: it }] = await Promise.all([
        (supabase as any).from("receipt_pages").select("*").eq("session_id", s.id).order("page_index"),
        (supabase as any).from("receipt_items").select("*").eq("session_id", s.id),
      ]);
      setPages(p ?? []);
      setItems(it ?? []);
      // Sign image urls
      const map: Record<string, string> = {};
      for (const pg of p ?? []) {
        const { data } = await supabase.storage.from("maintenance-receipts").createSignedUrl(pg.image_path, 3600);
        if (data?.signedUrl) map[pg.id] = data.signedUrl;
      }
      setUrls(map);
    })();
  }, [token]);

  if (!session) return <div className="p-8 text-center" dir="rtl">الرابط غير صالح أو غير مفعّل.</div>;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b p-4 bg-card">
        <h1 className="text-xl font-bold">{session.name}</h1>
        <p className="text-sm text-muted-foreground">
          {session.branch ?? ""} {session.session_date ? `- ${session.session_date}` : ""} — دفتر مراجعة للاعتماد
        </p>
      </header>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {pages.map((pg, idx) => {
          const pageItems = items.filter((it) => it.page_id === pg.id).sort((a, b) => a.item_index - b.item_index);
          return (
            <Card key={pg.id} className="overflow-hidden">
              <div className="border-b p-3 flex flex-wrap gap-4 items-center bg-muted/40">
                <b>إذن {pg.receipt_code}</b>
                {pg.branch && <span className="text-sm">الفرع: {pg.branch}</span>}
                {pg.receipt_date && <span className="text-sm">التاريخ: {pg.receipt_date}</span>}
                <span className="text-sm text-muted-foreground">البنود: {pageItems.length}</span>
                <span className="text-sm mr-auto">({idx + 1} من {pages.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-l bg-muted/20 h-[600px]">
                  {urls[pg.id] && (
                    <TransformWrapper minScale={0.3} initialScale={0.7} centerOnInit>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                        <img src={urls[pg.id]} alt={pg.receipt_code} />
                      </TransformComponent>
                    </TransformWrapper>
                  )}
                </div>
                <div className="p-3 overflow-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-right p-1">الكود</th>
                        <th className="text-right p-1">الوصف</th>
                        <th className="text-right p-1">كمية</th>
                        <th className="text-right p-1">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((it) => {
                        const info = STATUS[it.match_status] ?? STATUS.unmatched;
                        const Icon = info.Icon;
                        return (
                          <tr key={it.id} className="border-b">
                            <td className="p-1 font-mono text-xs">{it.item_code}</td>
                            <td className="p-1">{it.description}</td>
                            <td className="p-1">{it.quantity ?? "—"}</td>
                            <td className={`p-1 ${info.color}`}>
                              <span className="inline-flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {info.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {pg.reviewer_note && (
                    <p className="mt-3 text-xs bg-muted p-2 rounded">ملاحظة: {pg.reviewer_note}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
