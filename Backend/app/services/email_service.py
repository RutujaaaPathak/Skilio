from email.mime.text import MIMEText
import smtplib

from app.core.config import settings


class EmailService:
    @staticmethod
    def verify_config() -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            return False
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                return True
        except Exception:
            return False

    @staticmethod
    def send(to: str, subject: str, html_body: str) -> None:
        if settings.SMTP_HOST and settings.SMTP_USER:
            msg = MIMEText(html_body, "html")
            msg["Subject"] = subject
            msg["To"] = to
            msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                server.send_message(msg)
        else:
            print(f"\n{'='*60}")
            print(f"EMAIL TO: {to}")
            print(f"SUBJECT: {subject}")
            print(f"{'='*60}")
            print(html_body)
            print(f"{'='*60}\n")

    @staticmethod
    def send_password_reset(email: str, token: str) -> None:
        link = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
        body = f"""
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="{link}">{link}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        """
        EmailService.send(email, "Skillo - Password Reset", body)

    @staticmethod
    def send_verification(email: str, otp: str) -> None:
        body = f"""
        <h2>Verify Your Email</h2>
        <p>Use the following OTP to verify your email address:</p>
        <div style="font-size:32px; font-weight:bold; letter-spacing:8px; text-align:center; padding:16px; background:#f0f0f0; border-radius:8px; margin:16px 0;">{otp}</div>
        <p>This OTP expires in 24 hours.</p>
        """
        EmailService.send(email, "Skillo - Email Verification", body)