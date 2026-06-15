import { NextResponse } from 'next/server';
import { getSheetsInstance } from '@/lib/googleSheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');

    if (!range) {
      return NextResponse.json({ error: 'Range parameter is required (e.g. Categorias!A:D)' }, { status: 400 });
    }

    const sheets = getSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
    });

    // Google Sheets devuelve response.data.values como un array de arrays
    const rows = response.data.values || [];

    // Si está vacío
    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Opcional: Convertir el array de arrays en array de objetos usando la primera fila como llaves (headers)
    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching data from Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { range, values } = body;

    if (!range || !values) {
      return NextResponse.json({ error: 'Range and values are required' }, { status: 400 });
    }

    const sheets = getSheetsInstance();
    
    // Append agrega una nueva fila al final de los datos en el rango dado
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED', // Para que Sheets lo interprete como si un usuario lo escribiera
      requestBody: {
        values: [values],
      },
    });

    return NextResponse.json({ success: true, updatedRange: response.data.updates?.updatedRange });
  } catch (error: any) {
    console.error('Error writing to Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { range, values } = body;

    if (!range || !values) {
      return NextResponse.json({ error: 'Range and values are required' }, { status: 400 });
    }

    const sheets = getSheetsInstance();
    
    // Update reemplaza los datos en el rango exacto proporcionado
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return NextResponse.json({ success: true, updatedRange: response.data.updatedRange });
  } catch (error: any) {
    console.error('Error updating Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');

    if (!range) {
      return NextResponse.json({ error: 'Range parameter is required' }, { status: 400 });
    }

    const sheets = getSheetsInstance();
    
    // Clear elimina los datos en el rango especificado (útil para el Factory Reset)
    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
    });

    return NextResponse.json({ success: true, clearedRange: response.data.clearedRange });
  } catch (error: any) {
    console.error('Error clearing Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
