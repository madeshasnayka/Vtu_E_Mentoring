import mongoose, { Document, Schema } from 'mongoose';

export interface ITermHistory {
  term: string;
  marks: number;
  attendance: number;
  rawMarks?: { obtained: number; total: number };
  rawAttendance?: { attended: number; total: number };
  date?: Date;
}

export interface IStudentDossier {
  personal: {
    dob: string;
    contactNo: string;
    email: string;
    bloodGroup: string;
    permanentAddress: string;
    cityPincode: string;
    fatherNameOccupation: string;
    motherNameOccupation: string;
  };
  academics: {
    qualifications: Array<{
      degree: string;
      spec: string;
      boardUniv: string;
      year: string;
      cgpaPercent: string;
    }>;
    pgcetRank: string;
    semesters: {
      sem1: Array<{ code: string; ia: string; final: string; total: string }>;
      sem2: Array<{ code: string; ia: string; final: string; total: string }>;
      sem3: Array<{ code: string; ia: string; final: string; total: string }>;
      sem4: Array<{ code: string; ia: string; final: string; total: string }>;
    };
  };
  projects: {
    internship: {
      addressContact: string;
      fromDate: string;
      toDate: string;
      guideName: string;
    };
    project: {
      title: string;
      guide: string;
      address: string;
      duration: string;
      elective: string;
    };
    achievements: Array<{ title: string; description: string }>;
  };
  swot: {
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
    careerPlans: string;
    areaOfInterest: string;
    extraCurricular: string;
    coCurricular: string;
    trainingUndergone: string;
    digitalSignature: string;
    isSigned: boolean;
  };
  meetings: Array<{
    date: string;
    time: string;
    topics: string;
    observation: string;
    recommendation: string;
  }>;
}

export interface IStudent extends Document {
  user?: mongoose.Types.ObjectId;
  usn: string;
  tempAdmissionNo?: string;
  name: string;
  email?: string;
  phone?: string;
  mentorId: string;
  mentorName?: string;
  admissionYear: string;
  status: 'admitted' | 'registered' | 'active' | 'graduated';
  remarks?: string;
  history: ITermHistory[];
  currentMarks?: number | null;
  currentAttendance?: number | null;
  deltaMarks?: number;
  deltaAttendance?: number;
  riskLevel?: string;
  dynamicTotal?: number | null;
  isApproved: boolean;
  profilePhoto?: string;
  dossier?: IStudentDossier;
  createdAt: Date;
  updatedAt: Date;
}

export type IStudentDocument = IStudent;

const TermHistorySchema = new Schema<ITermHistory>(
  {
    term: { type: String, required: true },
    marks: { type: Number, required: true },
    attendance: { type: Number, required: true },
    rawMarks: {
      obtained: { type: Number },
      total: { type: Number },
    },
    rawAttendance: {
      attended: { type: Number },
      total: { type: Number },
    },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SubjectRowSchema = new Schema(
  {
    code: { type: String, default: '' },
    ia: { type: String, default: '' },
    final: { type: String, default: '' },
    total: { type: String, default: '' },
  },
  { _id: false }
);

const StudentSchema = new Schema<IStudent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    usn: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tempAdmissionNo: { type: String, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    mentorId: { type: String, default: '', trim: true },
    mentorName: { type: String, default: 'No Mentor' },
    admissionYear: { type: String, default: '2026', trim: true },
    status: {
      type: String,
      enum: ['admitted', 'registered', 'active', 'graduated'],
      default: 'admitted',
    },
    remarks: { type: String, default: '' },
    history: { type: [TermHistorySchema], default: [] },
    currentMarks: { type: Number, default: null },
    currentAttendance: { type: Number, default: null },
    deltaMarks: { type: Number, default: 0 },
    deltaAttendance: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'Not Uploaded' },
    dynamicTotal: { type: Number, default: null },
    isApproved: { type: Boolean, default: false },
    profilePhoto: { type: String, default: '' },
    dossier: {
      personal: {
        dob: { type: String, default: '2005-01-15' },
        contactNo: { type: String, default: '9632039934' },
        email: { type: String, default: '' },
        bloodGroup: { type: String, default: 'O+ve' },
        permanentAddress: {
          type: String,
          default: 'S.R.S Road 14th Ward, Gundlupet Taluk, Chamarajanagar district, Karnataka',
        },
        cityPincode: { type: String, default: 'Gundlupet - 571111' },
        fatherNameOccupation: { type: String, default: 'Sreedhar (Garment)' },
        motherNameOccupation: { type: String, default: 'Rajeshwari (House wife)' },
      },
      academics: {
        qualifications: {
          type: [
            {
              degree: String,
              spec: String,
              boardUniv: String,
              year: String,
              cgpaPercent: String,
            },
          ],
          default: [
            { degree: 'SSLC', spec: '-', boardUniv: 'KSEEB', year: '2020', cgpaPercent: '82.5%' },
            { degree: 'PUC', spec: 'EBACS', boardUniv: 'KPUC', year: '2022', cgpaPercent: '92.5%' },
            { degree: 'Degree', spec: 'BCA', boardUniv: 'Mysore University', year: '2025', cgpaPercent: '9.12 CGPA' },
          ],
        },
        pgcetRank: { type: String, default: '' },
        semesters: {
          sem1: { type: [SubjectRowSchema], default: [{ code: '24MCA11', ia: '45', final: '48', total: '93' }] },
          sem2: { type: [SubjectRowSchema], default: [{ code: '', ia: '', final: '', total: '' }] },
          sem3: { type: [SubjectRowSchema], default: [{ code: '', ia: '', final: '', total: '' }] },
          sem4: { type: [SubjectRowSchema], default: [{ code: '', ia: '', final: '', total: '' }] },
        },
      },
      projects: {
        internship: {
          addressContact: { type: String, default: '' },
          fromDate: { type: String, default: '' },
          toDate: { type: String, default: '' },
          guideName: { type: String, default: '' },
        },
        project: {
          title: { type: String, default: 'Proactive Early-Warning E-Mentoring System' },
          guide: { type: String, default: 'Dr. Kumar P K' },
          address: { type: String, default: 'VTU Centre for PG Studies, Mysuru' },
          duration: { type: String, default: '6 Months' },
          elective: { type: String, default: '' },
        },
        achievements: {
          type: [{ title: String, description: String }],
          default: [{ title: 'ICSEM 2026 Paper Presentation', description: 'Accepted for Full Paper' }],
        },
      },
      swot: {
        strengths: { type: String, default: 'Disciplined guy with self improvement' },
        weaknesses: { type: String, default: 'Impulsiveness' },
        opportunities: { type: String, default: 'Upcoming projects in college' },
        threats: { type: String, default: 'High competition in job market' },
        careerPlans: { type: String, default: 'Aiming to build soft skills.' },
        areaOfInterest: { type: String, default: 'MERN Stack and ML in python.' },
        extraCurricular: { type: String, default: 'Singing' },
        coCurricular: { type: String, default: 'Hackathons & Coding' },
        trainingUndergone: { type: String, default: 'MERN Stack' },
        digitalSignature: { type: String, default: 'Madesha S' },
        isSigned: { type: Boolean, default: true },
      },
      meetings: {
        type: [
          {
            date: String,
            time: String,
            topics: String,
            observation: String,
            recommendation: String,
          },
        ],
        default: [
          {
            date: '1/12/25',
            time: '3:00-4:00',
            topics: 'Guidelines & principles of joining',
            observation: 'Good academic start',
            recommendation: 'Clear about perspective of joining',
          },
        ],
      },
    },
  },
  { timestamps: true }
);

const Student =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export { Student };
export default Student;