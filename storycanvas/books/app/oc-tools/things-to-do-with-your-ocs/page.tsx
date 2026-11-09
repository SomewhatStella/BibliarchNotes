import type {Metadata} from 'next';
import SeoPage from '../../../src/SeoPage';

const path = '/oc-tools/things-to-do-with-your-ocs';
const description = '60 things to do with your OCs when you’re bored: writing prompts, art ideas, games to play with friends, and ways to get to know your original characters better.';
export const metadata: Metadata = {title: '60 Things to Do With Your OCs', description, alternates: {canonical: path}, openGraph: {images: ['/og.png'], title: '60 Things to Do With Your OCs — Bibliarch', description, url: path, type: 'article'}};

const IDEAS: {title: string; intro: string; items: string[]}[] = [
  {title: 'Get to know them', intro: 'Small questions that tell you more than a stats sheet does.', items: [
    'Write down what’s in their pockets right now.',
    'Decide what they’d save from a house fire.',
    'List three things they’d never admit out loud.',
    'Work out what they order at a restaurant, and whether they finish it.',
    'Write their phone’s lock screen and last five searches.',
    'Figure out what they’re afraid of, then what they’re afraid of underneath that.',
    'Choose a smell that reminds them of home.',
    'Decide how they act when they’re sick.',
    'Write the lie they tell most often.',
    'Pick the song they’d never let anyone know they love.',
    'Give them a habit that annoys everyone they live with.',
    'Write what their handwriting looks like, and what it says about them.',
  ]},
  {title: 'Write something short', intro: 'Quick scenes that don’t have to fit into your main story.', items: [
    'Write them on the worst day of their life, then the most boring one.',
    'Have them write a letter they’ll never send.',
    'Put them on a long car ride with the person they like least.',
    'Write the moment they first met their best friend, from both sides.',
    'Lock two of your OCs in an elevator.',
    'Write a diary entry from when they were ten.',
    'Have them give a terrible toast at a wedding.',
    'Write their reaction to finding out they’re fictional.',
    'Write a scene where they’re completely, obviously wrong.',
    'Send them to a job interview they’re not qualified for.',
    'Write how they’d spend their last day.',
    'Tell one event twice, from two OCs who remember it differently.',
  ]},
  {title: 'Make something visual', intro: 'No art skills needed for most of these.', items: [
    'Build a mood board of colors and textures for them.',
    'Draw or collage their outfit for a normal Tuesday.',
    'Design their bedroom, including the mess.',
    'Redraw them in a style you’ve never tried.',
    'Make a wanted poster for them.',
    'Draw them at five different ages.',
    'Design a tarot card that represents them.',
    'Make their fake social media profile.',
    'Create a playlist and design the cover.',
    'Draw the same expression on every character in your cast.',
    'Draw a map of the places they go every day.',
    'Design an item that belongs to them and tell its history.',
  ]},
  {title: 'Connect them to each other', intro: 'Your OCs get more interesting the moment they have to deal with each other.', items: [
    'Map every relationship in your cast, in both directions.',
    'Decide which two OCs would be the worst roommates.',
    'Make a list of who would betray who, and for how much.',
    'Sort your cast into who’d survive a zombie outbreak, and in what order.',
    'Ship two OCs you never expected, and work out how it could happen.',
    'Give two enemies one thing they completely agree on.',
    'Run a group chat between your whole cast.',
    'Decide who gets invited to whose birthday, and who doesn’t show up.',
    'Choose who your OC would call at 3am.',
    'Have one OC describe another to a stranger.',
    'Rank your cast by who’s best at keeping secrets.',
    'Put your OCs on a reality show and decide who goes home first.',
  ]},
  {title: 'Play with friends', intro: 'OCs are better with other people’s OCs.', items: [
    'Swap OCs with a friend and write each other’s characters.',
    'Have your OCs meet your friend’s OCs at a party.',
    'Build a shared world and each add one town.',
    'Do OC questions over video and answer in character.',
    'Play “who would win?” with your rosters.',
    'Have a friend ask your OC ten questions you can’t prepare for.',
    'Draw each other’s OCs from a description only.',
    'Trade art prompts: one OC, one situation.',
    'Write a story together, switching every paragraph.',
    'Run your OCs through a tabletop one-shot.',
    'Make a yearbook for all your friends’ OCs.',
    'Turn your OCs into a real book: write their story and print a copy.',
  ]},
];

export default function Page() {
  return (
    <SeoPage path={path} name="Things to do with your OCs" kicker="OC ideas" title="60 things to do with your OCs" lead="Bored, stuck, or just missing your characters? Here are 60 things to write, draw and try with your original characters, on your own or with friends." cta={[{href: '/oc-tools/oc-profile-template', label: 'Get the OC template'}, {href: '/oc-tools', label: 'See the OC tools'}]}>
      {IDEAS.map(group => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <p>{group.intro}</p>
          <ol>{group.items.map(item => <li key={item}>{item}</li>)}</ol>
        </section>
      ))}
      <p className="seo-note">Want somewhere to keep all of this? <a href="/notes/dashboard">Bibliarch Notes</a> is free, and gives each OC their own board, with <a href="/oc-tools">relationship maps</a> for the whole cast.</p>
    </SeoPage>
  );
}
