import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../src/SeoPage';

const path = '/about';
const description = 'Bibliarch is a free website for writers with two tools: Notes, a visual board for planning stories and original characters, and Books, an online book creator.';
export const metadata: Metadata = {title: {absolute: 'About Bibliarch: Free Notes and Book Creator for Writers'}, description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'About Bibliarch', description, url: path}};

const faqs: Faq[] = [
  {q: 'What is Bibliarch?', a: 'Bibliarch is a free website for writers and creators. It has two tools under one account: Notes, a visual note-taking board, and Books, an online book creator.'},
  {q: 'How much does Bibliarch cost?', a: 'Bibliarch is free to use. It needs an account so your work can be saved.'},
  {q: 'Do I need to download anything?', a: 'No. Bibliarch runs in a web browser on computers, tablets and phones.'},
  {q: 'Who is Bibliarch best for?', a: 'People planning stories, keeping track of original characters, building fictional worlds, or making and self-publishing their own books.'},
  {q: 'When is something else a better fit?', a: 'Bibliarch is built around creative projects, so a general notes app may suit plain to-do lists or work notes better. It has no offline app, and it doesn’t publish or sell your book for you: you download the files and upload them to a service like Amazon KDP or IngramSpark yourself.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="About" kicker="About" title="What is Bibliarch?" lead="Bibliarch is a free website for writers and creators. Plan your story and characters in Notes, then write and design the finished book in Books." cta={[{href: '/notes/dashboard', label: 'Open Notes'}, {href: '/books', label: 'Open Books'}]} faqs={faqs}>
      <section>
        <h2>Two tools, one account</h2>
        <h3><a href="/note-taking-app">Bibliarch Notes</a></h3>
        <p>A visual note-taking board. You place text, sticky notes, characters, locations, events, lists, tables, images and relationship maps on a board and connect them. Folders and characters open into their own boards. You can work with up to 10 collaborators, live, and export your notes as text.</p>
        <h3><a href="/book-creator">Bibliarch Books</a></h3>
        <p>An online book creator. You write on real book pages, choose fonts, paper size and margins, add pictures and ornaments, design a cover and spine, and download a print-ready PDF or an EPUB. It can import .docx, .txt and Markdown files, and checks your book against the requirements for Amazon KDP and IngramSpark.</p>
        <h3><a href="/oc-tools">OC tools</a></h3>
        <p>People with original characters use Notes to keep every character’s details, art and relationships together. We also publish a free <a href="/oc-tools/oc-profile-template">OC profile template</a> and a list of <a href="/oc-tools/things-to-do-with-your-ocs">things to do with your OCs</a>.</p>
      </section>
    </SeoPage>
  );
}
