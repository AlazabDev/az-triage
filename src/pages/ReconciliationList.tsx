import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileSearch, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: string;
  name: string;
  branch: string | null;
  session_date: string | null;
  status: string;
  created_at: string;
}

export default function ReconciliationList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("reconciliation_sessions")
      .select("id,name,branch,session_date,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSearch className="h-6 w-6" />
              الفرز والمطابقة
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              مطابقة إذون الاستلام مع مستخلصات Excel بواسطة وكيل Foundry
            </p>
          </div>
          <Button asChild>
            <Link to="/reconciliation/new">
              <Plus className="h-4 w-4 ml-2" />
              جلسة جديدة
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">جارِ التحميل...</p>
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <FileSearch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">لا توجد جلسات مراجعة بعد</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ابدأ جلسة جديدة برفع PDF إذون الاستلام وملف Excel المرجعي.
            </p>
            <Button asChild>
              <Link to="/reconciliation/new">
                <Plus className="h-4 w-4 ml-2" />
                ابدأ الآن
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <Link key={s.id} to={`/reconciliation/${s.id}`}>
                <Card className="p-4 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {s.branch && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.branch}
                          </span>
                        )}
                        {s.session_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(s.session_date), "yyyy/MM/dd")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted">{s.status}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
