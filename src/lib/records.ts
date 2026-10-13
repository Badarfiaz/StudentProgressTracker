import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ExtractedRecord, ResultRecord, Student } from "./types";

const studentDoc = () => doc(db(), "settings", "student");
const recordsCol = (regId: string) => collection(db(), "students", regId, "records");

/** One record per subject per exam date, so the id itself enforces uniqueness. */
export const recordIdOf = (r: Pick<ExtractedRecord, "subjectKey" | "examDateISO">) =>
  `${r.subjectKey}_${r.examDateISO}`;

export function watchStudent(cb: (s: Student | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    studentDoc(),
    (snap) => cb(snap.exists() ? (snap.data() as Student) : null),
    onError,
  );
}

export async function saveStudent(s: Student) {
  await setDoc(studentDoc(), {
    regId: s.regId.trim(),
    fullName: s.fullName.trim().toUpperCase(),
    updatedAt: serverTimestamp(),
  });
}

const millis = (v: unknown) =>
  v && typeof v === "object" && "toMillis" in v ? (v as { toMillis: () => number }).toMillis() : undefined;

export function watchRecords(
  regId: string,
  cb: (r: ResultRecord[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(recordsCol(regId), orderBy("examDateISO", "desc")),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            ...(data as ExtractedRecord),
            id: d.id,
            sourceFileName: data.sourceFileName,
            createdAt: millis(data.createdAt),
            updatedAt: millis(data.updatedAt),
          };
        }),
      ),
    onError,
  );
}

export async function findExisting(r: ExtractedRecord): Promise<ResultRecord | null> {
  const snap = await getDoc(doc(recordsCol(r.regId), recordIdOf(r)));
  return snap.exists() ? ({ ...(snap.data() as ExtractedRecord), id: snap.id } as ResultRecord) : null;
}

export async function saveRecord(r: ExtractedRecord, sourceFileName: string, isUpdate: boolean) {
  const ref = doc(recordsCol(r.regId), recordIdOf(r));
  await setDoc(
    ref,
    {
      ...r,
      sourceFileName,
      updatedAt: serverTimestamp(),
      ...(isUpdate ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: isUpdate }, // merge keeps the original createdAt on update
  );
}

export async function deleteRecord(regId: string, id: string) {
  await deleteDoc(doc(recordsCol(regId), id));
}
