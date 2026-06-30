/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from "nodemailer";

/**
 * Génère un code OTP à 6 chiffres
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Crée le transporteur Gmail SMTP
 */
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans les variables d'environnement."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/**
 * Envoie le code OTP par email Gmail
 */
export async function sendOTPByEmail(
  toEmail: string,
  otp: string,
  restaurantName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();
    const now = new Date().toLocaleString("fr-FR", {
      timeZone: "Africa/Lubumbashi",
    });

    const mailOptions = {
      from: `"SmartResto Security" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `🔐 Votre code de connexion SmartResto : ${otp}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Code OTP SmartResto</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222;border-radius:24px;overflow:hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#18181b,#111);padding:32px 40px;text-align:center;border-bottom:1px solid #222;">
                      <div style="display:inline-block;background:#f59e0b;border-radius:16px;padding:14px 18px;margin-bottom:16px;">
                        <span style="font-size:28px;">🛡️</span>
                      </div>
                      <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;letter-spacing:-0.5px;">
                        SmartResto <span style="color:#f59e0b;">Manager</span>
                      </h1>
                      <p style="color:#71717a;font-size:12px;margin:6px 0 0;text-transform:uppercase;letter-spacing:2px;">
                        Vérification d'identité
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;line-height:1.6;">
                        Bonjour${restaurantName ? ` <strong style="color:#fff;">${restaurantName}</strong>` : ""},<br/>
                        Une tentative de connexion au panel administrateur a été détectée.<br/>
                        Voici votre code de sécurité à usage unique :
                      </p>

                      <!-- OTP Box -->
                      <div style="text-align:center;margin:32px 0;">
                        <div style="display:inline-block;background:#18181b;border:2px solid #f59e0b;border-radius:20px;padding:24px 48px;">
                          <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#f59e0b;font-family:'Courier New',monospace;">
                            ${otp}
                          </span>
                        </div>
                        <p style="color:#52525b;font-size:11px;margin:12px 0 0;text-transform:uppercase;letter-spacing:1px;">
                          ⏱️ Valide pendant <strong style="color:#f59e0b;">10 minutes</strong>
                        </p>
                      </div>

                      <!-- Warning -->
                      <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:12px;padding:16px;margin:24px 0;">
                        <p style="color:#fca5a5;font-size:12px;margin:0;line-height:1.5;">
                          ⚠️ <strong>Sécurité :</strong> Si vous n'êtes pas à l'origine de cette tentative de connexion, 
                          ignorez cet email. Votre compte reste sécurisé.
                        </p>
                      </div>

                      <!-- Meta -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                        <tr>
                          <td style="background:#18181b;border-radius:12px;padding:16px;">
                            <p style="color:#52525b;font-size:11px;margin:0;line-height:1.8;">
                              🕐 Horodatage : <span style="color:#a1a1aa;">${now}</span><br/>
                              📧 Destinataire : <span style="color:#a1a1aa;">${toEmail}</span><br/>
                              🔒 Usage unique — Ne jamais partager ce code
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#0d0d0d;padding:20px 40px;text-align:center;border-top:1px solid #1a1a1a;">
                      <p style="color:#3f3f46;font-size:10px;margin:0;text-transform:uppercase;letter-spacing:1.5px;">
                        SmartResto Intelligent System — Plateforme SaaS sécurisée
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error("[OTP Email Error]:", error?.message);
    return { success: false, error: error?.message || "Erreur d'envoi email." };
  }
}
