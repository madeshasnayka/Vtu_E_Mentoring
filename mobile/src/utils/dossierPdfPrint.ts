import { Alert, Platform } from 'react-native';

export const buildDossierPrintHtml = (doc: any, dossierData: any, studentName: string, studentUsn: string) => {
  const ds = dossierData || {};
  const personal = ds.personal || {};
  const academics = ds.academics || {};
  const projects = ds.projects || {};
  const swot = ds.swot || {};
  const meetings = Array.isArray(ds.meetings) ? ds.meetings : [];

  const qualRows = (academics.qualifications || [])
    .map(
      (q: any) =>
        `<tr><td>${q.degree || '-'}</td><td>${q.spec || '-'}</td><td>${
          q.boardUniv || '-'
        }</td><td>${q.year || '-'}</td><td><strong>${q.cgpaPercent || '-'}</strong></td></tr>`
    )
    .join('');

  const semKeys: Array<{ key: 'sem1' | 'sem2' | 'sem3' | 'sem4'; label: string }> = [
    { key: 'sem1', label: 'I Semester' },
    { key: 'sem2', label: 'II Semester' },
    { key: 'sem3', label: 'III Semester' },
    { key: 'sem4', label: 'IV Semester' },
  ];

  const semTables = semKeys
    .map(({ key, label }) => {
      const rows = (academics.semesters?.[key] || []).filter(
        (r: any) => r.code || r.ia || r.final || r.total
      );
      if (rows.length === 0) return '';
      return `
        <div style="margin-top:8px; font-weight:700; font-size:12px; color:#14294e;">${label}</div>
        <table>
          <thead><tr><th>Subject Code</th><th>IA Marks</th><th>Final Exam</th><th>Total</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (r: any) =>
                  `<tr><td>${r.code || '-'}</td><td>${r.ia || '-'}</td><td>${
                    r.final || '-'
                  }</td><td><strong>${r.total || '-'}</strong></td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    })
    .join('');

  const achHtml = (projects.achievements || [])
    .map((a: any, i: number) => `<div><strong>${i + 1}. ${a.title || '-'}:</strong> ${a.description || '-'}</div>`)
    .join('');

  const meetRows = meetings
    .map(
      (m: any) =>
        `<tr><td>${m.date || '-'} (${m.time || '-'})</td><td>${m.topics || '-'}</td><td>${
          m.observation || '-'
        }</td><td>${m.recommendation || '-'}</td></tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>VTU Mentorship Dossier - ${studentUsn}</title>
      <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; padding: 24px; font-size: 12px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #14294e; padding-bottom: 12px; margin-bottom: 16px; }
        .kicker { font-size: 10px; font-weight: 800; color: #315fc4; letter-spacing: 0.8px; text-transform: uppercase; }
        .title { font-size: 18px; font-weight: 900; color: #14294e; margin-top: 2px; }
        .sub { font-size: 11px; color: #475569; }
        .proof-banner { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; }
        .sec-title { background: #edf2fb; color: #14294e; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 10px; border-left: 4px solid #315fc4; margin: 14px 0 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 800; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 28px; padding-top: 12px; border-top: 1px dashed #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="kicker">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</div>
          <div class="title">Centre for PG Studies, Mysuru — Dept. of CSE</div>
          <div class="sub">Official Student Mentorship Dossier & Uploaded Verification Proof</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; color:${doc?.verified ? '#047857' : '#b45309'};">
            STATUS: ${doc?.verified ? 'MENTOR VERIFIED' : 'PENDING VERIFICATION'}
          </div>
          <div class="sub">Date: ${doc?.date || new Date().toISOString().split('T')[0]}</div>
        </div>
      </div>

      <div class="proof-banner">
        <strong>Document Record:</strong> ${doc?.title || 'Academic Submission'} &nbsp;|&nbsp;
        <strong>Category:</strong> ${doc?.category || 'Marks Card'} &nbsp;|&nbsp;
        <strong>File:</strong> ${doc?.fileName || 'VTU_Proof.pdf'}
      </div>

      <div class="sec-title">1. Personal & Family Credentials</div>
      <div class="grid">
        <div><strong>Full Name:</strong> ${studentName}</div>
        <div><strong>University USN:</strong> ${studentUsn}</div>
        <div><strong>Date of Birth:</strong> ${personal.dob || '-'}</div>
        <div><strong>Blood Group:</strong> ${personal.bloodGroup || '-'}</div>
        <div><strong>Contact Number:</strong> ${personal.contactNo || '-'}</div>
        <div><strong>Email Address:</strong> ${personal.email || '-'}</div>
        <div><strong>Father's Details:</strong> ${personal.fatherNameOccupation || '-'}</div>
        <div><strong>Mother's Details:</strong> ${personal.motherNameOccupation || '-'}</div>
        <div style="grid-column: span 2;"><strong>Permanent Address:</strong> ${personal.permanentAddress || '-'} (${personal.cityPincode || '-'})</div>
      </div>

      <div class="sec-title">2. Educational Qualifications & Semester Marks</div>
      <div><strong>PGCET / Entrance Rank:</strong> ${academics.pgcetRank || 'N/A'}</div>
      <table>
        <thead><tr><th>Degree</th><th>Specialization</th><th>Board / University</th><th>Year</th><th>CGPA / %</th></tr></thead>
        <tbody>${qualRows}</tbody>
      </table>
      ${semTables}

      <div class="sec-title">3. Internship, Academic Project & Achievements</div>
      <div class="grid">
        <div><strong>Internship Organization:</strong> ${projects.internship?.addressContact || '-'}</div>
        <div><strong>Internship Guide & Period:</strong> ${projects.internship?.guideName || '-'} (${projects.internship?.fromDate || '-'} to ${projects.internship?.toDate || '-'})</div>
        <div><strong>Project Title:</strong> ${projects.project?.title || '-'}</div>
        <div><strong>Project Guide & Duration:</strong> ${projects.project?.guide || '-'} (${projects.project?.duration || '-'})</div>
        <div><strong>Carried Out At:</strong> ${projects.project?.address || '-'}</div>
        <div><strong>Elective Chosen:</strong> ${projects.project?.elective || '-'}</div>
      </div>
      <div style="margin-top:6px;"><strong>Achievements:</strong> ${achHtml || 'None recorded'}</div>

      <div class="sec-title">4. SWOT Analysis, Career Plans & Training</div>
      <div class="grid">
        <div><strong>Strengths:</strong> ${swot.strengths || '-'}</div>
        <div><strong>Weaknesses:</strong> ${swot.weaknesses || '-'}</div>
        <div><strong>Opportunities:</strong> ${swot.opportunities || '-'}</div>
        <div><strong>Threats:</strong> ${swot.threats || '-'}</div>
        <div><strong>Career Plans:</strong> ${swot.careerPlans || '-'}</div>
        <div><strong>Area of Interest:</strong> ${swot.areaOfInterest || '-'}</div>
        <div><strong>Extra / Co-Curricular:</strong> ${swot.extraCurricular || '-'} / ${swot.coCurricular || '-'}</div>
        <div><strong>Training Undergone:</strong> ${swot.trainingUndergone || '-'}</div>
      </div>

      <div class="sec-title">5. Mentor-Mentee Counseling Log</div>
      <table>
        <thead><tr><th>Date & Time</th><th>Topics Discussed</th><th>Observation</th><th>Recommendation</th></tr></thead>
        <tbody>${meetRows}</tbody>
      </table>

      <div class="sig-row">
        <div>
          <div style="font-size:15px; font-weight:800; font-style:italic; color:#047857;">${swot.digitalSignature || studentName}</div>
          <div class="sub">Mentee Digital Signature</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; color:#14294e;">Faculty Mentor</div>
          <div class="sub">VTU PG Studies, Mysuru</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const printOrExportDossierPdf = async (
  doc: any,
  dossierData: any,
  studentName: string,
  studentUsn: string
) => {
  const html = buildDossierPrintHtml(doc, dossierData, studentName, studentUsn);

  try {
    // Dynamically use expo-print if installed in the project
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Print = require('expo-print');
    if (Print && typeof Print.printAsync === 'function') {
      await Print.printAsync({ html });
      return;
    }
  } catch {
    // Fallback if expo-print is not installed yet
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
      return;
    }
  }

  Alert.alert(
    'VTU Dossier PDF Ready',
    `Official A4 Dossier & Proof PDF generated for ${studentName} (${studentUsn}).\n\nDocument: ${doc?.title || 'Dossier'}\nStatus: ${doc?.verified ? 'Verified' : 'Pending'}\n\n(Tip: Run "npx expo install expo-print" to open the native Android/iOS print & save-as-PDF dialog automatically.)`
  );
};