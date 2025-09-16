import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  service: string;
  user: string;
  pass: string;
}

type IssueData = {
  title: string;
  priority: "MEDIUM" | "LOW" | "HIGH" | "URGENT"; //not used
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
};

class EmailService {
  private transporter: nodemailer.Transporter;
  private baseUrl: string;

  constructor() {
    // Environment validation
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASS must be set');
    }

    // Set base URL with proper fallback for production
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? process.env.NEXTAUTH_URL || 'https://dev.raunakcodes.me'
        : 'http://localhost:3000');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify transporter configuration on initialization
    this.verifyConnection();
  }

  /**
   * Verify email service connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      if (process.env.NODE_ENV === 'development') {
        console.log('Email service connection verified');
      }
    } catch (error) {
      console.error('Email service connection failed:', error);
      throw new Error('Failed to connect to email service');
    }
  }

  /**
   * Generate a secure verification token
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationLink = `${this.baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: {
        name: 'CivicResolve',
        address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
      },
      to: email,
      subject: 'Verify Your Email - CivicResolve',
      html: this.getVerificationEmailTemplate(userName, verificationLink)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Verification email sent successfully to ${email}`);
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const resetLink = `${this.baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: {
        name: 'CivicResolve',
        address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
      },
      to: email,
      subject: 'Reset Your Password - CivicResolve',
      html: this.getPasswordResetEmailTemplate(userName, resetLink)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Password reset email sent successfully to ${email}`);
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
 * Send issue reported email to user
 */
  async sendIssueReportedEmail(email: string, issueId: number, issueData: IssueData, userName: string): Promise<void> {
    const issueLink = `${this.baseUrl}/issues/${issueId}`;

    const mailOptions = {
      from: {
        name: 'CivicResolve',
        address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
      },
      to: email,
      subject: 'Your issue has been successfully reported - CivicResolve',
      html: this.getIssueReportedEmailTemplate(userName, issueId, issueData, issueLink)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Issue reported email sent successfully to ${email}`);
      }
    } catch (error) {
      console.error('Error sending issue report email:', error);
      throw new Error('Failed to send issue reported email');
    }
  }

  /**
 * Send status update email to user
 */
  async sendStatusUpdateEmail(email: string, issueId: number, issueStatus: string, issueTitle: string, userName: string, isRemove: boolean): Promise<void> {
    const issueLink = `${this.baseUrl}/issues/${issueId}`;

    const mailOptions = {
      from: {
        name: 'CivicResolve',
        address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
      },
      to: email,
      subject: `Update on your reported issue, ${issueId} is ${isRemove ? "removed" : issueStatus} - CivicResolve`,
      html: this.getStatusUpdateEmailTemplate(userName, issueId, issueStatus, issueTitle, isRemove, issueLink)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Issue updated status email sent successfully to ${email}`);
      }
    } catch (error) {
      console.error('Error sending status update email:', error);
      throw new Error('Failed to send issue updated status email');
    }
  }

  /**
   * Send issue notification to organization members
   */
  async sendIssueNotificationToOrganizations(issueId: number, issueData: IssueData): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { CategoryOrganizationMappingModel, UserOrganizationModel } = await import('./models');

      // Get organizations responsible for this category
      const mappings = await CategoryOrganizationMappingModel.getByCategory(issueData.category);
      
      if (mappings.length === 0) {
        console.log(`No organizations found for category: ${issueData.category}`);
        return;
      }

      const issueLink = `${this.baseUrl}/issues/${issueId}`;

      // Send notification to each organization's members
      for (const mapping of mappings) {
        const members = await UserOrganizationModel.getByOrganization(mapping.organization_id);
        
        for (const member of members) {
          // The getByOrganization method includes user details with aliases
          const userEmail = (member as any).user_email;
          const userName = (member as any).user_name;
          
          if (userEmail) {
            try {
              const mailOptions = {
                from: {
                  name: 'CivicResolve',
                  address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
                },
                to: userEmail,
                subject: `New ${issueData.category} Issue Assigned - CivicResolve`,
                html: this.getOrganizationIssueNotificationTemplate(
                  userName || 'Team Member',
                  issueId,
                  issueData,
                  mapping.organization?.name || 'Your Organization',
                  issueLink
                )
              };

              await this.transporter.sendMail(mailOptions);
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`Organization notification sent to ${userEmail}`);
              }
            } catch (error) {
              console.error(`Error sending notification to ${userEmail}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending organization notifications:', error);
      throw new Error('Failed to send organization notifications');
    }
  }

  /**
   * Send assignment notification email to a user when they are assigned an issue
   */
  async sendAssignmentNotificationEmail(
    memberEmail: string, 
    memberName: string, 
    issueId: number, 
    issueData: IssueData, 
    assignedByName: string,
    organizationName: string
  ): Promise<void> {
    try {
      const issueLink = `${this.baseUrl}/issues/${issueId}`;
      
      const mailOptions = {
        from: {
          name: 'CivicResolve',
          address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
        },
        to: memberEmail,
        subject: `Issue Assigned to You - ${issueData.title} - CivicResolve`,
        html: this.getAssignmentNotificationTemplate(
          memberName,
          issueId,
          issueData,
          assignedByName,
          organizationName,
          issueLink
        )
      };

      await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Assignment notification sent to ${memberEmail}`);
      }
    } catch (error) {
      console.error('Error sending assignment notification:', error);
      throw new Error('Failed to send assignment notification');
    }
  }

  /**
   * Send welcome email when user is assigned to an organization
   */
  async sendOrganizationWelcomeEmail(
    userEmail: string,
    userName: string,
    organizationName: string,
    role: string,
    assignedByName: string
  ): Promise<void> {
    try {
      const dashboardLink = `${this.baseUrl}/organization`;
      
      const mailOptions = {
        from: {
          name: 'CivicResolve',
          address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
        },
        to: userEmail,
        subject: `Welcome to ${organizationName} - CivicResolve`,
        html: this.getOrganizationWelcomeTemplate(
          userName,
          organizationName,
          role,
          assignedByName,
          dashboardLink
        )
      };

      await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Organization welcome email sent to ${userEmail}`);
      }
    } catch (error) {
      console.error('Error sending organization welcome email:', error);
      throw new Error('Failed to send organization welcome email');
    }
  }

  /**
   * Send status update notification email to issue reporter
   */
  async sendStatusUpdateNotificationEmail(
    reporterEmail: string,
    reporterName: string,
    issueId: number,
    issueData: IssueData,
    oldStatus: string,
    newStatus: string,
    assignedMemberId: string | null,
    organizationName: string,
    updatedByEmployeeId: string | null
  ): Promise<void> {
    try {
      const issueLink = `${this.baseUrl}/issues/${issueId}`;
      
      const mailOptions = {
        from: {
          name: 'CivicResolve',
          address: process.env.EMAIL_USER || 'noreply@civicresolve.com'
        },
        to: reporterEmail,
        subject: `Issue Update: ${issueData.title} - Status Changed to ${newStatus}`,
        html: this.getStatusUpdateNotificationTemplate(
          reporterName,
          issueId,
          issueData,
          oldStatus,
          newStatus,
          assignedMemberId,
          organizationName,
          updatedByEmployeeId,
          issueLink
        )
      };

      await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Status update notification sent to ${reporterEmail}`);
      }
    } catch (error) {
      console.error('Error sending status update notification:', error);
      throw new Error('Failed to send status update notification');
    }
  }

  /**
   * HTML template for verification email
   */
  private getVerificationEmailTemplate(userName: string, verificationLink: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email Verification - CivicResolve</title>
      <style>
        body {
          font-family: 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #2d2d2d;
          background-color: #f3f4f6;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          text-align: center;
          padding: 40px 20px;
        }
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .logo img {
          height: 32px;
          width: auto;
          vertical-align: middle;
        }
        .logo-text {
          color: white;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .content {
          padding: 30px 25px;
        }
        h2 {
          margin-top: 0;
          font-size: 22px;
          color: #111827;
        }
        p {
          margin: 12px 0;
          font-size: 15px;
        }
        ul {
          padding-left: 18px;
          margin: 15px 0;
        }
        li {
          margin-bottom: 8px;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 25px 0;
          transition: background 0.2s ease-in-out;
        }
        .button:hover {
          background: #1d4ed8;
        }
        .link-box {
          word-break: break-word;
          background: #f3f4f6;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #1f2937;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #6b7280;
          background: #fafafa;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="${this.baseUrl}/logo.png" alt="CivicResolve Logo" />
            <span class="logo-text">CivicResolve</span>
          </div>
          <h1 style="margin:0;">Welcome to CivicResolve!</h1>
        </div>
        <div class="content">
          <h2>Hi ${userName},</h2>
          <p>
            Thank you for joining <strong>CivicResolve</strong>! We're thrilled to have you in our community of engaged citizens working together to improve neighborhoods.
          </p>
          <p>
            Please verify your email address to complete your registration and start reporting civic issues:
          </p>
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify My Email</a>
          </div>
          <p>If the button doesn’t work, copy and paste the link below into your browser:</p>
          <div class="link-box">${verificationLink}</div>
          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          <p>If you didn’t create a CivicResolve account, please ignore this email.</p>
          <p>Once verified, you’ll be able to:</p>
          <ul>
            <li>📍 Report civic issues in your community</li>
            <li>🗺️ View issues on an interactive map</li>
            <li>💬 Comment and vote on issues</li>
            <li>📊 Track the progress of reported issues</li>
          </ul>
          <p>
            Warm regards,<br />
            <strong>The CivicResolve Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>This is an automated message. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }


  /**
   * HTML template for password reset email
   */
  private getPasswordResetEmailTemplate(userName: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #b91c1c; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .logo { 
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .logo img {
            height: 32px;
            width: auto;
            vertical-align: middle;
          }
          .logo-text {
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${this.baseUrl}/logo.png" alt="CivicResolve Logo" />
            <span class="logo-text">CivicResolve</span>
          </div>
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <h2>Hi ${userName},</h2>
          <p>We received a request to reset your password for your CivicResolve account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px;">${resetLink}</p>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <p>For security reasons, this reset link can only be used once.</p>
          
          <p>Best regards,<br>The CivicResolve Team</p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  }


  /**
   * HTML template for issue reported email
   */
  private getIssueReportedEmailTemplate(
    userName: string,
    issueId: number,
    issueData: IssueData,
    issueLink: string
  ): string {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Issue Reported - CivicResolve</title>
    <style>
      body {
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
        line-height: 1.6;
        color: #2d2d2d;
        background-color: #f3f4f6;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        text-align: center;
        padding: 40px 20px;
      }
      .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 26px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .logo img {
        height: 32px;
        width: auto;
        vertical-align: middle;
      }
      .logo-text {
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      .content {
        padding: 30px 25px;
      }
      h2 {
        margin-top: 0;
        font-size: 22px;
        color: #111827;
      }
      p {
        margin: 12px 0;
        font-size: 15px;
      }
      ul {
        padding-left: 18px;
        margin: 12px 0;
      }
      li {
        margin: 6px 0;
        font-size: 14px;
      }
      .button {
        display: inline-block;
        background: #2563eb;
        color: #ffffff;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        margin: 25px 0;
        transition: background 0.2s ease-in-out;
      }
      .button:hover {
        background: #1d4ed8;
      }
      .link-box {
        word-break: break-word;
        background: #f3f4f6;
        padding: 12px;
        border-radius: 6px;
        font-size: 13px;
        color: #1f2937;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #6b7280;
        background: #fafafa;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="${this.baseUrl}/logo.png" alt="CivicResolve Logo" />
          <span class="logo-text">CivicResolve</span>
        </div>
        <h1 style="margin:0;">Issue Report Submitted</h1>
      </div>
      <div class="content">
        <h2>Hi ${userName},</h2>
        <p>
          Thank you for reporting an issue through <strong>CivicResolve</strong>. 
          Your contribution helps make our community better.
        </p>
        <p><strong>Issue Details:</strong></p>
        <ul>
          <li><strong>ID:</strong> ${issueId}</li>
          <li><strong>Title:</strong> ${issueData.title}</li>
          <li><strong>Category:</strong> ${issueData.category}</li>
          <li><strong>Description:</strong> ${issueData.description}</li>
          <li><strong>Address:</strong> ${issueData.address}</li>
          <li><strong>Latitude:</strong> ${issueData.latitude}</li>
          <li><strong>Longitude:</strong> ${issueData.longitude}</li>
        </ul>
        <div style="text-align: center;">
          <a href="${issueLink}" class="button">View Reported Issue</a>
        </div>
        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <div class="link-box">${issueLink}</div>
        <p>
          You’ll be able to track updates, comments, and progress on this issue 
          directly from the CivicResolve platform.
        </p>
        <p>
          Warm regards,<br />
          <strong>The CivicResolve Team</strong>
        </p>
      </div>
      <div class="footer">
        <p>© 2025 CivicResolve. All rights reserved.</p>
        <p>This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  }

  /**
   * HTML template for status update email
   */
  private getStatusUpdateEmailTemplate(
    userName: string,
    issueId: number,
    issueStatus: string,
    issueTitle: string,
    isRemove: boolean,
    issueLink: string
  ): string {

    let statusMessage = "";

    if (isRemove) {
      if (issueStatus === "RESOLVED") {
        statusMessage = `
      <p>
        This issue was already <strong>resolved</strong> and has now been removed for housekeeping.  
        No further action is required on your part.  
      </p>
    `;
      } else {
        statusMessage = `
      <p>
        Your issue was <strong>removed</strong> before it could be resolved.  
        This may be because it was a duplicate, incomplete, or did not meet our reporting guidelines. 
      </p>
    `;
      }
    } else if (issueStatus === "IN_PROGRESS") {
      statusMessage = `
    <p>
      Good news! Your reported issue is now <strong>in progress</strong>.  
      Our team has acknowledged it and is actively working on a resolution.  
      You’ll be notified once there are further updates.
    </p>
  `;
    } else if (issueStatus === "RESOLVED") {
      statusMessage = `
    <p>
      We’re happy to let you know that your reported issue has been <strong>resolved</strong>.  
      Thank you for helping us improve our community!
    </p>
  `;
    } else {
      statusMessage = `
    <p>
      Your issue status has been updated to <strong>${issueStatus}</strong>.  
      You can track more details from your dashboard.
    </p>
  `;
    }

    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Issue Status Update - CivicResolve</title>
    <style>
      body {
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
        line-height: 1.6;
        color: #2d2d2d;
        background-color: #f3f4f6;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        text-align: center;
        padding: 40px 20px;
      }
      .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 26px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .logo img {
        height: 32px;
        width: auto;
        vertical-align: middle;
      }
      .logo-text {
        color: white;
      }
      .content {
        padding: 30px 25px;
      }
      h2 {
        margin-top: 0;
        font-size: 22px;
        color: #111827;
      }
      p {
        margin: 12px 0;
        font-size: 15px;
      }
      ul {
        padding-left: 18px;
        margin: 12px 0;
      }
      li {
        margin: 6px 0;
        font-size: 14px;
      }
      .button {
        display: inline-block;
        background: #2563eb;
        color: #ffffff;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        margin: 25px 0;
        transition: background 0.2s ease-in-out;
      }
      .button:hover {
        background: #1d4ed8;
      }
      .link-box {
        word-break: break-word;
        background: #f3f4f6;
        padding: 12px;
        border-radius: 6px;
        font-size: 13px;
        color: #1f2937;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #6b7280;
        background: #fafafa;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="${this.baseUrl}/logo.png" alt="CivicResolve Logo" />
          <span class="logo-text">CivicResolve</span>
        </div>
        <h1 style="margin:0;">Issue Status Update</h1>
      </div>
      <div class="content">
        <h2>Hi ${userName},</h2>
        ${statusMessage}
        <p><strong>Issue Details:</strong></p>
        <ul>
          <li><strong>ID:</strong> ${issueId}</li>
          <li><strong>title:</strong> ${issueTitle}</li>
          <li><strong>${isRemove ? "Previous Status" : "Status"}:</strong> ${issueStatus}</li>
        </ul>
        <div style="text-align: center;">
          <a href="${issueLink}" class="button">View Issue</a>
        </div>
        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <div class="link-box">${issueLink}</div>
        <p>
          Warm regards,<br />
          <strong>The CivicResolve Team</strong>
        </p>
      </div>
      <div class="footer">
        <p>© 2025 CivicResolve. All rights reserved.</p>
        <p>This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  }

  /**
   * HTML template for organization issue notification email
   */
  private getOrganizationIssueNotificationTemplate(
    userName: string, 
    issueId: number, 
    issueData: IssueData, 
    organizationName: string,
    issueLink: string
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Issue Assignment - CivicResolve</title>
      <style>
        body {
          font-family: 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #2d2d2d;
          background-color: #f3f4f6;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          text-align: center;
          padding: 40px 20px;
        }
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .logo img {
          height: 32px;
          width: auto;
          vertical-align: middle;
        }
        .logo-text {
          color: white;
        }
        .content {
          padding: 30px 25px;
        }
        h2 {
          margin-top: 0;
          font-size: 22px;
          color: #111827;
        }
        p {
          margin: 12px 0;
          font-size: 15px;
        }
        ul {
          padding-left: 18px;
          margin: 12px 0;
        }
        li {
          margin: 6px 0;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 25px 0;
          transition: background 0.2s ease-in-out;
        }
        .button:hover {
          background: #1d4ed8;
        }
        .link-box {
          word-break: break-word;
          background: #f3f4f6;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #1f2937;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #6b7280;
          background: #fafafa;
        }
        .issue-details {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .priority-high { background: #fee2e2; color: #dc2626; }
        .priority-urgent { background: #fecaca; color: #991b1b; }
        .priority-medium { background: #fef3c7; color: #d97706; }
        .priority-low { background: #d1fae5; color: #065f46; }
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: #dbeafe;
          color: #1e40af;
          margin-left: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="${this.baseUrl}/logo.png" alt="CivicResolve Logo" />
            <span class="logo-text">CivicResolve</span>
          </div>
          <h1 style="margin:0;">New Issue Assignment</h1>
        </div>
        <div class="content">
          <h2>Hi ${userName},</h2>
          <p>
            A new <strong>${issueData.category}</strong> issue has been reported and assigned to 
            <strong>${organizationName}</strong> for review and action.
          </p>
          
          <div class="issue-details">
            <h3 style="margin-top: 0; color: #1f2937;">Issue Details</h3>
            <p><strong>Title:</strong> ${issueData.title}</p>
            <p><strong>Description:</strong> ${issueData.description}</p>
            <p><strong>Location:</strong> ${issueData.address}</p>
            <p>
              <strong>Priority:</strong> 
              <span class="priority-badge priority-${issueData.priority.toLowerCase()}">${issueData.priority}</span>
              <span class="category-badge">${issueData.category}</span>
            </p>
            <p><strong>Issue ID:</strong> #${issueId}</p>
          </div>

          <p>
            Please review this issue and take appropriate action. You can view the full details, 
            update the status, and communicate with the reporter through the platform.
          </p>

          <div style="text-align: center;">
            <a href="${issueLink}" class="button">View Issue Details</a>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="link-box">${issueLink}</div>

          <p>
            <strong>Important:</strong> Citizens are counting on ${organizationName} to address 
            their concerns promptly. Please ensure timely action and status updates.
          </p>

          <p>
            Thank you for your service,<br />
            <strong>The CivicResolve Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>This notification was sent to ${organizationName} members.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * HTML template for assignment notification email
   */
  private getAssignmentNotificationTemplate(
    memberName: string,
    issueId: number,
    issueData: IssueData,
    assignedByName: string,
    organizationName: string,
    issueLink: string
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Issue Assigned to You - CivicResolve</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .assignment-alert {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .issue-details {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          background: #3b82f6;
          margin-bottom: 10px;
        }
        .cta-button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Issue Assigned to You</h1>
          <p style="margin:10px 0 0 0; opacity: 0.9;">CivicResolve Assignment Notification</p>
        </div>
        <div class="content">
          <p>Hello <strong>${memberName}</strong>,</p>
          
          <div class="assignment-alert">
            <strong>🎯 You have been assigned a new issue!</strong><br>
            <em>Assigned by ${assignedByName} from ${organizationName}</em>
          </div>
          
          <p>
            A new issue has been assigned to you by <strong>${assignedByName}</strong> 
            from your organization <strong>${organizationName}</strong>.
          </p>
          
          <div class="issue-details">
            <div class="category-badge">${issueData.category}</div>
            <h3 style="margin: 10px 0;">${issueData.title}</h3>
            <p><strong>Description:</strong> ${issueData.description}</p>
            <p><strong>Location:</strong> ${issueData.address}</p>
            <p><strong>Issue ID:</strong> #${issueId}</p>
          </div>
          
          <p>
            As the assigned member, you are now responsible for:
          </p>
          <ul>
            <li>Reviewing the issue details</li>
            <li>Updating the issue status as you work on it</li>
            <li>Communicating progress with the reporter and your organization</li>
            <li>Marking the issue as resolved when completed</li>
          </ul>
          
          <center>
            <a href="${issueLink}" class="cta-button">View Issue Details</a>
          </center>
          
          <p>
            You can also access this issue and all your assigned tasks from your 
            <a href="${this.baseUrl}/my-issues">My Issues dashboard</a>.
          </p>
          
          <p>
            Best regards,<br>
            <strong>The CivicResolve Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>This issue was assigned to you by ${assignedByName} from ${organizationName}.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * HTML template for organization welcome email
   */
  private getOrganizationWelcomeTemplate(
    userName: string,
    organizationName: string,
    role: string,
    assignedByName: string,
    dashboardLink: string
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to ${organizationName} - CivicResolve</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .welcome-alert {
          background: #d1fae5;
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .role-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          background: #10b981;
          margin: 10px 0;
        }
        .features-list {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎉 Welcome to ${organizationName}!</h1>
          <p style="margin:10px 0 0 0; opacity: 0.9;">You're now part of our civic engagement team</p>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <div class="welcome-alert">
            <strong>Welcome to the team!</strong><br>
            <em>You have been added to ${organizationName} by ${assignedByName}</em>
          </div>
          
          <p>
            Congratulations! You have been successfully added to <strong>${organizationName}</strong> 
            by <strong>${assignedByName}</strong>.
          </p>
          
          <center>
            <div class="role-badge">${role === 'ORGANIZATION_ADMIN' ? 'Organization Administrator' : 'Team Member'}</div>
          </center>
          
          <div class="features-list">
            <h3 style="margin-top: 0;">What you can do now:</h3>
            <ul>
              ${role === 'ORGANIZATION_ADMIN' ? `
              <li><strong>Manage team members</strong> - Add and assign roles to team members</li>
              <li><strong>Assign issues</strong> - Delegate issues to appropriate team members</li>
              <li><strong>View organization dashboard</strong> - Monitor all issues and team performance</li>
              ` : `
              <li><strong>View assigned issues</strong> - See all issues assigned specifically to you</li>
              <li><strong>Update issue status</strong> - Mark progress and completion of your tasks</li>
              <li><strong>Collaborate with team</strong> - Work with other organization members</li>
              `}
              <li><strong>Access organization insights</strong> - View statistics and trends for your area</li>
              <li><strong>Communicate with citizens</strong> - Respond to issue reports and provide updates</li>
            </ul>
          </div>
          
          <center>
            <a href="${dashboardLink}" class="cta-button">Access Your Dashboard</a>
          </center>
          
          <p>
            ${role === 'ORGANIZATION_ADMIN' 
              ? 'As an administrator, you have full access to manage your organization and assign issues to team members.' 
              : 'As a team member, you can view and manage issues assigned to you through your personal dashboard at /my-issues.'}
          </p>
          
          <p>
            If you have any questions about your role or how to use the platform, 
            don't hesitate to reach out to ${assignedByName} or consult our help documentation.
          </p>
          
          <p>
            Welcome aboard and thank you for your commitment to improving our community!
          </p>
          
          <p>
            Best regards,<br>
            <strong>The CivicResolve Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>You were added to ${organizationName} by ${assignedByName}.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * HTML template for status update notification email
   */
  private getStatusUpdateNotificationTemplate(
    reporterName: string,
    issueId: number,
    issueData: IssueData,
    oldStatus: string,
    newStatus: string,
    assignedMemberId: string | null,
    organizationName: string,
    updatedByEmployeeId: string | null,
    issueLink: string
  ): string {
    // Helper function to get status color
    const getStatusColor = (status: string) => {
      switch (status.toUpperCase()) {
        case 'PENDING': return '#f59e0b';
        case 'IN_PROGRESS': return '#3b82f6';
        case 'RESOLVED': return '#10b981';
        case 'REJECTED': return '#ef4444';
        case 'REMOVED': return '#6b7280';
        default: return '#6b7280';
      }
    };

    // Helper function to get status display name
    const getStatusDisplay = (status: string) => {
      switch (status.toUpperCase()) {
        case 'IN_PROGRESS': return 'In Progress';
        case 'RESOLVED': return 'Resolved';
        case 'REJECTED': return 'Rejected';
        case 'REMOVED': return 'Removed';
        case 'PENDING': return 'Pending';
        default: return status;
      }
    };

    const oldStatusColor = getStatusColor(oldStatus);
    const newStatusColor = getStatusColor(newStatus);
    const oldStatusDisplay = getStatusDisplay(oldStatus);
    const newStatusDisplay = getStatusDisplay(newStatus);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Issue Update - ${issueData.title} - CivicResolve</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .status-update-alert {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .status-change {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 15px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        .arrow {
          font-size: 18px;
          color: #6b7280;
        }
        .issue-details {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .assignment-info {
          background: #ecfdf5;
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          background: #3b82f6;
          margin-bottom: 10px;
        }
        .cta-button {
          display: inline-block;
          background: #8b5cf6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
        .progress-info {
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">📋 Issue Status Update</h1>
          <p style="margin:10px 0 0 0; opacity: 0.9;">Your reported issue has been updated</p>
        </div>
        <div class="content">
          <p>Hello <strong>${reporterName}</strong>,</p>
          
          <div class="status-update-alert">
            <strong>🔄 Status Update for Your Issue</strong><br>
            <em>Updated by Employee #${updatedByEmployeeId || 'System'} from ${organizationName}</em>
            
            <div class="status-change">
              <span class="status-badge" style="background-color: ${oldStatusColor};">${oldStatusDisplay}</span>
              <span class="arrow">→</span>
              <span class="status-badge" style="background-color: ${newStatusColor};">${newStatusDisplay}</span>
            </div>
          </div>
          
          <p>
            Great news! There's been an update on the issue you reported. 
            <strong>Employee #${updatedByEmployeeId || 'System'}</strong> from <strong>${organizationName}</strong> 
            has changed the status from <strong>${oldStatusDisplay}</strong> to <strong>${newStatusDisplay}</strong>.
          </p>
          
          <div class="issue-details">
            <div class="category-badge">${issueData.category}</div>
            <h3 style="margin: 10px 0;">${issueData.title}</h3>
            <p><strong>Description:</strong> ${issueData.description}</p>
            <p><strong>Location:</strong> ${issueData.address}</p>
            <p><strong>Issue ID:</strong> #${issueId}</p>
          </div>
          
          ${assignedMemberId ? `
          <div class="assignment-info">
            <h4 style="margin: 0 0 10px 0; color: #059669;">👤 Assigned Team Member</h4>
            <p style="margin: 0;">
              <strong>Employee #${assignedMemberId}</strong> from ${organizationName} is working on your issue.
            </p>
          </div>
          ` : ''}
          
          ${newStatus.toUpperCase() === 'IN_PROGRESS' ? `
          <div class="progress-info">
            <h4 style="margin: 0 0 10px 0; color: #1d4ed8;">🚧 Work in Progress</h4>
            <p style="margin: 0;">
              Your issue is now being actively worked on. You can expect regular updates 
              as progress is made toward resolution.
            </p>
          </div>
          ` : ''}
          
          ${newStatus.toUpperCase() === 'RESOLVED' ? `
          <div class="progress-info" style="background: #d1fae5; border-color: #10b981;">
            <h4 style="margin: 0 0 10px 0; color: #059669;">✅ Issue Resolved</h4>
            <p style="margin: 0;">
              Congratulations! Your issue has been marked as resolved. 
              Thank you for helping improve our community by reporting this issue.
            </p>
          </div>
          ` : ''}
          
          <center>
            <a href="${issueLink}" class="cta-button">View Issue Details</a>
          </center>
          
          <p>
            <strong>What this means:</strong>
          </p>
          <ul>
            ${newStatus.toUpperCase() === 'PENDING' ? '<li>Your issue has been received and is waiting for assignment</li>' : ''}
            ${newStatus.toUpperCase() === 'IN_PROGRESS' ? '<li>Work has begun on resolving your issue</li><li>You may see activity in your area related to this issue</li><li>Regular updates will be provided as work progresses</li>' : ''}
            ${newStatus.toUpperCase() === 'RESOLVED' ? '<li>The issue has been fixed and is complete</li><li>You can verify the resolution by visiting the location</li><li>The issue is now closed</li>' : ''}
            ${newStatus.toUpperCase() === 'REJECTED' ? '<li>After review, this issue could not be processed</li><li>This may be due to insufficient information or other factors</li><li>You can contact us for more information</li>' : ''}
          </ul>
          
          <p>
            You can track the progress of this and other issues you've reported by visiting your 
            <a href="${this.baseUrl}/profile">profile page</a> or by bookmarking the issue link above.
          </p>
          
          <p>
            Thank you for your patience and for helping improve our community through CivicResolve.
          </p>
          
          <p>
            Best regards,<br>
            <strong>The CivicResolve Team</strong><br>
            <em>On behalf of ${organizationName}</em>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CivicResolve. All rights reserved.</p>
          <p>Status updated by Employee #${updatedByEmployeeId || 'System'} from ${organizationName}.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

}

export const emailService = new EmailService();