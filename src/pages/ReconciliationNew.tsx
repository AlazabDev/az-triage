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
import { FileDropZone } from "@/components/reconciliation/FileDropZone";
import * as XLSX from "xlsx";
import { Loader2, Upload, AlertTriangle } from "lucide-react";

export default function ReconciliationNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const excelFile = refFiles[0] ?? null;

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "غير مسجّل", description: "سجّل الدخول أولاً لرفع الملفات", variant: "destructive" });
      return;
    }
    if (!name.trim() || !receiptFiles.length) {
      toast({ title: "بيانات ناقصة", description: "اسم الجلسة وملف واحد للإذون على الأقل", variant: "destructive" });
      return;
    }
    setBusy(true);
    const localWarnings: string[] = [];
    setWarnings([]);
    try {
      setProgress("إنشاء الجلسة...");
      const { data: session, error: sErr } = await (supabase as any)
        .from("reconciliation_sessions")
        .insert({ owner_id: user.id, name: name.trim(), branch: branch || null, session_date: sessionDate, status: "processing" })
        .select("id")
        .single();
      if (sErr) throw sErr;
      const sessionId = session.id as string;

      // الملف المرجعي (Excel أو PDF): يُرفع للتخزين ويُقرأ لو إكسيل
      if (excelFile) {
        const isPdf = excelFile.type === "application/pdf" || excelFile.name.toLowerCase().endsWith(".pdf");
        setProgress(`رفع الملف المرجعي: ${excelFile.name}`);
        const refPath = `${sessionId}/reference/${excelFile.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_")}`;
        const { error: refUpErr } = await supabase.storage
          .from("maintenance-receipts")
          .upload(refPath, excelFile, { contentType: excelFile.type || "application/octet-stream", upsert: true });
        if (refUpErr) localWarnings.push(`تعذّر رفع الملف المرجعي: ${refUpErr.message}`);

        let rows: Record<string, any>[] = [];
        let columns: string[] = [];
        if (!isPdf) {
          try {
            setProgress("قراءة ملف Excel...");
            const buf = await excelFile.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const sh = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json<Record<string, any>>(sh, { defval: null });
            columns = rows.length ? Object.keys(rows[0]) : [];
          } catch (e: any) {
            localWarnings.push(`تعذّر قراءة ملف Excel: ${e.message}`);
          }
        }
        const { error: snapErr } = await (supabase as any).from("excel_snapshots").insert({
          session_id: sessionId,
          original_filename: excelFile.name,
          storage_path: refUpErr ? null : refPath,
          file_kind: isPdf ? "pdf" : "excel",
          rows,
          columns,
          row_count: rows.length,
        });
        if (snapErr) localWarnings.push(`تعذّر حفظ الملف المرجعي: ${snapErr.message}`);
      }

      // إذون الاستلام
      for (let d = 0; d < receiptFiles.length; d++) {
        const f = receiptFiles[d];
        try {
          setProgress(`تجهيز المستند ${d + 1} من ${receiptFiles.length}: ${f.name}`);
          const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
          const pages = isPdf ? await renderPdfToImages(f, 2) : [await imageFileToBlob(f)];

          const { data: doc, error: dErr } = await (supabase as any)
            .from("receipt_documents")
            .insert({
              session_id: sessionId,
              document_number: d + 1,
              original_filename: f.name,
              storage_path: `${sessionId}/doc-${d + 1}`,
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

            setProgress(`استخراج بنود إذن ${receiptCode} بالذكاء الاصطناعي...`);
            const { error: fnErr } = await supabase.functions.invoke("foundry-extract-receipt", {
              body: { pageId: pageRow.id },
            });
            if (fnErr) localWarnings.push(`تعذّر استخراج إذن ${receiptCode}: ${fnErr.message}`);
          }
        } catch (e: any) {
          console.error("document failed", f.name, e);
          localWarnings.push(`فشل الملف ${f.name}: ${e.message ?? e}`);
        }
      }

      await (supabase as any).from("reconciliation_sessions").update({ status: "ready" }).eq("id", sessionId);
      setWarnings(localWarnings);
      toast({
        title: localWarnings.length ? "تمت المعالجة مع تنبيهات" : "تمت المعالجة",
        description: localWarnings.length ? `${localWarnings.length} تنبيه — الجلسة جاهزة للمراجعة` : "الجلسة جاهزة للمراجعة",
      });
      navigate(`/reconciliation/${sessionId}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "خطأ", description: e.message ?? "فشلت المعالجة", variant: "destructive" });
      setWarnings(localWarnings);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">جلسة مراجعة جديدة</h1>

        <Card className="p-6 space-y-5">
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

          <FileDropZone
            label="إذون الاستلام (PDF أو صور) *"
            hint="PDF, JPG, PNG — يمكن اختيار عدة ملفات"
            accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp"
            multiple
            files={receiptFiles}
            onChange={setReceiptFiles}
            disabled={busy}
          />

          <FileDropZone
            label="الملف المرجعي (مستخلص Excel أو PDF)"
            hint="XLSX, XLS, CSV أو PDF — ملف واحد"
            accept=".xlsx,.xls,.csv,application/pdf,.pdf"
            files={refFiles}
            onChange={setRefFiles}
            disabled={busy}
          />

          <Button onClick={handleSubmit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
            {busy ? progress || "جارٍ المعالجة..." : "ابدأ المعالجة"}
          </Button>
          {busy && <p className="text-xs text-muted-foreground text-center">{progress}</p>}

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> تنبيهات المعالجة
              </p>
              {warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
