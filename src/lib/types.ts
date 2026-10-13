export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  page: number;
}

export interface Student {
  regId: string;
  fullName: string;
}

export interface ClassStats {
  totalStudents: number;
  present: number;
  absent: number;
  passed: number;
  failed: number;
  /** Average percentage of students who sat the exam */
  classAverage: number | null;
  highestMarks: number | null;
  /** Rank among students who sat the exam (ties share a rank) */
  position: number | null;
}

/** One student's row pulled out of a result sheet, plus the sheet's header info. */
export interface ExtractedRecord {
  regId: string;
  studentName: string;
  srNo: string;
  school: string;
  subject: string;
  subjectKey: string;
  examType: string;
  examNo: string;
  examDate: string; // as printed, e.g. 10.10.2026
  examDateISO: string; // 2026-10-10
  month: string;
  className: string;
  section: string;
  session: string;
  classTeacher: string;
  lessonRef: string;
  totalMarks: number | null;
  marks: number | null;
  percentage: number | null;
  grade: string;
  remarks: string;
  isAbsent: boolean;
  classStats: ClassStats;
}

export interface ResultRecord extends ExtractedRecord {
  id: string;
  sourceFileName?: string;
  createdAt?: number;
  updatedAt?: number;
}
