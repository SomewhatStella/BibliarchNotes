import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../src/SeoPage';

const path = '/book-creator';
const description = 'A free online book creator. Write on real book pages, design the layout and cover, and download a print-ready PDF or EPUB for Amazon KDP or home printing.';
export const metadata: Metadata = {title: 'Free Online Book Creator: Write and Print Your Book', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Free Online Book Creator — Bibliarch', description, url: path}};

const faqs: Faq[] = [
  {q: 'Is Bibliarch Books free?', a: 'Yes. Bibliarch Books is free to use, including PDF and EPUB downloads. You only need an account.'},
  {q: 'Can I use it to self-publish on Amazon?', a: 'Yes. Choose Amazon KDP in Preview & export and Bibliarch checks your page count, trim size and margins, then gives you a print-ready PDF. It also makes a matching cover PDF. Bibliarch is not affiliated with Amazon, and you upload the files to KDP yourself.'},
  {q: 'Can I bring in a book I already wrote?', a: 'Yes. You can import a manuscript from a Word document (.docx), a text file or a Markdown file, and Bibliarch splits it into chapters and lays it out.'},
  {q: 'Do I need design experience?', a: 'No. You can start from a template such as Classic novel, Japanese light novel, Botanical journal or Poetry collection, and change as little or as much as you like.'},
  {q: 'Can I add pictures to my book?', a: 'Yes. You can upload pictures, place them on any page, have the words flow around them, and add illustration pages. There is also a library of ornaments that are free to use, including in books you sell.'},
  {q: 'Does it work on a phone?', a: 'Yes. The whole book creator runs in your phone’s browser, though a bigger screen is more comfortable for layout work.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="Book creator" kicker="Bibliarch Books" title="A free online book creator for writing and designing real books" lead="Write on pages that look like your finished book. Set the fonts, margins and chapter openings, design the cover, and download a file that’s ready to print." cta={[{href: '/books', label: 'Start a book'}, {href: '/about', label: 'About Bibliarch'}]} faqs={faqs}>
      <section>
        <h2>See the book while you write it</h2>
        <p>Most writing apps show you one long scroll of text, and the book only appears at the end. In Bibliarch Books you write straight onto the pages. Page breaks, chapter openings, headers and page numbers are there the whole time.</p>
      </section>
      <section>
        <h2>What’s included</h2>
        <ul className="seo-features">
          <li><strong>Book templates</strong>Blank book, Classic novel, Japanese light novel, Botanical journal and Poetry collection.</li>
          <li><strong>Manuscript import</strong>Bring in .docx, .txt or Markdown files.</li>
          <li><strong>Book design</strong>Fonts, paper size, margins, and your own uploaded fonts.</li>
          <li><strong>Cover and spine designer</strong>Front, spine and back, with a separate cover PDF.</li>
          <li><strong>Pictures and ornaments</strong>Wrap words around pictures and decorate pages.</li>
          <li><strong>Print check</strong>Warns about problems for Amazon KDP, IngramSpark or home printing.</li>
          <li><strong>PDF and EPUB export</strong>Print-ready PDF and e-book files.</li>
          <li><strong>3D preview</strong>Turn your book around before you print it.</li>
          <li><strong>Writing tools</strong>Word goals, focus mode, find and replace.</li>
          <li><strong>Review tools</strong>Comments, tracked changes and earlier versions.</li>
        </ul>
      </section>
      <section>
        <h2>From idea to printed book</h2>
        <ol>
          <li>Pick a template, or import a manuscript you’ve already written.</li>
          <li>Write on the pages and add chapters as you go.</li>
          <li>Choose your fonts, book size and margins.</li>
          <li>Design the front, spine and back cover.</li>
          <li>Run the print check, then download your PDF or EPUB.</li>
        </ol>
        <p>Still working out the story? Plan it first in <a href="/note-taking-app">Bibliarch Notes</a>, a visual board for characters, places and plot. Notes and Books use the same account, but they don’t sync automatically.</p>
      </section>
    </SeoPage>
  );
}
