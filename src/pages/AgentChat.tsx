import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { AppLayout } from '@/components/AppLayout';

const BUCKET = "az-storage-maint";

const WELCOME = {
  id: 'welcome',
  content: 'أهلاً بك! أنا وكيلك الذكي. يمكنني مساعدتك في البحث وتحليل الملفات المرفوعة للإجابة على استفساراتك.',
  role: 'assistant',
  timestamp: new Date()
};

export default function AgentChat() {
  const [messages, setMessages] = useState<any[]>([WELCOME]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Load training notes from localStorage
    const savedNotes = localStorage.getItem("agent_training_notes");
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  const executeToolCall = async (toolCall: any) => {
    const { name, arguments: argsString } = toolCall.function;
    let args: any = {};
    try { args = JSON.parse(argsString); } catch (e) { /* تجاهل خطأ تحليل JSON */ }

    if (name === "list_training_files") {
      const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
      if (error) return "Error listing files: " + error.message;
      return JSON.stringify((data ?? []).filter(f => f.name && !f.name.startsWith(".")).map(f => f.name));
    }

    if (name === "read_training_file") {
      const { fileName } = args;
      if (!fileName) return "Error: fileName is required";
      const { data, error } = await supabase.storage.from(BUCKET).download(fileName);
      if (error) return "Error downloading file: " + error.message;
      const text = await data.text();
      return text.length > 50000 ? text.substring(0, 50000) + "...[TRUNCATED]" : text;
    }

    return "Unknown tool";
  };

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: trimmed,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      let sysMsg = "أنت وكيل ذكي لتحليل البيانات. يمكنك استخدام الأدوات (Tools) المتاحة لقراءة ملفات التدريب المرفوعة وتحليلها للإجابة على المستخدم.";
      if (notes.trim()) sysMsg += "\nمعلومات إضافية والسياق:\n" + notes;

      const apiMessages = [
        { role: "system", content: sysMsg },
        ...messages.filter(m => m.id !== 'welcome').map(m => ({
          role: m.role === "agent" ? "assistant" : m.role,
          content: m.content || "",
          ...(m.tool_calls && { tool_calls: m.tool_calls }),
          ...(m.tool_call_id && { tool_call_id: m.tool_call_id, name: m.name })
        })),
        { role: "user", content: trimmed }
      ];

      const tools = [
        {
          type: "function",
          function: {
            name: "list_training_files",
            description: "الحصول على قائمة بجميع ملفات التدريب المتاحة للمستخدم (Excel, CSV, JSON, TXT)."
          }
        },
        {
          type: "function",
          function: {
            name: "read_training_file",
            description: "قراءة محتوى ملف تدريب معين",
            parameters: {
              type: "object",
              properties: {
                fileName: { type: "string", description: "اسم الملف (مثال: data.json)" }
              },
              required: ["fileName"]
            }
          }
        }
      ];

      let maxTurns = 5;
      while (maxTurns > 0) {
        maxTurns--;
        const { data, error } = await supabase.functions.invoke("ollama-chat", {
          body: { model: "qwen3.6:27b", messages: apiMessages, tools },
        });

        if (error) throw new Error(error.message || "فشل الاتصال بالخادم");
        if ((data as any)?.error) throw new Error((data as any).error);
        const responseMessage = (data as any)?.choices?.[0]?.message;

        if (!responseMessage) throw new Error("رد فارغ من الخادم");

        apiMessages.push(responseMessage);
        setMessages(prev => [...prev, { ...responseMessage, id: Date.now().toString() }]);
        
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          for (const tc of responseMessage.tool_calls) {
            const toolResult = await executeToolCall(tc);
            const toolMsg = {
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: toolResult
            };
            apiMessages.push(toolMsg);
            setMessages(prev => [...prev, { ...toolMsg, id: Date.now().toString() }]);
          }
        } else {
          break;
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || "حدث خطأ أثناء التواصل مع الوكيل");
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.',
        role: 'assistant', 
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-1px)] bg-background w-full flex-col">
        {/* Modern Header */}
        <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">الدردشة مع الوكيل</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">مدعوم بالذكاء الاصطناعي</span>
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
            {messages
              .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && msg.content)
              .map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-border">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className={`flex flex-col gap-2 max-w-[90%] sm:max-w-[75%] ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  }`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap" dir="auto">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  <Loader2 className="animate-spin h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">الوكيل يفكر ويرتب المعلومات...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex gap-2 items-center bg-background rounded-2xl border border-input focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all pr-2 pl-4 py-2 shadow-sm">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="اسأل الوكيل عن أي ملف أو اطلب استخراج بيانات..."
                dir="auto"
                className="flex-1 border-0 focus-visible:ring-0 shadow-none bg-transparent text-base h-11"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                size="icon"
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
              >
                <Send className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
