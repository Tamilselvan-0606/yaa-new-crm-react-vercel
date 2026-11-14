import { Font } from '@react-pdf/renderer';
// "?inline" embeds the font in the app bundle as a data URI, so printing makes no network request for it.
import regularFont from '../../../assets/fonts/NotoSans-Regular.ttf?inline';
import boldFont from '../../../assets/fonts/NotoSans-Bold.ttf?inline';

// The built-in PDF fonts (Helvetica) have no ₹ glyph, so "₹" prints as "¹". Noto Sans includes it.
let registered = false;
export const registerPdfFonts = () => {
  if (registered) return;
  registered = true;
  Font.register({ family: 'NotoSans', src: regularFont });
  Font.register({ family: 'NotoSans-Bold', src: boldFont });
};

registerPdfFonts();

export const PDF_FONT = 'NotoSans';
export const PDF_FONT_BOLD = 'NotoSans-Bold';
