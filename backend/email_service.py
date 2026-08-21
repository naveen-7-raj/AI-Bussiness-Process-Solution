import os
import logging
import json
import smtplib
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nexora.email")

EMAIL_API_KEY = os.getenv("EMAIL_API_KEY") or os.getenv("SMTP_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM_EMAIL") or "onboarding@resend.dev"
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "NEXORA")
COMPANY_ALERT_EMAIL = os.getenv("COMPANY_ALERT_EMAIL") or os.getenv("SMTP_FROM_EMAIL")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.resend.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "resend")

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Minimal reusable email dispatch service for NEXORA.
    Supports transactional API (Resend) and SMTP fallback.
    Returns True if successfully sent/queued, False on error. Never raises.
    """
    if not to_email:
        logger.warning("[EmailService] No recipient address provided.")
        return False

    sender_address = EMAIL_FROM if "@" in EMAIL_FROM else "onboarding@resend.dev"
    formatted_from = f"{EMAIL_FROM_NAME} <{sender_address}>"

    # Strategy 1: Resend HTTP API (if EMAIL_API_KEY starts with 're_')
    if EMAIL_API_KEY and EMAIL_API_KEY.startswith("re_"):
        try:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {EMAIL_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "from": formatted_from,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                payload["text"] = text_content

            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    logger.info(f"[EmailService] Resend API successfully sent email to {to_email}")
                    return True
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            logger.error(f"[EmailService] Resend API HTTP error {he.code}: {err_body}")
        except Exception as ex:
            logger.error(f"[EmailService] Resend API request failed: {ex}")

    # Strategy 2: Standard SMTP Fallback
    if EMAIL_API_KEY:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formatted_from
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            if html_content:
                msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, EMAIL_API_KEY)
                server.sendmail(sender_address, [to_email], msg.as_string())
                logger.info(f"[EmailService] SMTP successfully sent email to {to_email}")
                return True
        except Exception as e:
            logger.error(f"[EmailService] SMTP delivery failed: {e}")

    logger.warning(f"[EmailService] Could not send email to {to_email}. API key missing or transport failed.")
    return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing NEXORA Email Service...")
    test_target = COMPANY_ALERT_EMAIL or "naveenramu161@gmail.com"
    success = send_email(
        to_email=test_target,
        subject="NEXORA — Email Infrastructure Initialization Test",
        html_content="<h2>NEXORA AI-BPI Email Service Active</h2><p>Transactional email pipeline initialized successfully.</p>",
        text_content="NEXORA AI-BPI Email Service Active"
    )
    print(f"Test Email Result: {'SUCCESS' if success else 'FAILED / DISPATCH LOGGED'}")
