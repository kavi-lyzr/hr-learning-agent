/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import { ICourse } from '@/models/course';
import { IUser } from '@/models/user';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Get email configuration from environment variables
const getEmailConfig = (): EmailConfig => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is missing. Please check your environment variables.');
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  };
};

// Create reusable transporter
const createTransporter = () => {
  try {
    const config = getEmailConfig();
    return nodemailer.createTransport(config);
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

// Email templates
interface CourseAssignmentEmailData {
  userName: string;
  userEmail: string;
  courseName: string;
  courseDescription?: string;
  courseLink: string;
  organizationName?: string;
}

const generateCourseAssignmentEmail = (data: CourseAssignmentEmailData) => {
  const { userName, courseName, courseDescription, courseLink, organizationName } = data;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Assignment</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 4px;
    }
    .header {
      background-color: #9031ad;
      padding: 20px;
      margin: -40px -40px 30px -40px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: bold;
      color: #000;
    }
    .content {
      color: #333;
    }
    .content p {
      margin: 15px 0;
    }
    .course-details {
      background-color: #f9f9f9;
      padding: 20px;
      margin: 25px 0;
      border-left: 3px solid #333;
    }
    .course-details h2 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .course-details ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .course-details li {
      margin: 5px 0;
    }
    .info-text {
      margin: 25px 0;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: normal;
    }
    .link-text {
      color: #007bff;
      word-break: break-all;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .container {
        padding: 20px;
      }
      .header {
        margin: -20px -20px 20px -20px;
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Course Assignment</h1>
    </div>
    
    <div class="content">
      <p>Dear ${userName},</p>
      
      <p>You have been assigned a new course${organizationName ? ` by ${organizationName}` : ''}. We encourage you to complete this course to enhance your skills and knowledge.</p>
      
      <div class="course-details">
        <h2>Course Details:</h2>
        <ul>
          <li><strong>Course Name:</strong> ${courseName}</li>
          ${courseDescription ? `<li><strong>Description:</strong> ${courseDescription}</li>` : ''}
        </ul>
      </div>
      
      <p class="info-text">Click the button below to access your course and begin learning:</p>
      
      <a href="${courseLink}" class="button">Start Course</a>
      
      <p style="margin-top: 25px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p class="link-text">${courseLink}</p>
      
      <div class="footer">
        <p>If you have any questions, please contact your administrator.</p>
        <p style="margin-top: 15px;">Thank you for your commitment to learning.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Dear ${userName},

You have been assigned a new course${organizationName ? ` by ${organizationName}` : ''}. We encourage you to complete this course to enhance your skills and knowledge.

Course Details:
- Course Name: ${courseName}
${courseDescription ? `- Description: ${courseDescription}` : ''}

Click the link below to access your course and begin learning:
${courseLink}

If you have any questions, please contact your administrator.

Thank you for your commitment to learning.
  `;

  return { html, text };
};

// Main function to send course assignment email
export const sendCourseAssignmentEmail = async (
  user: IUser,
  course: ICourse,
  courseLink: string,
  organizationName?: string
): Promise<boolean> => {
  try {
    console.log(`📧 Preparing to send email to: ${user.email}`);
    console.log(`📚 Course: ${course.title}`);
    
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('❌ Email transporter not configured. Skipping email notification.');
      console.error('💡 Please configure SMTP settings in your .env file:');
      console.error('   - SMTP_HOST');
      console.error('   - SMTP_PORT');
      console.error('   - SMTP_USER');
      console.error('   - SMTP_PASSWORD');
      return false;
    }

    const emailData: CourseAssignmentEmailData = {
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      courseName: course.title,
      courseDescription: course.description,
      courseLink,
      organizationName,
    };

    const { html, text } = generateCourseAssignmentEmail(emailData);

    const fromEmail = process.env.SMTP_USER;
    const fromName = 'Lyzr L&D';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: user.email,
      subject: `Course Assignment: ${course.title}`,
      text,
      html,
    };

    console.log(`📤 Sending email from: ${fromName} <${fromEmail}>`);
    console.log(`📬 Sending email to: ${user.email}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Course assignment email sent successfully!`);
    console.log(`📨 Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send course assignment email:');
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('SMTP response:', error.response);
    }
    return false;
  }
};

// Test email configuration
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Email transporter not configured.');
      return false;
    }

    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
};
