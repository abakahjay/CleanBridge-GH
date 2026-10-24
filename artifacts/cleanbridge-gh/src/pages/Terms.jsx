import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Logo, WhatsAppIcon } from '../components/ui.jsx';
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

// Public terms of use - linked from sign-up next to the age and terms checkbox.
const UPDATED = '24 October 2026';

export default function Terms() {
  return <div className="legal-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Home</Link></header>
    <article className="legal panel">
      <h1>Terms of use</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>These terms apply when you use CleanBridge GH on the web, Android, Windows or as an installed app. By creating an account you agree to them and to our <Link href="/privacy">privacy policy</Link>.</p>

      <h2>Who can use it</h2>
      <p>You must be <strong>16 or older</strong> to create an account. We do not knowingly collect data from younger people; if you believe a child has an account, contact us and we will delete it.</p>

      <h2>Pickups and payments</h2>
      <ul>
        <li>The price of a pickup is shown before you book and is fixed when you book. Taxes are Ghana VAT and levies.</li>
        <li>Online payments are processed by Paystack. Cash pickups are paid to the collector at your gate.</li>
        <li>Cancel a pickup from its page before the collector is on the way.</li>
      </ul>

      <h2>Weekly and monthly plans</h2>
      <ul>
        <li>A plan books a visit every week or every month <strong>until you pause or cancel it</strong> in <strong>My plans</strong>. Cancelling takes effect at once and no further visits are booked.</li>
        <li>You are <strong>not charged automatically</strong>. Each visit is priced when it is booked and paid separately, online or in cash; we remind you before each one.</li>
      </ul>

      <h2>Your account and content</h2>
      <ul>
        <li>Keep your password private and give accurate details, so collectors can find and reach you.</li>
        <li>Only upload a profile photo that you took or have the right to use. Don’t upload anything unlawful, offensive or that copies someone else’s work.</li>
        <li>Don’t misuse the service: no false bookings, harassment of collectors or customers, or attempts to access other people’s data.</li>
      </ul>

      <h2>Copyright complaints</h2>
      <p>If you believe a photo on CleanBridge GH infringes your copyright, send us: the photo (or the account it appears on), the work you own, your contact details, and a statement that you believe in good faith the use is not authorised. We remove infringing photos promptly and close the accounts of repeat infringers.</p>

      <h2>Changes and ending</h2>
      <p>We may update these terms; the date above shows the latest version, and we tell you in the app about important changes. You can delete your account at any time in <strong>Profile → Delete account</strong>. We may suspend accounts that break these terms.</p>

      <h2>Contact</h2>
      <p><a href={whatsappLink('Hello CleanBridge GH, I have a question about the terms.')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp {WHATSAPP_DISPLAY}</a>, or reply to any CleanBridge email.</p>
    </article>
  </div>;
}
