// Public contact links shown across the app.
export const PORTFOLIO_URL = 'https://portfolio-8jmo.onrender.com/';
export const AUTHOR_NAME = 'Abakah Joshua';

// WhatsApp click-to-chat: 0532900914 in international format, no "+" or leading 0.
export const WHATSAPP_NUMBER = '233532900914';
export const WHATSAPP_DISPLAY = '053 290 0914';
export const whatsappLink = (text = 'Hello CleanBridge GH, I need help with') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
