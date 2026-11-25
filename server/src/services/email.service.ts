// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config(); // Ensures environment variables are parsed immediately

// const smtpUser = process.env.EMAIL_USER;
// const smtpPass = process.env.EMAIL_PASS;

// console.log('[Email Service Init] User loaded:', smtpUser ? `Yes (${smtpUser})` : 'NO (Undefined)');
// console.log('[Email Service Init] Pass loaded:', smtpPass ? `Yes (Length: ${smtpPass.length})` : 'NO (Undefined)');

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST || 'smtp.gmail.com',
//   port: Number(process.env.EMAIL_PORT) || 587,
//   secure: false, 
//   auth: {
//     user: smtpUser,
//     pass: smtpPass,
//   },
// });

// export const sendInstitutionalInvitation = async (toEmail: string, refNo: string, studentName: string, mentorName: string) => {
//   try {
//     if (!smtpUser || !smtpPass) {
//       console.warn('[Email Warning]: Credentials missing. Skipping live dispatch.');
//       return;
//     }

//     const mailOptions = {
//       from: process.env.EMAIL_FROM || 'VTU PG Centre Mentoring Desk <no-reply@vtu.ac.in>',
//       to: toEmail,
//       subject: `Institutional Admission & Mentorship Invitation - Ref: ${refNo}`,
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e1b4b; background-color: #f8fafc; border-radius: 8px;">
//           <h2 style="color: #4338ca;">VTU PG Centre • Mentoring Desk</h2>
//           <p>Dear <b>${studentName}</b>,</p>
//           <p>You have been officially enrolled in the institutional mentoring system for the 2026 academic batch.</p>
          
//           <div style="background: #ffffff; padding: 15px; border-left: 4px solid #4338ca; margin: 20px 0; border-radius: 4px;">
//             <p style="margin: 4px 0;"><b>Reference ID:</b> ${refNo}</p>
//             <p style="margin: 4px 0;"><b>Assigned Faculty Mentor:</b> ${mentorName}</p>
//           </div>

//           <p>You can now log into the Student Portal mobile application using your registered credentials.</p>
          
//           <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Automated institutional dispatch.</p>
//         </div>
//       `,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log(`[Institutional Invitation Dispatched] -> To: ${toEmail} | Ref: ${refNo} | MessageId: ${info.messageId}`);
//   } catch (error: any) {
//     console.error('[Email Dispatch Error]:', error.message);
//   }
// };
import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = process.env.EMAIL_USER || 'madeshnayak7712@gmail.com';
const SENDER_NAME = 'VTU PG Centre Mentoring Desk';

console.log(
  '[Email Service Init] Brevo API Key loaded:',
  BREVO_API_KEY ? 'YES' : 'NO (Undefined)'
);
console.log('[Email Service Init] Sender Email:', SENDER_EMAIL);

export const sendInstitutionalInvitation = async (
  toEmail: string,
  identifier: string,
  studentName: string,
  mentorName: string,
  customPasswordNote = 'Default password: password123 (please change after first login).'
): Promise<boolean> => {
  try {
    const cleanRecipient = String(toEmail || '').trim().toLowerCase();
    if (!cleanRecipient || !cleanRecipient.includes('@')) {
      console.warn('[Email Dispatch Skipped] Invalid recipient email:', toEmail);
      return false;
    }
    if (!BREVO_API_KEY) {
      console.warn(
        '[Email Dispatch Skipped] BREVO_API_KEY is missing in environment.'
      );
      return false;
    }

    const resolvedMentor =
      mentorName && mentorName.trim() !== ''
        ? mentorName
        : 'No Mentor (Unassigned)';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #dce5f3; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #14294e; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 11px; letter-spacing: 1.2px; color: #a5c4ff; font-weight: bold;">VTU CENTRE FOR POSTGRADUATE STUDIES • MYSURU</p>
          <h2 style="margin: 6px 0 0 0; font-size: 19px;">E-Mentoring Portal Access Activated</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #172b4d; line-height: 1.6;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your scholar profile has been verified and activated on the <strong>VTU PG Studies E-Mentoring System</strong>.</p>
          <div style="background-color: #f3f6fc; border: 1px solid #dce5f3; border-radius: 10px; padding: 14px 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Scholar USN / Admission ID:</strong> ${identifier}</p>
            <p style="margin: 4px 0;"><strong>Registered Email:</strong> ${cleanRecipient}</p>
            <p style="margin: 4px 0;"><strong>Assigned Faculty Mentor:</strong> ${resolvedMentor}</p>
            <p style="margin: 4px 0;"><strong>Login Password:</strong> ${customPasswordNote}</p>
          </div>
          <p style="font-size: 13px; color: #5e6f8c;">You can now sign in to the VTU E-Mentoring mobile app using your USN/ID or registered email address.</p>
          <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Automated institutional dispatch — VTU PG Centre Mentoring Desk.</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: cleanRecipient, name: studentName }],
        subject: `VTU E-Mentoring Portal Activated — ${studentName} (${identifier})`,
        htmlContent: htmlBody,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[Email Dispatch Error] Brevo API (${response.status}) for ${cleanRecipient}:`,
        errText
      );
      return false;
    }

    const data: any = await response.json();
    console.log(
      `[Institutional Invitation Dispatched] -> To: ${cleanRecipient} | Ref: ${identifier} | MessageId: ${data.messageId}`
    );
    return true;
  } catch (error: any) {
    console.error(
      `[Email Dispatch Error] Failed to send to ${toEmail}:`,
      error.message
    );
    return false;
  }
};

export const sendUsnAllotmentEmail = async (
  toEmail: string,
  officialUsn: string,
  previousId: string,
  studentName: string,
  mentorName = ''
): Promise<boolean> => {
  try {
    const cleanRecipient = String(toEmail || '').trim().toLowerCase();
    if (!cleanRecipient || !cleanRecipient.includes('@')) {
      console.warn('[USN Email Skipped] Invalid recipient email:', toEmail);
      return false;
    }
    if (!BREVO_API_KEY) {
      console.warn(
        '[USN Email Skipped] BREVO_API_KEY is missing in environment.'
      );
      return false;
    }

    const resolvedMentor =
      mentorName && mentorName.trim() !== ''
        ? mentorName
        : 'No Mentor (Unassigned)';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #dce5f3; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #14294e; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 11px; letter-spacing: 1.2px; color: #a5c4ff; font-weight: bold;">VTU CENTRE FOR POSTGRADUATE STUDIES • MYSURU</p>
          <h2 style="margin: 6px 0 0 0; font-size: 19px;">Official University USN Allotted</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #172b4d; line-height: 1.6;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your official <strong>University Seat Number (USN)</strong> has been allotted and updated on the <strong>VTU PG Studies E-Mentoring System</strong>.</p>
          <div style="background-color: #f3f6fc; border: 1px solid #dce5f3; border-radius: 10px; padding: 14px 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Official University USN:</strong> <span style="color: #2563eb; font-weight: bold;">${officialUsn}</span></p>
            <p style="margin: 4px 0;"><strong>Previous Admission / Provisional ID:</strong> ${previousId}</p>
            <p style="margin: 4px 0;"><strong>Registered Email:</strong> ${cleanRecipient}</p>
            <p style="margin: 4px 0;"><strong>Assigned Faculty Mentor:</strong> ${resolvedMentor}</p>
          </div>
          <p style="font-size: 13px; color: #5e6f8c;">Please use your new official USN (<strong>${officialUsn}</strong>) or your registered email address with your existing password to sign in to the VTU E-Mentoring mobile app.</p>
          <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Automated institutional dispatch — VTU PG Centre Mentoring Desk.</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: cleanRecipient, name: studentName }],
        subject: `Official VTU USN Allotted — ${studentName} (${officialUsn})`,
        htmlContent: htmlBody,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[USN Email Error] Brevo API (${response.status}) for ${cleanRecipient}:`,
        errText
      );
      return false;
    }

    const data: any = await response.json();
    console.log(
      `[USN Allotment Email Dispatched] -> To: ${cleanRecipient} | USN: ${officialUsn} | MessageId: ${data.messageId}`
    );
    return true;
  } catch (error: any) {
    console.error(
      `[USN Email Error] Failed to send to ${toEmail}:`,
      error.message
    );
    return false;
  }
};