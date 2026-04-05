import { Resend } from 'resend';

export const sendRegistrationEmail = async (env: any, data: {
  email: string;
  firstName: string;
  lastName: string;
  raceName: string;
  bibNumber: number | string;
  distance: string;
  paymentMethod: string;
}) => {
  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is missing. Email will not be sent.');
    return null;
  }

  const resend = new Resend(resendApiKey);

  const { email, firstName, lastName, raceName, bibNumber, distance, paymentMethod } = data;

  try {
    const response = await resend.emails.send({
      from: 'Carreras Stryd Panama <carreras@strydpanama.com>',
      to: [email],
      bcc: ['carreras@strydpanama.com'],
      subject: `Confirmación de Registro: ${raceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #FF6B00; margin: 0; font-size: 24px;">STRYD PANAMA</h1>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">CONFIRMACIÓN DE REGISTRO</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #333333; margin-top: 0;">¡Hola ${firstName}!</h2>
            <p style="color: #555555; line-height: 1.6;">
              Te has registrado exitosamente para la carrera <strong>${raceName}</strong>. 
              Estamos muy emocionados de tenerte con nosotros.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #777777;">Dorsal Asignado:</td>
                  <td style="padding: 8px 0; color: #FF6B00; font-weight: bold; font-size: 18px;">#${bibNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777777;">Distancia:</td>
                  <td style="padding: 8px 0; color: #333333; font-weight: bold;">${distance}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777777;">Método de Pago:</td>
                  <td style="padding: 8px 0; color: #333333; font-weight: bold;">${paymentMethod}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #555555; line-height: 1.6;">
              Si seleccionaste <strong>Yappy</strong>, recibirás o ya has recibido el enlace de pago. 
              Si es <strong>Transferencia</strong>, recuerda que tu cupo se confirma una vez validado el comprobante.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://carreras.strydpanama.com/mis-inscripciones" style="background-color: #FF6B00; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                VER MI INSCRIPCIÓN
              </a>
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #999999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} STRYD Panama. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Error sending email with Resend:', error);
    throw error;
  }
};
