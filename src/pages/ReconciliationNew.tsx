import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { renderPdfToImages, imageFileToBlob } from "@/lib/pdfToImages";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import { Loader2, Upload, FileText, Sheet } from "lucide-react";

export default function ReconciliationNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSubmit = async () => {
    if (!name || !receiptFiles.length || !user) {
      toast({ title: "بيانات ناقصة", description: "الاسم وملف واحد للإذون على الأقل", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      setProgress("إنشاء الجلسة...");
      const { data: session, error: sErr } = await (supabase as any)
        .from("reconciliation_sessions")
        .insert({ owner_id: user.id, name, branch: branch || null, session_date: sessionDate, status: "processing" })
        .select("id")
        .single();
      if (sErr) throw sErr;
      const sessionId = session.id;

      // Excel snapshot
      if (excelFile) {
        setProgress("قراءة ملف Excel...");
        const buf = await excelFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sh = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sh, { defval: null });
        const columns = rows.length ? Object.keys(rows[0]) : [];
        await (supabase as any).from("excel_snapshots").insert({
          session_id: sessionId,
          original_filename: excelFile.name,
          rows,
          columns,
          row_count: rows.length,
        });
      }

      // Documents
      for (let d = 0; d < receiptFiles.length; d++) {
        const f = receiptFiles[d];
        setProgress(`تجهيز المستند ${d + 1} من ${receiptFiles.length}: ${f.name}`);
        const pages = f.type === "application/pdf"
          ? await renderPdfToImages(f, 2)
          : [await imageFileToBlob(f)];
        const { data: doc, error: dErr } = await (supabase as any)
          .from("receipt_documents")
          .insert({
            session_id: sessionId,
            document_number: d + 1,
            original_filename: f.name,
            storage_path: `${sessionId}/doc-${d + 1}/original-${f.name}`,
            page_count: pages.length,
          })
          .select("id")
          .single();
        if (dErr) throw dErr;

        for (const p of pages) {
          const path = `${sessionId}/doc-${d + 1}/page-${p.pageIndex}.png`;
          setProgress(`رفع صفحة ${p.pageIndex}/${pages.length} من المستند ${d + 1}`);
          const { error: upErr } = await supabase.storage.from("maintenance-receipts").upload(path, p.blob, {
            contentType: "image/png",
            upsert: true,
          });
          if (upErr) throw upErr;
          const receiptCode = `${d + 1}-${String(p.pageIndex).padStart(2, "0")}`;
          const { data: pageRow, error: pErr } = await (supabase as any)
            .from("receipt_pages")
            .insert({
              session_id: sessionId,
              document_id: doc.id,
              page_index: p.pageIndex,
              receipt_code: receiptCode,
              image_path: path,
              extraction_status: "queued",
            })
            .select("id")
            .single();
          if (pErr) throw pErr;

          // Fire-and-forget extraction (we don't await to keep UI moving; but await here for MVP predictability)
          setProgress(`استخراج بنود إذن ${receiptCode} بالذكاء الاصطناعي...`);
          try {
            await supabase.functions.invoke("foundry-extract-receipt", { body: { pageId: pageRow.id } });
          } catch (e) {
            console.warn("extract failed for", receiptCode, e);
          }
        }
      }

      await (supabase as any).from("reconciliation_sessions").update({ status: "ready" }).eq("id", sessionId);
      toast({ title: "تمت المعالجة", description: "الجلسة جاهزة للمراجعة" });
      navigate(`/reconciliation/${sessionId}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "خطأ", description: e.message ?? "فشلت المعالجة", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">جلسة مراجعة جديدة</h1>

        <Card className="p-6 space-y-4">
          <div>
            <Label>اسم الجلسة *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: صيانات نوفمبر 2025" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الفرع</Label>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="اختياري" />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              إذون الاستلام (PDF أو صور) *
            </Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={(e) => setReceiptFiles(Array.from(e.target.files ?? []))}
            />
            {receiptFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{receiptFiles.length} ملف مختار</p>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Sheet className="h-4 w-4" />
              ملف Excel المرجعي (اختياري)
            </Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
            {busy ? progress || "جارٍ المعالجة..." : "ابدأ المعالجة"}
          </Button>
          {busy && <p className="text-xs text-muted-foreground text-center">{progress}</p>}
        </Card>
      </div>
    </AppLayout>
  );
}
