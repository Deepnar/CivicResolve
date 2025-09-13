import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  service: string;
  user: string;
  pass: string;
}

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
                    ? 'https://dev.raunakcodes.me' 
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
}

export const emailService = new EmailService();