import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../src/SeoPage';

const path = '/note-taking-app';
const description = 'A free visual note-taking app for writers and worldbuilders. Put notes, characters, places and images on a board, connect them, and share it with friends.';
export const metadata: Metadata = {title: 'Free Visual Note-Taking App for Writers', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Free Visual Note-Taking App for Writers — Bibliarch', description, url: path}};

const faqs: Faq[] = [
  {q: 'Is Bibliarch Notes free?', a: 'Yes. Bibliarch Notes is free to use. You only need an account so your boards are saved.'},
  {q: 'What makes it different from a regular notes app?', a: 'Regular notes apps give you a list of pages. Bibliarch Notes gives you a board, so you can place notes next to each other, connect them, and see a whole project at once. It also has card types made for stories, like characters, locations, events and relationship maps.'},
  {q: 'Can I use it for things other than fiction?', a: 'Yes. Text cards, sticky notes, lists, tables, images and folders work for any project. The character and relationship tools are simply there if you want them.'},
  {q: 'Can I work on a board with someone else?', a: 'Yes. You can invite people by username or email, or share a link. Each person can be an editor or a viewer, and changes show up live. A story can have up to 10 collaborators.'},
  {q: 'Does it work on a phone?', a: 'Yes. It runs in your phone’s browser, with pinch to zoom and touch controls for moving cards. There is no app to install.'},
  {q: 'Can I get my notes out again?', a: 'Yes. You can export a story’s notes as a text file.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="Note-taking app" kicker="Bibliarch Notes" title="A visual note-taking app for people who think in pictures" lead="Put your notes on a board instead of in a list. Move them around, connect them, and see your whole project at once. Bibliarch Notes is free and runs in your browser." cta={[{href: '/notes/dashboard', label: 'Open Notes'}, {href: '/about', label: 'About Bibliarch'}]} faqs={faqs}>
      <section>
        <h2>Why take notes on a board?</h2>
        <p>Some ideas don’t fit in a straight line. A story has characters who know each other, places they’ve been, and events that depend on other events. On a board, all of that can sit side by side, and you can see how it fits together.</p>
        <p>When something changes, you drag it somewhere else. You don’t have to rewrite a document to reorganize it.</p>
      </section>
      <section>
        <h2>What you can put on a board</h2>
        <ul className="seo-features">
          <li><strong>Text and sticky notes</strong>Long notes or quick thoughts.</li>
          <li><strong>Characters</strong>Each one gets a card that opens into their own profile board.</li>
          <li><strong>Locations and events</strong>Keep track of where and when things happen.</li>
          <li><strong>Folders</strong>A folder opens into another board, so big projects stay tidy.</li>
          <li><strong>Lists and tables</strong>For timelines, cast lists, or anything with rows.</li>
          <li><strong>Relationship maps</strong>Show who is connected to who, and how.</li>
          <li><strong>Images</strong>Add reference pictures and mood boards.</li>
          <li><strong>Lines and arrows</strong>Draw connections between cards.</li>
        </ul>
      </section>
      <section>
        <h2>Who it’s for</h2>
        <ul>
          <li>Novelists and fanfiction writers planning plot and cast</li>
          <li>People with <a href="/oc-tools">original characters</a> who want them all in one place</li>
          <li>Worldbuilders and game masters keeping track of places, factions and history</li>
          <li>Anyone who likes seeing notes spread out, like index cards on a table</li>
        </ul>
        <p>You can start from a blank board or from the ready-made Story planner, which already has sections for characters, plot and worldbuilding. When you’re ready to write the real thing, <a href="/book-creator">Bibliarch Books</a> is the other half of the site.</p>
      </section>
    </SeoPage>
  );
}
