import type {Metadata} from 'next';
import SeoPage, {type Faq} from '../../../src/SeoPage';

const path = '/oc-tools/oc-profile-template';
const description = 'A free original character profile template to copy and fill in: basics, looks, personality, backstory, relationships and story questions for any OC.';
export const metadata: Metadata = {title: 'Free OC Profile Template (Copy and Paste)', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: 'Free OC Profile Template — Bibliarch', description, url: path, type: 'article'}};

const TEMPLATE = `NAME:
Nickname (and who's allowed to use it):
Age and birthday:
Pronouns:
Species or background:
Where they live:
What they do all day:

LOOKS
Height and build:
Hair and eyes:
Clothes they always end up wearing:
One detail people notice first:
One detail nobody notices:

PERSONALITY
Three words they'd use for themselves:
Three words their enemies would use:
What makes them laugh:
What makes them shut down:
Worst habit:
Most useful skill:
Most useless skill:

INSIDE
What they want:
What they actually need:
Biggest fear:
Biggest secret:
A lie they believe about themselves:

BACKSTORY
Who raised them:
Best memory:
The day everything changed:
What they still haven't forgiven:

RELATIONSHIPS
Who they trust:
Who they'd never trust again:
Who they love:
Who they pretend not to care about:

IN THE STORY
Where they start:
What's standing in their way:
What they'd give up to win:
Where they end up:`;

const faqs: Faq[] = [
  {q: 'What should an OC profile include?', a: 'The basics, what they look like, how they act, what they want, what they’re afraid of, their history, and how they relate to other characters. What they want and what they’re hiding usually matter more than height and eye color.'},
  {q: 'Do I have to fill in every question?', a: 'No. Skip anything that doesn’t matter for your character, and add anything that’s missing. Empty answers are useful too, since they show you what you haven’t figured out yet.'},
  {q: 'Where can I keep my filled-in OC profiles?', a: 'In Bibliarch Notes. It’s free, and gives each character their own board, with room for images and relationship maps.'},
];

export default function Page() {
  return (
    <SeoPage path={path} name="OC profile template" kicker="Free template" title="OC profile template" lead="A free character sheet for any original character. Copy it into a character card in Bibliarch Notes and fill in as much or as little as you want." cta={[{href: '/notes/dashboard', label: 'Keep your OCs in Bibliarch'}, {href: '/oc-tools/things-to-do-with-your-ocs', label: 'Things to do with your OCs'}]} faqs={faqs}>
      <section>
        <h2>The template</h2>
        <pre className="seo-template" tabIndex={0}>{TEMPLATE}</pre>
      </section>
      <section>
        <h2>How to use it well</h2>
        <p>Start with what they want and what they’re afraid of. Those two answers do most of the work, and the rest gets easier once you know them.</p>
        <p>Then fill it in again as a different character would. What your OC says about themselves and what their rival says are rarely the same, and that gap is usually where the good story is.</p>
        <p>Finished one? See <a href="/oc-tools/things-to-do-with-your-ocs">what else you can do with your OCs on Bibliarch</a>.</p>
      </section>
    </SeoPage>
  );
}
