// أنواع البيانات المشتركة لشاشة مراجعة الإذن الصوتي
export interface ReceiptMeta {
  branch: string;      // اسم الفرع
  date: string;        // تاريخ الإذن
  technician: string;  // اسم الفني
  code: string;        // رقم الإذن
}

export interface VoiceItem {
  id: string;
  description: string; // الوصف
  quantity: number;    // الكمية
  note: string;        // ملاحظات
}

// حد التنبيه: أي كمية أكبر منه تعتبر مرتفعة وتحتاج انتباه المراجع
export const HIGH_QUANTITY_THRESHOLD = 10;
