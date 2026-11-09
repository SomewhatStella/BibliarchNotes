import type {ReactNode} from 'react';
import '../app/home.css';
import '../app/seo.css';

export const SITE_URL = 'https://bibliarch.com';

export const GUIDES = [
  {href: '/note-taking-app', label: 'Visual note-taking app'},
  {href: '/book-creator', label: 'Online book creator'},
  {href: '/oc-tools', label: 'OC tools'},
  {href: '/oc-tools/things-to-do-with-your-ocs', label: 'Things to do with your OCs'},
  {href: '/oc-tools/oc-profile-template', label: 'OC profile template'},
  {href: '/about', label: 'About Bibliarch'},
  {href: '/donate', label: 'Donate'},
];

export function JsonLd({data}: {data: object}) {
  // "<" is escaped so text in the data can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(data).replace(/</g, '\\u003c')}} />;
}

export function SiteLinks() {
  return (
    <nav className="seo-site-links" aria-label="Guides">
      {GUIDES.map(g => <a key={g.href} href={g.href}>{g.label}</a>)}
    </nav>
  );
}

export type Faq = {q: string; a: string};

export default function SeoPage({path, name, kicker, title, lead, cta, faqs, children}: {
  path: string; name: string; kicker: string; title: string; lead: string;
  cta: {href: string; label: string}[]; faqs?: Faq[]; children: ReactNode;
}) {
  const crumbs = [{name: 'Home', path: '/'}, ...(path.startsWith('/oc-tools/') ? [{name: 'OC tools', path: '/oc-tools'}] : []), {name, path}];
  return (
    <main className="site-home welcome-home seo-page">
      <JsonLd data={{'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, item: SITE_URL + c.path}))}} />
      {faqs && <JsonLd data={{'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({'@type': 'Question', name: f.q, acceptedAnswer: {'@type': 'Answer', text: f.a}}))}} />}
      <article className="seo-article">
        <nav className="seo-crumbs" aria-label="Breadcrumb">
          {crumbs.slice(0, -1).map(c => <span key={c.path}><a href={c.path}>{c.name}</a> / </span>)}<span aria-current="page">{name}</span>
        </nav>
        <p className="welcome-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="seo-lead">{lead}</p>
        <div className="welcome-actions seo-actions">
          {cta.map((c, i) => <a key={c.href} className={`welcome-button${i === 0 ? ' welcome-button-primary' : ''}`} href={c.href} {...(c.href.startsWith('http') ? {target: '_blank', rel: 'noreferrer noopener'} : {})}>{c.label} <span aria-hidden="true">→</span></a>)}
        </div>
        {children}
        {faqs && (
          <section aria-labelledby="faq-title">
            <h2 id="faq-title">Common questions</h2>
            <dl className="seo-faq">
              {faqs.map(f => <div key={f.q}><dt>{f.q}</dt><dd>{f.a}</dd></div>)}
            </dl>
          </section>
        )}
        <footer className="seo-footer">
          <a href="/" className="welcome-footer-brand">Bibliarch</a>
          <SiteLinks />
        </footer>
      </article>
    </main>
  );
}
