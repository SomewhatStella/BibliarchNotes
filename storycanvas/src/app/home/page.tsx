'use client'

import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Bitcoin,
  AlertCircle,
  Type,
  StickyNote,
  User,
  Calendar,
  MapPin,
  Folder,
  List,
  Image as ImageIcon,
  Table,
  Heart,
  ArrowUpRight,
  Infinity as InfinityIcon,
  ArrowRight,
  Palette,
  LayoutTemplate,
  Users,
  Download,
  Moon,
  Undo2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import FeedbackButton from '@/components/feedback/FeedbackButton'
import dynamic from 'next/dynamic'

const DONATE_URL = 'https://pay.zaprite.com/pl_mTYYPoOo2S'

// Load canvas dynamically (client-only)
const HTMLCanvas = dynamic(
  () => import('@/components/canvas/HTMLCanvas'),
  { ssr: false }
)

// Build an Archimedean spiral path string centered in a 400x400 viewBox.
function spiralPath(turns: number, spacing: number, cx = 200, cy = 200) {
  const pts: string[] = []
  const steps = Math.round(turns * 72)
  for (let i = 0; i <= steps; i++) {
    const t = i / 72
    const angle = t * Math.PI * 2
    const radius = spacing * t
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return 'M ' + pts.join(' L ')
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:to-gray-900">
      {/* Header — kept simple */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="container mx-auto px-2 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sky-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              Bibliarch Notes
            </h1>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <a href={DONATE_URL} target="_blank" rel="noreferrer noopener">
              <Button
                size="sm"
                className="gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md font-semibold"
                title="Support Bibliarch Notes"
              >
                <Bitcoin className="w-4 h-4" />
                <span className="hidden sm:inline">Donate</span>
              </Button>
            </a>
            <div className="md:block"><FeedbackButton /></div>
            <div className="md:block"><ThemeToggle /></div>
          </div>
        </div>
      </header>

      <main>
        {/* ===================== HERO ===================== */}
        <section className="relative overflow-hidden">
          {/* Decorative background — blue, with spirals down the right side */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            {/* soft top glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(56,189,248,0.20),transparent_55%)]" />
            {/* faint dot grid, fading out toward edges */}
            <div
              className="absolute inset-0 opacity-50 dark:opacity-25"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(37,99,235,0.16) 1px, transparent 1px)',
                backgroundSize: '26px 26px',
                maskImage:
                  'radial-gradient(ellipse 75% 60% at 50% 35%, black, transparent 75%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 75% 60% at 50% 35%, black, transparent 75%)',
              }}
            />
            {/* large slow-spinning spiral, upper right */}
            <svg
              className="absolute -right-28 -top-24 w-[34rem] h-[34rem] text-sky-400/40 dark:text-sky-500/25 animate-spin [animation-duration:70s]"
              viewBox="0 0 400 400"
              fill="none"
            >
              <path d={spiralPath(6.5, 28)} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {/* second spiral, mid right, reverse spin */}
            <svg
              className="absolute right-10 top-48 w-72 h-72 text-blue-500/30 dark:text-blue-400/20 animate-spin [animation-duration:55s] [animation-direction:reverse]"
              viewBox="0 0 400 400"
              fill="none"
            >
              <path d={spiralPath(5, 30)} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {/* small accent spiral, lower right */}
            <svg
              className="absolute right-44 top-[26rem] w-40 h-40 text-indigo-400/30 dark:text-indigo-400/20 animate-spin [animation-duration:45s]"
              viewBox="0 0 400 400"
              fill="none"
            >
              <path d={spiralPath(4, 36)} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <div className="container mx-auto px-4 py-14 md:py-20">
            <div className="max-w-4xl mx-auto text-center space-y-7 min-h-[calc(100vh-180px)] flex flex-col justify-center">
              {/* Heading — original wording, kept the new font */}
              <h2 className="animate-fade-up text-4xl md:text-6xl font-extrabold tracking-tight">
                Visual Story Planning
                <span className="block mt-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-pan">
                  For Writers Who Think Visually
                </span>
              </h2>

              {/* Subtext — original */}
              <p className="animate-fade-up [animation-delay:120ms] text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Plan characters, map relationships, organize timelines, and build your story world on an infinite canvas.
              </p>

              {/* CTA — original */}
              <div className="animate-fade-up [animation-delay:220ms] pt-8">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== LIVE DEMO ===================== */}
        <section id="demo" className="container mx-auto px-4 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-3 mb-6">
              <h3 className="text-2xl md:text-4xl font-bold">Try it right here</h3>
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 px-4 py-1.5 text-sky-700 dark:text-sky-300">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs md:text-sm font-medium">
                  Live demo — drag the cards around. Changes here aren&apos;t saved.
                </p>
              </div>
            </div>

            {/* Canvas Demo Container */}
            <div
              className="shadow-2xl demo-container-outer ring-1 ring-black/5 dark:ring-white/10"
              style={{
                height: '640px',
                backgroundColor: '#f5f5f5',
                border: '2px solid #333',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                .demo-canvas * {
                  --background: 0 0% 96% !important;
                  --color-canvas-bg: #f5f5f5 !important;
                  /* Keep node outlines looking like dark mode in both themes */
                  --node-border-default: #4b5563 !important;
                  --node-border-hover: #6366f1 !important;
                  --node-border-selected: #a855f7 !important;
                  --node-border-connecting: #10b981 !important;
                }
                .demo-container-outer > div:first-of-type {
                  overflow: hidden;
                  position: relative;
                  width: 100%;
                  height: 100%;
                }
                /* Hide floating UI elements in demo */
                .demo-container-outer .fixed {
                  display: none !important;
                }
              `}} />
              <div style={{ width: '100%', height: '100%', colorScheme: 'light', backgroundColor: '#f5f5f5' }}>
                <div className="demo-canvas" style={{ width: '100%', height: '100%' }}>
                  <HTMLCanvas
                  storyId="demo"
                  currentCanvasId="main"
                  canvasPath={[]}
                  currentFolderId={null}
                  currentFolderTitle={null}
                  initialNodes={[
                    // Story Development list container
                    {
                      id: 'story-development',
                      x: 20,
                      y: 60,
                      text: 'List node',
                      width: 350,
                      height: 290,
                      type: 'list',
                      childIds: ['location-node', 'folder-node']
                    },
                    {
                      id: 'location-node',
                      x: 40,
                      y: 100,
                      text: 'Location',
                      content: '',
                      width: 310,
                      height: 90,
                      type: 'location',
                      parentId: 'story-development'
                    },
                    {
                      id: 'folder-node',
                      x: 40,
                      y: 200,
                      text: 'Folder',
                      content: 'Create sub-canvases for complex projects',
                      width: 310,
                      height: 100,
                      type: 'folder',
                      parentId: 'story-development'
                    },
                    // Characters list container
                    {
                      id: 'characters-list',
                      x: 20,
                      y: 360,
                      text: 'Characters',
                      width: 350,
                      height: 220,
                      type: 'list',
                      childIds: ['character-node', 'character-node-2']
                    },
                    {
                      id: 'character-node',
                      x: 40,
                      y: 400,
                      text: 'Character 1',
                      content: '',
                      width: 310,
                      height: 72,
                      type: 'character',
                      parentId: 'characters-list'
                    },
                    {
                      id: 'character-node-2',
                      x: 40,
                      y: 482,
                      text: 'Character 2',
                      content: '',
                      width: 310,
                      height: 72,
                      type: 'character',
                      parentId: 'characters-list'
                    },
                    // Image node
                    {
                      id: 'cover-image',
                      x: 380,
                      y: 60,
                      text: '',
                      width: 380,
                      height: 290,
                      type: 'image'
                    },
                    // Event node
                    {
                      id: 'event-node',
                      x: 770,
                      y: 60,
                      text: 'Event',
                      title: 'Event',
                      summary: 'Plot story moments and timelines',
                      width: 280,
                      height: 290,
                      type: 'event',
                      durationText: ''
                    },
                    // Text Note
                    {
                      id: 'text-note',
                      x: 380,
                      y: 360,
                      text: 'Text Note',
                      content: 'Free-form notes and ideas',
                      width: 280,
                      height: 220,
                      type: 'text'
                    },
                    // Table node
                    {
                      id: 'table-node',
                      x: 670,
                      y: 360,
                      text: '',
                      width: 380,
                      height: 120,
                      type: 'table',
                      tableData: [
                        { col1: 'Type', col2: 'Purpose' },
                        { col1: 'Table', col2: 'Structured data' },
                        { col1: 'Rows', col2: 'Track details' }
                      ]
                    },
                    // Quick note
                    {
                      id: 'quick-note',
                      x: 670,
                      y: 473,
                      text: '',
                      content: 'Quick note',
                      width: 180,
                      height: 90,
                      type: 'compact-text'
                    }
                  ]}
                  initialConnections={[
                    {
                      id: 'conn-1',
                      from: 'folder-node',
                      to: 'event-node'
                    }
                  ]}
                  onSave={() => {}} // No-op for demo
                  onNavigateToCanvas={() => {}} // No-op for demo
                  onStateChange={() => {}} // No-op for demo
                  canvasWidth={3000}
                  canvasHeight={2000}
                  initialShowHelp={false}
                />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== FEATURES ===================== */}
        <section className="container mx-auto px-4 mt-28">
          <div className="max-w-2xl mx-auto text-center mb-6">
            <h3 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything your story needs
            </h3>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
            {SECTIONS.map((group) => (
              <div key={group.label}>
                <h4 className="text-lg md:text-xl font-bold tracking-tight mb-3">
                  {group.label}
                </h4>
                <div className="space-y-2">
                  {group.items.map((f) => (
                    <NodeCard key={f.title} icon={f.icon} title={f.title} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== THE GAME (teaser) ===================== */}
        <section className="container mx-auto px-4 mt-28">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl border shadow-xl">
              {/* Screenshot of the real Bibliarch game */}
              <img
                src="/bibliarch-game-home.png"
                alt="The Bibliarch game"
                className="w-full h-[320px] md:h-[520px] object-cover"
              />
              {/* Coming soon badge */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white px-3 py-1 text-xs md:text-sm font-bold shadow-md">
                <Sparkles className="w-4 h-4" />
                Coming Soon
              </div>
              {/* Caption overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 md:p-8">
                <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-white/70">the game</p>
                <h3 className="text-3xl md:text-5xl font-extrabold tracking-wide text-white">BIBLIARCH</h3>
                <p className="mt-2 text-sm md:text-base text-white/90 max-w-xl">
                  Step inside your stories — a 3D world where your characters come to life.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== DONATE ===================== */}
        <section className="container mx-auto px-4 mt-28">
          <div className="relative max-w-5xl mx-auto overflow-hidden rounded-3xl border border-sky-200/70 dark:border-sky-800/60 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-950/30 dark:via-gray-900 dark:to-blue-950/20 p-8 md:p-12 text-center shadow-xl">
            <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-sky-300/30 blur-3xl animate-blob" aria-hidden="true" />
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
                <Bitcoin className="w-8 h-8 text-white" />
              </div>
              <h3 className="mt-6 text-2xl md:text-3xl font-bold">Help keep Bibliarch Notes free</h3>
              <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
                Bibliarch Notes is free for everyone. If it helps your stories, a
                donation keeps it growing.
              </p>
              <a href={DONATE_URL} target="_blank" rel="noreferrer noopener" className="inline-block mt-7">
                <Button
                  size="lg"
                  className="group gap-2 text-lg px-9 py-6 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold"
                >
                  <Bitcoin className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Donate
                </Button>
              </a>
              <p className="mt-4 text-xs text-muted-foreground">
                Secure payment via Zaprite
              </p>
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="container mx-auto px-4 mt-28">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl md:text-5xl font-bold tracking-tight">
              Your story is waiting.
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Open a blank canvas and start building.
            </p>
            <div className="mt-8">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="group text-lg px-10 py-6 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-28 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600 dark:text-blue-400" />
              <span className="font-semibold text-foreground">Bibliarch Notes</span>
            </div>
            <div className="flex justify-center gap-6">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <a href="https://www.tiktok.com/@somewhatstella" target="_blank" rel="noreferrer noopener" className="hover:text-foreground transition-colors">
                Contact
              </a>
              <a href={DONATE_URL} target="_blank" rel="noreferrer noopener" className="hover:text-foreground transition-colors">
                Donate
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Tile — icon on the side, title centered (like a character node)
function NodeCard({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="group relative flex items-center justify-center min-h-[60px] rounded-lg border bg-card px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 transition-transform duration-200 group-hover:scale-110">
        <Icon className="w-5 h-5" />
      </div>
      <span className="px-10 text-sm font-medium leading-tight text-center">{title}</span>
    </div>
  )
}

type CardItem = { icon: LucideIcon; title: string; body: string }

// Nodes you drag onto the canvas (grouped by what they're for), then Features.
const SECTIONS: { label: string; items: CardItem[] }[] = [
  {
    label: 'Nodes',
    items: [
      { icon: Type, title: 'Text', body: 'A full rich-text note for scenes, lore, or long writing.' },
      { icon: StickyNote, title: 'Quick Note', body: 'A little sticky for a stray thought or reminder.' },
      { icon: ImageIcon, title: 'Image', body: 'Reference art, covers, and moodboards on the canvas.' },
      { icon: Table, title: 'Table', body: 'Rows and columns for stats, schedules, or anything structured.' },
      { icon: ArrowUpRight, title: 'Line', body: 'Draw a connection or arrow between any two cards.' },
      { icon: Heart, title: 'Relationships', body: 'A board linking who loves, hates, and knows who.' },
    ],
  },
  {
    label: 'Folder Nodes',
    items: [
      { icon: List, title: 'List', body: 'A tidy stack that groups related cards together.' },
      { icon: Folder, title: 'Folder', body: 'A sub-canvas to nest a whole storyline inside.' },
      { icon: User, title: 'Character', body: 'A profile card with looks, traits, and backstory in one place.' },
      { icon: MapPin, title: 'Location', body: 'A place in your world, mapped out and described.' },
      { icon: Calendar, title: 'Event', body: 'A moment in your plot you can drop onto a timeline.' },
      { icon: LayoutTemplate, title: 'Custom', body: 'Save any node as your own reusable custom type.' },
    ],
  },
  {
    label: 'Features',
    items: [
      { icon: InfinityIcon, title: 'Infinite Canvas', body: 'Endless space — zoom out and your whole story fits.' },
      { icon: Palette, title: 'Node Colors', body: 'Recolor and restyle any node to match your story.' },
      { icon: Users, title: 'Collaboration', body: 'Share a story and build it together in real time.' },
      { icon: Download, title: 'Export', body: 'Save your story out to Word or as an image.' },
      { icon: Undo2, title: 'Undo & Redo', body: 'Experiment freely — step back any change instantly.' },
      { icon: Moon, title: 'Dark Mode', body: 'Easy on the eyes, day or night.' },
    ],
  },
]
