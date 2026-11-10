import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../src/SeoPage';

const path = '/oc-tools';
const description = 'Free tools for your original characters. Keep every OC in one place with profile boards, relationship maps and reference images, then put them in a real book.';
export const metadata: Metadata = {title: 'Free OC Tools: Organize Your Original Characters', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Free OC Tools for Original Characters — Bibliarch', description, url: path}};

const faqs: Faq[] = [
  {q: 'What does OC mean?', a: 'OC stands for original character: a character you made up yourself, whether for a story, a fandom, art, or just for fun.'},
  {q: 'Is there a free place to keep all my OCs?', a: 'Yes. Bibliarch Notes is free. Each character gets a card on your board that opens into their own profile, with room for details, backstory and images.'},
  {q: 'Can I map how my OCs know each other?', a: 'Yes. A relationship map lets you pick characters and describe how each one feels about another. It works in both directions, since two characters rarely feel the same way about each other.'},
  {q: 'Can I share my OCs with friends?', a: 'Yes. You can invite friends by username or email, or share a link, as an editor or a viewer. That’s handy for shared worlds and collaborative stories.'},
  {q: 'Can I make a real book about my OCs?', a: 'Yes. Bibliarch Books lets you write and design a story, a character guide or an art book, then download it as a PDF or EPUB, or get it ready to print.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="OC tools" kicker="For original characters" title="Free tools for your OCs" lead="A home for your original characters. Keep their details, art and relationships in one place, work out how they connect, and turn them into a real story." cta={[{href: '/notes/dashboard', label: 'Add your first OC'}, {href: '/oc-tools/things-to-do-with-your-ocs', label: 'Things to do with your OCs'}]} faqs={faqs}>
      <section>
        <h2>Everything about your OC, in one place</h2>
        <p>OC details tend to end up scattered across phone notes, old documents and a folder of screenshots. In Bibliarch, every character has a card on your board. Open the card and you get a whole board just for them.</p>
        <ul className="seo-features">
          <li><strong>Profile boards</strong>Details, backstory, motivations and anything else you want to track.</li>
          <li><strong>Relationship maps</strong>Who loves who, who hates who, and whether it’s mutual.</li>
          <li><strong>Reference images</strong>Keep art, outfits and mood boards next to the character.</li>
          <li><strong>Worlds to put them in</strong>Locations, events and folders for the world around them.</li>
          <li><strong>Shared boards</strong>Build a world with friends, live.</li>
          <li><strong>Real books</strong>Turn their story or a character guide into a PDF or printed book.</li>
        </ul>
      </section>
      <section>
        <h2>Start here</h2>
        <h3><a href="/oc-tools/oc-profile-template">OC profile template</a></h3>
        <p>A free list of questions to fill in for any character, from the basics to their worst secret.</p>
        <h3><a href="/oc-tools/things-to-do-with-your-ocs">Things to do with your OCs</a></h3>
        <p>Everything you can do with your characters here, from taking notes on them to mapping who they know.</p>
        <h3><a href="/book-creator">Make a book about your OCs</a></h3>
        <p>Write their story, or make a character guide, and download it as a real book file.</p>
      </section>
    </SeoPage>
  );
}
