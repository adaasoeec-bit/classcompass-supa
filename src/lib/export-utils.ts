import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportData {
  report_date: string;
  instructor_name?: string | null;
  instructor_attended?: boolean | null;
  class_hour?: string | null;
  class_building?: string | null;
  room_number?: string | null;
  academic_year?: string | null;
  teaching_method: string;
  students_present: number;
  students_absent: number;
  students_total: number;
  status: string;
  issues?: string | null;
  remarks?: string | null;
  sections?: { name?: string; code?: string; courses?: { name?: string; code?: string; programs?: { name?: string } } } | null;
  courses?: { name?: string; code?: string; programs?: { name?: string } } | null;
  departments?: { name?: string; code?: string } | null;
}

interface WeeklyReportData {
  week_start: string;
  week_end: string;
  total_reports: number;
  submitted_reports: number;
  approved_reports: number;
  rejected_reports: number;
  absent_instructor_reports: number;
  students_present_total: number;
  students_total_total: number;
  attendance_rate: number;
  status: string;
  departments?: { name?: string; code?: string } | null;
}

export function exportToPDF(reports: ReportData[], title = "Class Reports") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerText = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };
  const departmentNames = Array.from(
    new Set((reports || []).map((r) => r.departments?.name).filter(Boolean))
  ) as string[];
  const departmentLine = departmentNames.length === 1 ? departmentNames[0] : "";

  doc.setFontSize(14);
  centerText("Adama Science and Technology University", 16);
  doc.setFontSize(12);
  centerText("College of Electrical Engineering", 23);
  let tableStartY = 46;
  if (departmentLine) {
    doc.setFontSize(11);
    centerText(departmentLine, 30);
    doc.setFontSize(11);
    centerText("Daily class report", 37);
    tableStartY = 50;
  } else {
    doc.setFontSize(11);
    centerText("Daily class report", 30);
  }

  doc.setFontSize(9);
  centerText(`Generated: ${new Date().toLocaleString()}`, tableStartY - 2);

  const rows = reports.map((r) => [
    r.report_date,
    r.instructor_name || "",
    r.instructor_attended === false ? "Absent" : "Present",
    r.class_hour || "",
    r.class_building || "",
    r.room_number || "",
    r.sections?.courses?.code || "",
    r.courses?.programs?.name || r.sections?.courses?.programs?.name || "",
    r.academic_year || "",
    r.sections?.name || "",
    r.teaching_method,
    `${r.students_present}/${r.students_total}`,
    r.students_total > 0 ? `${Math.round((r.students_present / r.students_total) * 100)}%` : "0%",
  ]);

  autoTable(doc, {
    head: [["Date", "Instructor", "Instructor Status", "Class Hour", "Building", "Room", "Course", "Program", "Class Year", "Section", "Method", "Present/Total", "Rate"]],
    body: rows,
    startY: tableStartY,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 73, 130] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportToExcel(reports: ReportData[], title = "Class Reports") {
  const departmentNames = Array.from(
    new Set((reports || []).map((r) => r.departments?.name).filter(Boolean))
  ) as string[];
  const departmentLine = departmentNames.length === 1 ? departmentNames[0] : "";

  const data = reports.map((r) => ({
    Date: r.report_date,
    Instructor: r.instructor_name || "",
    "Instructor Status": r.instructor_attended === false ? "Absent" : "Present",
    "Class Hour": r.class_hour || "",
    Building: r.class_building || "",
    Room: r.room_number || "",
    Course: r.sections?.courses?.code || "",
    Program: r.courses?.programs?.name || r.sections?.courses?.programs?.name || "",
    "Class Year": r.academic_year || "",
    Section: r.sections?.name || "",
    Method: r.teaching_method,
    Present: r.students_present,
    Absent: r.students_absent,
    Total: r.students_total,
    "Rate %": r.students_total > 0 ? Math.round((r.students_present / r.students_total) * 100) : 0,
  }));

  const headingRows = [
    ["Adama Science and Technology University"],
    ["College of Electrical Engineering"],
    ...(departmentLine ? [[departmentLine]] : []),
    ["Daily class report"],
    [""],
    [`Generated: ${new Date().toLocaleString()}`],
    [""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headingRows);
  XLSX.utils.sheet_add_json(ws, data, { origin: `A${headingRows.length + 1}` });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    ...(departmentLine ? [{ s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }] : []),
    { s: { r: departmentLine ? 3 : 2, c: 0 }, e: { r: departmentLine ? 3 : 2, c: 12 } },
    { s: { r: departmentLine ? 5 : 4, c: 0 }, e: { r: departmentLine ? 5 : 4, c: 12 } },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reports");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportWeeklyToPDF(reports: WeeklyReportData[], title = "Weekly Department Reports") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerText = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  doc.setFontSize(14);
  centerText("Adama Science and Technology University", 16);
  doc.setFontSize(12);
  centerText("College of Electrical Engineering", 23);
  doc.setFontSize(11);
  centerText("Weekly class report", 30);
  doc.setFontSize(9);
  centerText(`Generated: ${new Date().toLocaleString()}`, 36);

  const totalReports = reports.reduce((sum, r) => sum + (r.total_reports || 0), 0);
  const totalSubmitted = reports.reduce((sum, r) => sum + (r.submitted_reports || 0), 0);
  const totalApproved = reports.reduce((sum, r) => sum + (r.approved_reports || 0), 0);
  const totalRejected = reports.reduce((sum, r) => sum + (r.rejected_reports || 0), 0);
  const totalAbsentInstructors = reports.reduce((sum, r) => sum + (r.absent_instructor_reports || 0), 0);
  const totalStudentsPresent = reports.reduce((sum, r) => sum + (r.students_present_total || 0), 0);
  const totalStudentsOverall = reports.reduce((sum, r) => sum + (r.students_total_total || 0), 0);
  const overallAttendance = totalStudentsOverall > 0
    ? Number(((totalStudentsPresent / totalStudentsOverall) * 100).toFixed(2))
    : 0;

  const rows = reports.map((r) => [
    `${r.departments?.code || ""} ${r.departments?.name || ""}`.trim(),
    r.week_start,
    r.week_end,
    r.total_reports,
    r.submitted_reports,
    r.approved_reports,
    r.rejected_reports,
    r.absent_instructor_reports,
    `${r.students_present_total}/${r.students_total_total}`,
    `${r.attendance_rate}%`,
    r.status,
  ]);

  autoTable(doc, {
    head: [["Metric", "Value"]],
    body: [
      ["Total Department Weekly Reports", totalReports],
      ["Submitted", totalSubmitted],
      ["Approved", totalApproved],
      ["Rejected", totalRejected],
      ["Absent Instructors (Total)", totalAbsentInstructors],
      ["Students Present / Total", `${totalStudentsPresent}/${totalStudentsOverall}`],
      ["Overall Attendance", `${overallAttendance}%`],
    ],
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [39, 84, 138] },
  });

  autoTable(doc, {
    head: [["Department", "Start Date", "End Date", "Total", "Submitted", "Approved", "Rejected", "Absent Inst.", "Present/Total", "Attendance", "Status"]],
    body: rows,
    startY: (doc as any).lastAutoTable.finalY + 6,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 73, 130] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportWeeklyToExcel(reports: WeeklyReportData[], title = "Weekly Department Reports") {
  const totalReports = reports.reduce((sum, r) => sum + (r.total_reports || 0), 0);
  const totalSubmitted = reports.reduce((sum, r) => sum + (r.submitted_reports || 0), 0);
  const totalApproved = reports.reduce((sum, r) => sum + (r.approved_reports || 0), 0);
  const totalRejected = reports.reduce((sum, r) => sum + (r.rejected_reports || 0), 0);
  const totalAbsentInstructors = reports.reduce((sum, r) => sum + (r.absent_instructor_reports || 0), 0);
  const totalStudentsPresent = reports.reduce((sum, r) => sum + (r.students_present_total || 0), 0);
  const totalStudentsOverall = reports.reduce((sum, r) => sum + (r.students_total_total || 0), 0);
  const overallAttendance = totalStudentsOverall > 0
    ? Number(((totalStudentsPresent / totalStudentsOverall) * 100).toFixed(2))
    : 0;

  const data = reports.map((r) => ({
    Department: `${r.departments?.code || ""} ${r.departments?.name || ""}`.trim(),
    "Start Date": r.week_start,
    "End Date": r.week_end,
    "Total Reports": r.total_reports,
    Submitted: r.submitted_reports,
    Approved: r.approved_reports,
    Rejected: r.rejected_reports,
    "Absent Instructors": r.absent_instructor_reports,
    "Students Present": r.students_present_total,
    "Students Total": r.students_total_total,
    "Attendance %": r.attendance_rate,
    Status: r.status,
  }));

  const headingRows = [
    ["Adama Science and Technology University"],
    ["College of Electrical Engineering"],
    ["Weekly class report"],
    [""],
    [`Generated: ${new Date().toLocaleString()}`],
    [""],
    ["Summary", ""],
    ["Total Department Weekly Reports", totalReports],
    ["Submitted", totalSubmitted],
    ["Approved", totalApproved],
    ["Rejected", totalRejected],
    ["Absent Instructors (Total)", totalAbsentInstructors],
    ["Students Present / Total", `${totalStudentsPresent}/${totalStudentsOverall}`],
    ["Overall Attendance", `${overallAttendance}%`],
    [""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headingRows);
  XLSX.utils.sheet_add_json(ws, data, { origin: `A${headingRows.length + 1}` });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Reports");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
}
