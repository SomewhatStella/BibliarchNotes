import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../../src/SeoPage';

const path = '/oc-tools/things-to-do-with-your-ocs';
const description = 'Things to do with your OCs on Bibliarch: take notes on them, keep their art and backstory together, map their relationships, and share them with friends. Free.';
export const metadata: Metadata = {title: 'Take Notes on Your OCs: Free Character Organizer', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Things to Do With Your OCs — Bibliarch', description, url: path, type: 'article'}};

const faqs: Faq[] = [
  {q: 'Where can I keep notes on my OCs?', a: 'Bibliarch Notes is a free website for this. Each OC gets a card on your board that opens into their own page for notes, backstory and images.'},
  {q: 'How do I organize a lot of OCs?', a: 'Give each character a card, then group them with folders, for example by story, world or friend group. A list or table works well for a full cast.'},
  {q: 'Can I keep my OC’s art with their notes?', a: 'Yes. You can add reference images to a character’s board, right next to their notes.'},
  {q: 'Is it free?', a: 'Yes. Bibliarch is free to use. You just need an account so your characters are saved.'},
];

const THINGS: {title: string; text: string}[] = [
  {title: 'Take notes on them', text: 'Every OC gets a card on your board. Open it and you have a whole page just for that character, so their details stop getting lost in your phone notes.'},
  {title: 'Write down their backstory', text: 'Keep their history, motivations, fears and secrets together, and add to them whenever you think of something new.'},
  {title: 'Keep their art and references together', text: 'Put drawings, outfits, face claims and mood boards right next to their notes.'},
  {title: 'Map who they know', text: 'Use a relationship map to show how your OCs are connected. Each direction is separate, so one can be in love while the other has no idea.'},
  {title: 'Sort them into groups', text: 'Use folders to keep characters together by story, world, family or friend group.'},
  {title: 'Make a cast list', text: 'Use a list or table to see your whole cast at a glance, with ages, roles, or whatever you want to compare.'},
  {title: 'Build the world around them', text: 'Add locations and events so you know where your OCs live and what has happened to them.'},
  {title: 'Plan their story', text: 'Start with the Story planner and you get sections for characters, plot and worldbuilding already set up.'},
  {title: 'Share them with friends', text: 'Invite friends to your board to build a shared world or swap characters. Everyone can edit together, live.'},
  {title: 'Turn them into a book', text: 'When you’re ready, write their story or a character guide in Bibliarch Books and download it as a PDF or EPUB.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="Things to do with your OCs" kicker="For your OCs" title="Things to do with your OCs on Bibliarch" lead="Bibliarch is a free place to take notes on your original characters. Keep everything about them together, see how they connect, and build their world." cta={[{href: '/notes/dashboard', label: 'Add your first OC'}, {href: '/oc-tools/oc-profile-template', label: 'Get the OC template'}]} faqs={faqs}>
      <section>
        <h2>What you can do</h2>
        <ol className="seo-steps">
          {THINGS.map(t => <li key={t.title}><strong>{t.title}.</strong> {t.text}</li>)}
        </ol>
      </section>
      <section>
        <h2>How to start</h2>
        <ol>
          <li><a href="/notes/dashboard">Open Bibliarch Notes</a> and make a new story.</li>
          <li>Press the Character button on the left to add your OC.</li>
          <li>Open their card and start writing down what you know.</li>
        </ol>
        <p>Not sure what to write? Use our free <a href="/oc-tools/oc-profile-template">OC profile template</a>.</p>
      </section>
    </SeoPage>
  );
}
