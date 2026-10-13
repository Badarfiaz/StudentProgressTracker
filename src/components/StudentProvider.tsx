"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { firebaseConfigured } from "@/lib/firebase";
import { watchRecords, watchStudent } from "@/lib/records";
import type { ResultRecord, Student } from "@/lib/types";

interface StudentState {
  student: Student | null;
  records: ResultRecord[];
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<StudentState>({ student: null, records: [], loading: true, error: null });
export const useStudent = () => useContext(Ctx);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [studentReady, setStudentReady] = useState(false);
  const [records, setRecords] = useState<ResultRecord[]>([]);
  const [recordsReady, setRecordsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return watchStudent(
      (s) => {
        setStudent(s);
        setStudentReady(true);
      },
      (e) => {
        setError(e.message);
        setStudentReady(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!student?.regId) {
      setRecords([]);
      setRecordsReady(true);
      return;
    }
    setRecordsReady(false);
    return watchRecords(
      student.regId,
      (r) => {
        setRecords(r);
        setRecordsReady(true);
      },
      (e) => {
        setError(e.message);
        setRecordsReady(true);
      },
    );
  }, [student?.regId]);

  return (
    <Ctx.Provider value={{ student, records, loading: !studentReady || !recordsReady, error }}>
      {children}
    </Ctx.Provider>
  );
}
