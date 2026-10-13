# Progress Diary

A Next.js + Firestore app for following one student's school test results.
Parents drop in class "Subject Result" PDFs (up to 8 at once); the app reads them
in the browser, pulls out the row matching the saved Reg. ID, and stores only that
row plus the sheet's header details. The PDF is never uploaded or stored.

## Setup

1. **Create a Firebase project** at https://console.firebase.google.com
   - Add a **Web app** and copy its config.
   - Open **Firestore Database** and click **Create database**.
2. **Configure the app**
   ```bash
   cp .env.example .env.local   # paste your Firebase config values
   npm install                  # also copies the pdf.js worker into /public
   npm run dev
   ```
3. **Publish the rules**: paste `firestore.rules` into Firestore > Rules (or `firebase deploy --only firestore:rules`).

Open http://localhost:3000, enter the student's Reg. ID and full name, and start adding sheets.

## How it works

| Piece | File |
|---|---|
| PDF text with positions (browser only) | `src/lib/pdfExtract.ts` |
| Rebuilds table rows, reads header fields | `src/lib/pdfParser.ts` |
| Firestore reads/writes | `src/lib/records.ts` |
| Statistics | `src/lib/stats.ts` |

The sheet's PDF stores the table column by column, so the parser rebuilds rows by
matching each text item's y position to the Reg.ID cell, and assigns columns by the
nearest table header (Sr.#, Reg.ID, Student Name, Marks, %age, Grade, Remarks).

**Grade `AB`** is saved as absent: `isAbsent: true`, `marks` and `percentage` are `null`,
so absences never drag down averages.

While reading the sheet the app also computes class context from all rows (class
average, top marks, how many sat, and the student's position) and saves it with
the record. That's what powers the "compared with the class" stats.

## Firestore layout

```
settings/student                       { regId, fullName }
students/{regId}/records/{SUBJECT_YYYY-MM-DD}
  regId, studentName, subject, subjectKey, examType, examNo,
  examDate ("10.10.2026"), examDateISO ("2026-10-10"), month,
  className, section, session, classTeacher, lessonRef,
  totalMarks, marks, percentage, grade, remarks, isAbsent,
  classStats { totalStudents, present, absent, passed, failed,
               classAverage, highestMarks, position },
  sourceFileName, createdAt, updatedAt
```

The document id is `subject + date`, so a duplicate is detected with a single read.
When one is found, a dialog offers **Update record** or **Cancel**, with an option to
apply the same choice to the rest of the batch.

## Before going public

The included rules are open so the app works without sign-in. If you deploy it
anywhere others can reach, add Firebase Authentication and restrict the rules to
`request.auth != null` (ideally per-parent), otherwise anyone with the URL can read
and change the data.
