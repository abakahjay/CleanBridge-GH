import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Logo, WhatsAppIcon } from '../components/ui.jsx';
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

// Public privacy policy - linked from the stores (Google Play / App Store
// require one because the app uses location and accounts).
const UPDATED = '24 September 2026';

export default function Privacy() {
  return <div className="legal-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Home</Link></header>
    <article className="legal panel">
      <h1>Privacy policy</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>CleanBridge GH (“we”) helps households in Ghana book waste pickups and helps collectors find and complete them. This policy explains what we collect, why, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, mobile number and, if you choose, a profile photo. If you sign in with Google we receive your name, email and Google profile photo.</li>
        <li><strong>Location:</strong> the pickup location you choose on the map. With your permission, the app can detect your current location to fill this in. Collectors who are on duty share their live location so customers can see them approaching; this stops when they go off duty.</li>
        <li><strong>Pickup details:</strong> address, GhanaPost GPS (optional), gate notes, waste type, quantity, date and time.</li>
        <li><strong>Payments:</strong> online payments are processed by Paystack. We never see or store your card number or Mobile Money PIN — we only keep the payment status, amount, method and reference.</li>
        <li><strong>Collectors:</strong> vehicle details and the Mobile Money number used for payouts.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To price, schedule and complete pickups, and to show your collector’s position and arrival time.</li>
        <li>To let customers and collectors reach each other by phone for an active pickup.</li>
        <li>To send you updates about your pickups, payments and payouts in the app and by email (you can turn email off in your profile or with the link in any email).</li>
        <li>To pay collectors and keep financial records.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only what is needed to run the service: the collector handling your pickup (your name, address, gate note and phone), and service providers that host or process data for us — Render (hosting), MongoDB (database), Paystack (payments), Google (sign-in and email delivery), ImageKit (profile photos) and OpenStreetMap-based search services (address search). We do not sell your data.</p>

      <h2>Deleting your account</h2>
      <p>You can delete your account at any time in the app: <strong>Profile → Delete account</strong>. This removes your personal details, photo, vehicle and notifications. Completed pickup and payout records are kept for accounting, with your name and phone number removed. You can also ask us to delete your account by WhatsApp.</p>

      <h2>Security and retention</h2>
      <p>Passwords are stored hashed, connections use HTTPS, and access to operations tools is limited to authorised staff. We keep account data while your account is active and financial records as long as the law requires.</p>

      <h2>Children</h2>
      <p>CleanBridge GH is not intended for children under 13.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={whatsappLink('Hello CleanBridge GH, I have a privacy question.')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp {WHATSAPP_DISPLAY}</a>, or reply to any CleanBridge email.</p>
    </article>
  </div>;
}
