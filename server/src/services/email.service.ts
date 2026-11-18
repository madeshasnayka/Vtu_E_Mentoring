import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Ensures environment variables are parsed immediately

const smtpUser = process.env.EMAIL_USER;
const smtpPass = process.env.EMAIL_PASS;

console.log('[Email Service Init] User loaded:', smtpUser ? `Yes (${smtpUser})` : 'NO (Undefined)');
console.log('[Email Service Init] Pass loaded:', smtpPass ? `Yes (Length: ${smtpPass.length})` : 'NO (Undefined)');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, 
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export const sendInstitutionalInvitation = async (toEmail: string, refNo: string, studentName: string, mentorName: string) => {
  try {
    if (!smtpUser || !smtpPass) {
      console.warn('[Email Warning]: Credentials missing. Skipping live dispatch.');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'VTU PG Centre Mentoring Desk <no-reply@vtu.ac.in>',
      to: toEmail,
      subject: `Institutional Admission & Mentorship Invitation - Ref: ${refNo}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e1b4b; background-color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #4338ca;">VTU PG Centre • Mentoring Desk</h2>
          <p>Dear <b>${studentName}</b>,</p>
          <p>You have been officially enrolled in the institutional mentoring system for the 2026 academic batch.</p>
          
          <div style="background: #ffffff; padding: 15px; border-left: 4px solid #4338ca; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><b>Reference ID:</b> ${refNo}</p>
            <p style="margin: 4px 0;"><b>Assigned Faculty Mentor:</b> ${mentorName}</p>
          </div>

          <p>You can now log into the Student Portal mobile application using your registered credentials.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Automated institutional dispatch.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Institutional Invitation Dispatched] -> To: ${toEmail} | Ref: ${refNo} | MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error('[Email Dispatch Error]:', error.message);
  }
};