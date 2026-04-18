const nodemailer = require('nodemailer');
const path = require('path');

/**
 * Transportador SMTP configurado desde variables de entorno.
 * Para Gmail, usar una "Contraseña de aplicación":
 *   https://myaccount.google.com/apppasswords
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Ruta absoluta a la carpeta de imágenes públicas del frontend.
 * Ajusta esta ruta si la estructura de tu proyecto cambia.
 */
const IMAGES_DIR = path.resolve(
  __dirname,
  '../../../presentacion/public/images'
);

/**
 * Envía la contraseña temporal al correo del trabajador.
 * @param {string} destinatario   Correo del trabajador
 * @param {string} nombre         Nombre del trabajador
 * @param {string} contrasenaTemp Contraseña temporal en texto plano
 */
async function enviarContrasenaTemp(destinatario, nombre, contrasenaTemp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Baldrium Group S.A.S" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: '🔑 Recuperación de contraseña — Baldrium Group S.A.S',

    // ── Adjunto inline: el logo se referencia en el HTML como cid:logo_baldrium ──
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(IMAGES_DIR, 'logo.png'), // cambia el nombre si tu archivo tiene otro nombre
        cid: 'logo_baldrium',                    // Content-ID para usar en el <img src="cid:...">
      },
    ],

    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recuperación de contraseña</title>
</head>
<body style="margin:0; padding:0; background:#061427; font-family:'Segoe UI', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#061427; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="background:#0d1e33; border:1px solid #1d3758;
                      border-radius:16px; overflow:hidden;
                      box-shadow:0 8px 32px rgba(0,0,0,0.5);">

          <!-- ══════════════ HEADER ══════════════ -->
          <tr>
            <td style="background:linear-gradient(135deg, #061427 0%, #1d3758 100%);
                        padding:36px 40px; text-align:center;
                        border-bottom:3px solid #cabc93;">

              <!-- Logo incrustado como adjunto inline -->
              <img src="cid:logo_baldrium"
                   alt="Baldrium Group S.A.S"
                   width="180"
                   style="display:block; margin:0 auto; max-width:180px;"/>
            </td>
          </tr>

          <!-- ══════════════ CUERPO ══════════════ -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 14px; color:#a8b8cc; font-size:14px; line-height:1.6;">
                Hola, <strong style="color:#ffffff;">${nombre}</strong>
              </p>

              <p style="margin:0 0 28px; color:#a8b8cc; font-size:14px; line-height:1.7;">
                Recibimos una solicitud de recuperación de contraseña para tu cuenta.
                Usa la siguiente <strong style="color:#cabc93;">contraseña temporal</strong>
                para ingresar al sistema:
              </p>

              <!-- ── Caja de contraseña ── -->
              <div style="background:#061427; border:1px dashed #cabc93;
                           border-radius:12px; padding:28px 20px; text-align:center;
                           margin-bottom:28px;">
                <p style="margin:0 0 10px; color:#6e8099; font-size:11px;
                            text-transform:uppercase; letter-spacing:2px;">
                  Contraseña temporal
                </p>
                <span style="font-family:'Courier New', monospace; font-size:28px;
                              font-weight:700; color:#cabc93; letter-spacing:6px;">
                  ${contrasenaTemp}
                </span>
              </div>

              <!-- ── Aviso de seguridad ── -->
              <div style="background:rgba(202,188,147,0.08); border:1px solid rgba(202,188,147,0.35);
                           border-radius:10px; padding:16px 20px; margin-bottom:28px;">
                <p style="margin:0; color:#cabc93; font-size:13px; line-height:1.6;">
                  ⚠️ <strong>Importante:</strong> Esta contraseña es de un solo uso.
                  Por seguridad, cámbiala inmediatamente después de iniciar sesión.
                </p>
              </div>

              <p style="margin:0; color:#4a6070; font-size:12px; line-height:1.7;">
                Si no solicitaste este cambio, puedes ignorar este correo.
                Tu contraseña sera esta temporal hasta que ingreses al sistema y la cambies.
              </p>
            </td>
          </tr>

          <!-- ══════════════ SEPARADOR DORADO ══════════════ -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px; background:linear-gradient(90deg, transparent, #cabc93, transparent);"></div>
            </td>
          </tr>

          <!-- ══════════════ FOOTER ══════════════ -->
          <tr>
            <td style="background:#061427; padding:20px 40px; text-align:center;">
              <p style="margin:0 0 4px; color:#2e4a63; font-size:11px; letter-spacing:1px;">
                © 2026 <span style="color:#cabc93;">Baldrium Group S.A.S</span> — Sistema interno.
              </p>
              <p style="margin:0; color:#2e4a63; font-size:10px;">
                No responder a este correo.
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
}

module.exports = { enviarContrasenaTemp };