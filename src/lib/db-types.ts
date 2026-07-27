/**
 * طبقة أنواع وسيطة مؤقتة.
 *
 * ملف `src/integrations/supabase/types.ts` مولَّد آليًا من السكيمة الحالية على
 * Supabase، وهو لا يحتوي حاليًا على جداول متتبّع الأخطاء (bugs, comments,
 * profiles...) ولا جداول المطابقة. لذلك نستخدم هنا أنواعًا مرنة حتى تتم
 * مزامنة الـ migrations مع الريموت، وبعدها نرجع للأنواع المولَّدة.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Tables<_T extends string> = any;
export type Enums<_T extends string> = string;

export const Constants = {
  public: {
    Enums: {
      bug_status: ["new", "assigned", "in_progress", "testing", "resolved", "closed"] as string[],
      bug_severity: ["critical", "high", "medium", "low"] as string[],
    },
  },
};
