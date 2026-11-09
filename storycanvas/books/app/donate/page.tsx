import type {Metadata} from 'next';
import SeoPage from '../../src/SeoPage';

const path = '/donate';
const DONATE_URL = 'https://pay.zaprite.com/pl_mTYYPoOo2S';
const description = 'Bibliarch is free for everyone. If it helps your stories, a donation keeps it growing and helps pay to keep the site running.';
export const metadata: Metadata = {title: 'Donate to Bibliarch', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Donate to Bibliarch', description, url: path}};

export default function Page() {
  return (
    <SeoPage path={path} name="Donate" kicker="Support Bibliarch" title="Help keep Bibliarch free" lead="Bibliarch is free for everyone. If it helps your stories, a donation keeps it growing." cta={[{href: DONATE_URL, label: 'Donate'}]}>
      <p className="seo-donate-note">Secure payment via Zaprite. Opens in a new tab.</p>
      <section>
        <h2>Where it goes</h2>
        <p>Donations help pay to keep the site running and make time to keep building it. Every tool stays free whether you donate or not, and donating doesn’t change what you can use.</p>
        <p>Can’t donate? <a href="/oc-tools">Telling a friend who writes or makes OCs</a> helps just as much.</p>
      </section>
    </SeoPage>
  );
}
