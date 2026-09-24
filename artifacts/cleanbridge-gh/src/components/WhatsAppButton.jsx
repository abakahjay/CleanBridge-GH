import { WhatsAppIcon } from './ui.jsx';
import { whatsappLink, WHATSAPP_DISPLAY } from '../lib/contact.js';

// Floating click-to-chat button, shown on every page.
export default function WhatsAppButton() {
  return <a className="wa-float" href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label={`Chat with CleanBridge on WhatsApp (${WHATSAPP_DISPLAY})`} title="Chat with us on WhatsApp" data-testid="link-whatsapp">
    <WhatsAppIcon size={26} />
  </a>;
}
