import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  Trash2,
  Download,
  Brain,
  Loader2,
  Copy
} from "lucide-react";
import * as XLSX from "xlsx";

const BUCKET = "az-storage-maint";

interface StoredFile {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  metadata?: { size?: number; mimetype?: string };
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return FileJson;
  if (ext === "csv" || ext === "txt") return FileText;
  return FileSpreadsheet;
}

function humanSize(n?: number) {
  if (!n) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function AgentTraining() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");

  useEffect(() => {
    const savedNotes = localStorage.getItem("agent_training_notes");
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    localStorage.setItem("agent_training_notes", val);
  };

  // Chat functionality moved to AgentChat.tsx

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) toast.error(error.message);
    setFiles((data ?? []).filter((f) => f.name && !f.name.startsWith(".")));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    setPublicUrl(`https://${projectId}.supabase.co/functions/v1/agent-storage`);
  }, [refresh]);

  const uploadFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    setUploading(true);
    for (const file of arr) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowed = ["xlsx", "xls", "csv", "json", "txt", "jsonl"];
      if (!ext || !allowed.includes(ext)) {
        toast.error(`نوع غير مدعوم: ${file.name}`);
        continue;
      }
      let payload: Blob = file;
      let uploadName = file.name;

      // Normalize xlsx -> json for the agent
      if (ext === "xlsx" || ext === "xls") {
        try {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const sheets: Record<string, any[]> = {};
          for (const s of wb.SheetNames) {
            sheets[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: null });
          }
          const jsonName = file.name.replace(/\.(xlsx|xls)$/i, ".json");
          payload = new Blob([JSON.stringify({ source: file.name, sheets }, null, 2)], {
            type: "application/json",
          });
          uploadName = jsonName;
        } catch (e: any) {
          toast.error(`فشل تحويل ${file.name}: ${e.message}`);
          continue;
        }
      }

      const path = `${Date.now()}-${uploadName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, payload, {
        upsert: false,
        contentType:
          ext === "json" || ext === "xlsx" || ext === "xls"
            ? "application/json"
            : ext === "csv"
              ? "text/csv"
              : "text/plain",
      });
      if (error) toast.error(`${file.name}: ${error.message}`);
      else toast.success(`تم رفع ${uploadName}`);
    }
    setUploading(false);
    refresh();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const removeFile = async (name: string) => {
    if (!confirm(`حذف ${name}؟`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحذف");
      refresh();
    }
  };

  const downloadFile = async (name: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    window.open(data.publicUrl, "_blank");
  };

  const saveNotes = async () => {
    if (!notes.trim()) return;
    const path = `notes-${Date.now()}.txt`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, new Blob([notes], { type: "text/plain" }));
    if (error) toast.error(error.message);
    else {
      toast.success("تم حفظ الملاحظات");
      setNotes("");
      refresh();
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("تم النسخ");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            تدريب الوكيل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ارفع بيانات التدريب (Excel / CSV / JSON) ليصل إليها وكيل Foundry من مخزن{" "}
            <code className="text-xs">az-storage-maint</code>.
          </p>
        </div>

        <div className="space-y-6">
            {/* Upload zone */}
            <Card
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`p-8 border-2 border-dashed transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">اسحب الملفات هنا أو اضغط للاختيار</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يدعم: xlsx, xls, csv, json, jsonl, txt · ملفات Excel تُحوَّل تلقائياً إلى JSON
                  </p>
                </div>
                <label>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.json,.jsonl,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                  />
                  <Button asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <Upload className="h-4 w-4 ml-2" />
                      )}
                      اختر ملفات
                    </span>
                  </Button>
                </label>
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">ملاحظات تدريب نصية</h2>
                <Button size="sm" onClick={saveNotes} disabled={!notes.trim()}>
                  حفظ كملف
                </Button>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف تعليمات، أمثلة، أو مصطلحات يفهمها الوكيل..."
                className="min-h-[100px]"
              />
            </Card>

            {/* Agent endpoint */}
            <Card className="p-4 space-y-2">
              <h2 className="font-semibold">نقطة وصول الوكيل</h2>
              <p className="text-xs text-muted-foreground">
                استخدم هذا الـ endpoint داخل الوكيل. مرّر مفتاح{" "}
                <code>AGENT_STORAGE_KEY</code> في هيدر <code>x-agent-key</code>.
              </p>
              <div className="flex gap-2 items-center bg-muted rounded p-2 font-mono text-xs">
                <span className="truncate flex-1">{publicUrl}</span>
                <Button size="sm" variant="ghost" onClick={copyUrl}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                <div>
                  <code>GET ?action=list</code> — قائمة الملفات
                </div>
                <div>
                  <code>GET ?action=get&name=FILE</code> — محتوى ملف
                </div>
                <div>
                  <code>GET ?action=url&name=FILE</code> — رابط موقّع
                </div>
              </div>
            </Card>

            {/* Files list */}
            <Card className="p-4">
              <h2 className="font-semibold mb-3">
                الملفات المتاحة للوكيل ({files.length})
              </h2>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد ملفات بعد
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((f) => {
                    const Icon = iconFor(f.name);
                    return (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {humanSize(f.metadata?.size)} ·{" "}
                            {f.created_at
                              ? new Date(f.created_at).toLocaleDateString("ar-EG")
                              : ""}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7"
                          onClick={() => downloadFile(f.name)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 text-destructive"
                          onClick={() => removeFile(f.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
      </div>
    </AppLayout>
  );
}
