import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function testSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'Sheet1!A1:A1'
    });

    console.log('✅ Success! Connected to Google Sheet');
    console.log('Sheet data:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSheets();