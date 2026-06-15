import { google } from 'googleapis';

export const getSheetsInstance = () => {
  // Manejo de la llave privada para asegurar que los saltos de línea se lean correctamente en el servidor
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  return google.sheets({ version: 'v4', auth });
};
