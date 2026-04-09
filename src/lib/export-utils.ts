import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportData {
  report_date: string;
  topic_covered: string;
  teaching_method: string;
  students_present: number;
  students_absent: number;
  students_total: number;
  status: string;
  issues?: string | null;
  remarks?: string | null;
  sections?: { name?: string; code?: string; courses?: { name?: string; code?: string } } | null;
}

export function exportToPDF(reports: ReportData[], title = "Class Reports") {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const rows = reports.map((r) => [
    r.report_date,
    r.sections?.courses?.code || "",
    r.sections?.name || "",
    r.topic_covered,
    r.teaching_method,
    `${r.students_present}/${r.students_total}`,
    r.students_total > 0 ? `${Math.round((r.students_present / r.students_total) * 100)}%` : "0%",
    r.status,
  ]);

  autoTable(doc, {
    head: [["Date", "Course", "Section", "Topic", "Method", "Present/Total", "Rate", "Status"]],
    body: rows,
    startY: 34,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 73, 130] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportToExcel(reports: ReportData[], title = "Class Reports") {
  const data = reports.map((r) => ({
    Date: r.report_date,
    Course: r.sections?.courses?.code || "",
    Section: r.sections?.name || "",
    Topic: r.topic_covered,
    Method: r.teaching_method,
    Present: r.students_present,
    Absent: r.students_absent,
    Total: r.students_total,
    "Rate %": r.students_total > 0 ? Math.round((r.students_present / r.students_total) * 100) : 0,
    Status: r.status,
    Issues: r.issues || "",
    Remarks: r.remarks || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reports");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
}
