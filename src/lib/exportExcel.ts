import * as XLSX from "xlsx";

/**
 * تصدير نتيجة المطابقة إلى ملف إكسيل: ورقة للأذون وورقة للبنود.
 */
export function downloadReconciliationExcel(
  sessionName: string,
  pages: any[],
  items: any[],
) {
  const wb = XLSX.utils.book_new();

  const pagesSheet = XLSX.utils.json_to_sheet(
    (pages ?? []).map((p, i) => ({
      "م": i + 1,
      "رقم الإذن": p.receipt_code ?? "",
      "الفرع": p.branch ?? "",
      "التاريخ": p.receipt_date ?? "",
      "المورد": p.supplier ?? "",
      "رقم الفاتورة": p.invoice_number ?? "",
      "حالة المراجعة": p.review_status ?? "",
      "ملاحظات المراجع": p.reviewer_note ?? "",
    })),
  );
  XLSX.utils.book_append_sheet(wb, pagesSheet, "الأذون");

  const pageByLookup = new Map((pages ?? []).map((p) => [p.id, p]));
  const itemsSheet = XLSX.utils.json_to_sheet(
    (items ?? []).map((it, i) => ({
      "م": i + 1,
      "رقم الإذن": pageByLookup.get(it.page_id)?.receipt_code ?? "",
      "كود البند": it.item_code ?? "",
      "الوصف": it.description ?? "",
      "الوحدة": it.unit ?? "",
      "الكمية": it.quantity ?? "",
      "السعر": it.unit_price ?? "",
      "الإجمالي": it.total ?? "",
      "حالة المطابقة": it.match_status ?? "",
      "ملاحظات": it.reviewer_note ?? "",
    })),
  );
  XLSX.utils.book_append_sheet(wb, itemsSheet, "البنود");

  XLSX.writeFile(wb, `${sessionName || "reconciliation"}.xlsx`);
}
