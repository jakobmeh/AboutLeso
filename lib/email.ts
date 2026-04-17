import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

export async function sendVerificationEmail(email: string, code: string) {
  const info = await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: email,
    subject: "Potrdite vaš email — Leso",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LESO</h2>
        <p style="color: #555;">Hvala za registracijo. Za potrditev emaila vnesite spodnjo kodo:</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1c1c1c;">
            ${code}
          </span>
        </div>
        <p style="color: #999; font-size: 13px;">Koda velja 15 minut. Če niste vi zahtevali registracije, ignorirajte ta email.</p>
      </div>
    `,
  });
  console.log("✉️ Verification email sent:", info.messageId, "response:", info.response);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: email,
    subject: "Ponastavitev gesla — Leso",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LESO</h2>
        <p style="color: #555;">Prejeli smo zahtevo za ponastavitev gesla za vaš račun.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #1c1c1c; color: white; padding: 14px 32px; text-decoration: none;
                    font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">
            Ponastavi geslo
          </a>
        </div>
        <p style="color: #999; font-size: 13px;">Povezava velja 1 uro. Če niste vi zahtevali ponastavitve, ignorirajte ta email.</p>
      </div>
    `,
  });
}
