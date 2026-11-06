/* eslint-disable @typescript-eslint/no-explicit-any */
// Story and board templates, copied unchanged from storycanvas (src/lib/templates.ts) so stories made
// from them look exactly as they did in the old app. Used by the dashboard (new story) and by
// StoryBoard (a board opened for the first time). See lib/board-templates.ts.
// Story templates - static, pre-defined structures

export interface StoryTemplate {
  id: string
  name: string
  category: 'beginner' | 'intermediate' | 'advanced'
  features: string[]  // List of what this template provides
  estimatedTime: string  // How long to complete
  nodes: any[]
  connections: any[]
  subCanvases?: Record<string, { nodes: any[], connections: any[] }>  // Pre-built sub-canvases
}

export const storyTemplates: StoryTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    category: 'advanced',
    features: ['Complete creative freedom', 'No structure constraints', 'Build from scratch'],
    estimatedTime: 'Variable',
    nodes: [],
    connections: []
  },
  {
    id: 'basic',
    name: 'Story Planner Template',
    category: 'intermediate',
    features: ['Complete story development workflow', 'Character & plot frameworks', 'Theme & conflict mapping'],
    estimatedTime: '3-6 hours to complete',
    nodes: [
      // Story Development list container
      {
        id: 'story-development',
        x: 100,
        y: 50,
        text: 'Story Development',
        width: 350,
        height: 505,
        type: 'list',
        childIds: ['characters-folder', 'plot-folder', 'world-folder']
      },
      {
        id: 'characters-folder',
        x: 120,
        y: 90,
        text: 'Characters & Relationships',
        content: 'Write your content here...',
        width: 310,
        height: 90,
        type: 'folder',
        parentId: 'story-development'
      },
      {
        id: 'plot-folder',
        x: 120,
        y: 200,
        text: 'Plot Structure & Events',
        content: 'Write your content here...',
        width: 310,
        height: 90,
        type: 'folder',
        parentId: 'story-development'
      },
      {
        id: 'world-folder',
        x: 120,
        y: 310,
        text: 'World & Settings',
        content: 'Write your content here...',
        width: 310,
        height: 90,
        type: 'folder',
        parentId: 'story-development'
      },
      // Image node beside the story development
      {
        id: 'cover-image',
        x: 500,
        y: 50,
        text: 'Cover Concept',
        width: 300,
        height: 300,
        type: 'image'
      },

      // Story overview text node under the image
      {
        id: 'story-overview',
        x: 500,
        y: 370,
        text: 'Story Title',
        content: 'Write a story overview here',
        width: 300,
        height: 185,
        type: 'text'
      }
    ],
    connections: [
      {
        id: 'characters-to-plot',
        from: 'characters-folder',
        to: 'plot-folder',
        type: 'leads-to'
      },
      {
        id: 'plot-to-world',
        from: 'plot-folder',
        to: 'world-folder',
        type: 'relates-to'
      },
      {
        id: 'development-to-overview',
        from: 'story-development',
        to: 'story-overview',
        type: 'relates-to'
      }
    ],
    subCanvases: {
      'characters-canvas': {
        nodes: [],
        connections: []
      },
      'plot-canvas': {
        nodes: [
          {
            id: 'inciting-incident',
            x: 100,
            y: 100,
            text: 'Inciting Incident',
            content: 'What event kicks off your story?',
            width: 220,
            height: 140,
            type: 'event'
          },
          {
            id: 'rising-action',
            x: 400,
            y: 100,
            text: 'Rising Action',
            content: 'What challenges does your protagonist face?',
            width: 220,
            height: 140,
            type: 'event'
          },
          {
            id: 'midpoint',
            x: 700,
            y: 100,
            text: 'Midpoint',
            content: 'What major event changes everything?',
            width: 220,
            height: 140,
            type: 'event'
          },
          {
            id: 'climax',
            x: 250,
            y: 300,
            text: 'Climax',
            content: 'What is the final confrontation?',
            width: 220,
            height: 140,
            type: 'event'
          },
          {
            id: 'resolution',
            x: 550,
            y: 300,
            text: 'Resolution',
            content: 'How does everything wrap up?',
            width: 220,
            height: 140,
            type: 'event'
          }
        ],
        connections: [
          { id: 'incident-to-rising', from: 'inciting-incident', to: 'rising-action', type: 'leads-to' },
          { id: 'rising-to-midpoint', from: 'rising-action', to: 'midpoint', type: 'leads-to' },
          { id: 'midpoint-to-climax', from: 'midpoint', to: 'climax', type: 'leads-to' },
          { id: 'climax-to-resolution', from: 'climax', to: 'resolution', type: 'leads-to' }
        ]
      },
      'world-canvas': {
        nodes: [
          {
            id: 'primary-setting',
            x: 100,
            y: 100,
            text: 'Primary Setting',
            content: 'Where does most of your story take place?',
            width: 220,
            height: 140,
            type: 'location'
          },
          {
            id: 'world-rules',
            x: 400,
            y: 100,
            text: 'Rules & Logic',
            content: 'What are the rules that govern your story world?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'history-context',
            x: 700,
            y: 100,
            text: 'History & Context',
            content: 'What happened before your story begins?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'key-locations',
            x: 250,
            y: 300,
            text: 'Key Locations',
            content: 'What other important places appear in your story?',
            width: 220,
            height: 140,
            type: 'location'
          },
          {
            id: 'atmosphere-mood',
            x: 550,
            y: 300,
            text: 'Atmosphere & Mood',
            content: 'How should your world feel to readers?',
            width: 220,
            height: 140,
            type: 'text'
          }
        ],
        connections: [
          { id: 'setting-to-rules', from: 'primary-setting', to: 'world-rules', type: 'relates-to' },
          { id: 'history-to-setting', from: 'history-context', to: 'primary-setting', type: 'leads-to' },
          { id: 'setting-to-locations', from: 'primary-setting', to: 'key-locations', type: 'relates-to' },
          { id: 'locations-to-mood', from: 'key-locations', to: 'atmosphere-mood', type: 'relates-to' }
        ]
      },
      'themes-canvas': {
        nodes: [
          {
            id: 'central-conflict',
            x: 100,
            y: 100,
            text: 'Central Conflict',
            content: 'What is the main conflict driving your story?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'moral-questions',
            x: 400,
            y: 100,
            text: 'Moral Questions',
            content: 'What ethical dilemmas does your story explore?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'character-growth',
            x: 700,
            y: 100,
            text: 'Character Growth',
            content: 'How do your characters change and learn?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'societal-themes',
            x: 250,
            y: 300,
            text: 'Societal Themes',
            content: 'What broader social issues does your story address?',
            width: 220,
            height: 140,
            type: 'text'
          },
          {
            id: 'emotional-core',
            x: 550,
            y: 300,
            text: 'Emotional Core',
            content: 'What emotions should readers feel and why?',
            width: 220,
            height: 140,
            type: 'text'
          }
        ],
        connections: [
          { id: 'conflict-to-moral', from: 'central-conflict', to: 'moral-questions', type: 'relates-to' },
          { id: 'moral-to-growth', from: 'moral-questions', to: 'character-growth', type: 'leads-to' },
          { id: 'conflict-to-societal', from: 'central-conflict', to: 'societal-themes', type: 'relates-to' },
          { id: 'growth-to-emotional', from: 'character-growth', to: 'emotional-core', type: 'leads-to' }
        ]
      }
    }
  }
]

// Sub-canvas templates for expandable nodes
export const subCanvasTemplates: Record<string, { nodes: any[], connections: any[] }> = {
  // Characters & Relationships folder template
  'characters-folder': {
    nodes: [
      {
        id: 'characters-list',
        x: 100,
        y: 100,
        text: 'Characters',
        width: 380,
        height: 440,
        type: 'list',
        childIds: ['character-1', 'character-2', 'character-3', 'character-4', 'character-5']
      },
      {
        id: 'character-1',
        x: 120,
        y: 120,
        text: 'Character 1',
        width: 320,
        height: 72,
        type: 'character',
        parentId: 'characters-list'
      },
      {
        id: 'character-2',
        x: 120,
        y: 202,
        text: 'Character 2',
        width: 320,
        height: 72,
        type: 'character',
        parentId: 'characters-list'
      },
      {
        id: 'character-3',
        x: 120,
        y: 284,
        text: 'Character 3',
        width: 320,
        height: 72,
        type: 'character',
        parentId: 'characters-list'
      },
      {
        id: 'character-4',
        x: 120,
        y: 366,
        text: 'Character 4',
        width: 320,
        height: 72,
        type: 'character',
        parentId: 'characters-list'
      },
      {
        id: 'character-5',
        x: 120,
        y: 448,
        text: 'Character 5',
        width: 320,
        height: 72,
        type: 'character',
        parentId: 'characters-list'
      },
      {
        id: 'relationship-map',
        x: 505,
        y: 110,
        text: 'Relationship Map',
        width: 600,
        height: 420,
        type: 'relationship-canvas',
        relationshipData: {
          selectedCharacters: [],
          relationships: [],
          autoPopulateFromList: true,
          defaultPositions: [
            { x: 240, y: 50 },  // Character 1
            { x: 100, y: 130 }, // Character 2
            { x: 380, y: 130 }, // Character 3
            { x: 170, y: 210 }, // Character 4
            { x: 310, y: 210 }  // Character 5
          ]
        }
      }
    ],
    connections: []
  },
  // Template-specific character canvases
  'characters-canvas': {
    nodes: [],
    connections: []
  },
  'plot-folder': {
    nodes: [
      {
        id: 'image-reference',
        x: 400,
        y: 100,
        text: '',
        width: 300,
        height: 220,
        type: 'image'
      },
      {
        id: 'timeline-folder',
        x: 400,
        y: 340,
        text: 'Timeline',
        width: 300,
        height: 90,
        type: 'folder',
        linkedCanvasId: 'folder-canvas-timeline-folder'
      },
      {
        id: 'themes-motifs',
        x: 100,
        y: 100,
        text: 'Themes / Motifs',
        content: 'Jot recurring imagery, symbols, or foreshadowing ideas.',
        width: 280,
        height: 180,
        type: 'text'
      },
      {
        id: 'conflict-stakes',
        x: 720,
        y: 100,
        text: 'Conflict & Stakes',
        content: 'Track how conflict escalates and what\'s at risk.',
        width: 280,
        height: 180,
        type: 'text'
      },
      {
        id: 'subplots-side-stories',
        x: 100,
        y: 300,
        text: 'Subplots & Side Stories',
        content: 'What subplots or secondary stories run alongside your main plot?',
        width: 280,
        height: 180,
        type: 'text'
      },
      {
        id: 'checklist-table',
        x: 720,
        y: 300,
        text: 'Checklist',
        width: 280,
        height: 270,
        type: 'table',
        tableData: [
          { col1: 'Unfinished scenes or unresolved beats', col2: '☐' },
          { col1: '', col2: '☐' },
          { col1: '', col2: '☐' },
          { col1: '', col2: '☐' },
          { col1: '', col2: '☐' }
        ]
      },
      {
        id: 'note-1',
        x: 100,
        y: 500,
        text: 'Note',
        content: '',
        width: 280,
        height: 140,
        type: 'text'
      },
      {
        id: 'note-2',
        x: 410,
        y: 450,
        text: 'Note',
        content: '',
        width: 280,
        height: 140,
        type: 'text'
      },
      {
        id: 'note-3',
        x: 720,
        // Leave 20px below the checklist's full 270px height (300 + 270).
        y: 590,
        text: 'Note',
        content: '',
        width: 280,
        height: 140,
        type: 'text'
      }
    ],
    connections: []
  },
  character: {
    nodes: [
      {
        id: 'character-design',
        x: 100,
        y: 100,
        text: 'Character Design',
        width: 300,
        height: 200,
        type: 'image'
      },
      {
        id: 'character-info',
        x: 100,
        y: 320,
        text: '',
        width: 300,
        height: 200,
        type: 'table',
        tableData: [
          { col1: 'Name', col2: '' },
          { col1: 'Age', col2: '' },
          { col1: 'Birthday', col2: '' },
          { col1: 'Height', col2: '' },
          { col1: 'Weight', col2: '' },
          { col1: 'Role', col2: '' },
          { col1: 'Occupation', col2: '' },
          { col1: 'Species', col2: '' }
        ]
      },
      {
        id: 'backstory',
        x: 450,
        y: 100,
        text: 'Backstory',
        content: 'What is their history and past?',
        width: 280,
        height: 160,
        type: 'text'
      },
      {
        id: 'beginning-of-story',
        x: 450,
        y: 460,
        text: 'Beginning of Story',
        content: 'Who are they at the start?',
        width: 280,
        height: 140,
        type: 'text'
      },
      {
        id: 'end-of-story',
        x: 760,
        y: 460,
        text: 'End of Story',
        content: 'Who have they become?',
        width: 280,
        height: 140,
        type: 'text'
      },
      {
        id: 'themes',
        x: 760,
        y: 100,
        text: 'Themes',
        content: 'What themes do they represent?',
        width: 280,
        height: 160,
        type: 'text'
      },
      {
        id: 'motivations',
        x: 450,
        y: 290,
        text: 'Motivations',
        content: 'What drives this character?',
        width: 280,
        height: 140,
        type: 'text'
      },
      {
        id: 'morality',
        x: 760,
        y: 290,
        text: 'Morality',
        content: 'What are their moral principles?',
        width: 280,
        height: 140,
        type: 'text'
      }
    ],
    connections: [
      {
        id: 'arc-connection',
        from: 'beginning-of-story',
        to: 'end-of-story',
        type: 'character-arc'
      }
    ]
  },
  'world-folder': {
    nodes: [
      // CENTER: Map image with instruction above
      {
        id: 'map-instructions',
        x: 500,
        y: 80,
        text: 'World Map',
        content: 'Upload a map of your world here →',
        width: 600,
        height: 70,
        type: 'text'
      },
      {
        id: 'world-map-image',
        x: 500,
        y: 170,
        text: 'World Map Visual',
        width: 600,
        height: 300,
        type: 'image'
      },

      // LEFT COLUMN: Core world properties (extended to fill space)
      {
        id: 'geography-climate',
        x: 80,
        y: 80,
        text: 'Geography & Climate',
        content: 'What are the major landforms, climates, and regions?',
        width: 380,
        height: 180,
        type: 'text'
      },
      {
        id: 'global-culture',
        x: 80,
        y: 280,
        text: 'Global Culture',
        content: 'What unites or defines cultures across the world?',
        width: 380,
        height: 130,
        type: 'text'
      },
      {
        id: 'technology-magic',
        x: 80,
        y: 430,
        text: 'Technology & Magic',
        content: 'How advanced is the world, and what role does magic/tech play?',
        width: 380,
        height: 130,
        type: 'text'
      },
      {
        id: 'religion-beliefs',
        x: 80,
        y: 580,
        text: 'Religion & Belief Systems',
        content: 'What do people believe in, and how does it affect daily life?',
        width: 380,
        height: 150,
        type: 'text'
      },

      // BOTTOM CENTER: Social & economic systems (2 rows of 2) - extended to fill space
      {
        id: 'trade-economy',
        x: 500,
        y: 490,
        text: 'Trade & Economy',
        content: 'What fuels prosperity or scarcity across nations?',
        width: 290,
        height: 160,
        type: 'text'
      },
      {
        id: 'languages-communication',
        x: 810,
        y: 490,
        text: 'Languages & Communication',
        content: 'Are there many languages? A common tongue?',
        width: 290,
        height: 160,
        type: 'text'
      },
      {
        id: 'global-travel',
        x: 500,
        y: 670,
        text: 'Global Travel & Connection',
        content: 'How do people move, migrate, or share ideas?',
        width: 290,
        height: 160,
        type: 'text'
      },
      {
        id: 'values-taboos',
        x: 810,
        y: 670,
        text: 'Values & Taboos',
        content: 'What\'s seen as sacred, shameful, or universally important?',
        width: 290,
        height: 160,
        type: 'text'
      },

      // RIGHT SIDE: Power structures (History moved to bottom with max space)
      {
        id: 'power-structures',
        x: 1140,
        y: 80,
        text: 'Power Structures',
        content: 'Who holds authority (political, magical, religious)?',
        width: 300,
        height: 170,
        type: 'text'
      },
      {
        id: 'conflicts-tensions',
        x: 1140,
        y: 270,
        text: 'Conflicts & Tensions',
        content: 'What are the big global threats or rivalries?',
        width: 300,
        height: 170,
        type: 'text'
      },
      {
        id: 'history-origins',
        x: 1140,
        y: 460,
        text: 'History & Origins',
        content: 'What major events shaped this world?',
        width: 300,
        height: 370,
        type: 'text'
      },

      // FAR RIGHT: Countries list (moved further right)
      {
        id: 'countries-list',
        x: 1480,
        y: 80,
        text: 'Countries',
        width: 380,
        height: 385,
        type: 'list',
        childIds: ['country-1', 'country-2', 'country-3', 'country-4']
      },
      {
        id: 'country-1',
        x: 1500,
        y: 105,
        text: 'Country 1',
        width: 340,
        height: 90,
        type: 'location',
        parentId: 'countries-list'
      },
      {
        id: 'country-2',
        x: 1500,
        y: 200,
        text: 'Country 2',
        width: 340,
        height: 90,
        type: 'location',
        parentId: 'countries-list'
      },
      {
        id: 'country-3',
        x: 1500,
        y: 295,
        text: 'Country 3',
        width: 340,
        height: 90,
        type: 'location',
        parentId: 'countries-list'
      },
      {
        id: 'country-4',
        x: 1500,
        y: 390,
        text: 'Country 4',
        width: 340,
        height: 90,
        type: 'location',
        parentId: 'countries-list'
      }
    ],
    connections: []
  },
  'country': {
    nodes: [
      // LEFT COLUMN: Info table anchor
      {
        id: 'country-info-table',
        x: 80,
        y: 80,
        text: 'Country Profile',
        width: 250,
        height: 320,
        type: 'table',
        tableData: [
          { col1: 'Name', col2: '' },
          { col1: 'Population', col2: '' },
          { col1: 'Capital', col2: '' },
          { col1: 'Founded', col2: '' },
          { col1: 'Area (sq km)', col2: '' },
          { col1: 'Currency', col2: '' },
          { col1: 'Main Language', col2: '' },
          { col1: 'Government', col2: '' },
          { col1: 'Development Level', col2: '' },
          { col1: 'Main Export', col2: '' }
        ]
      },
      {
        id: 'country-trade',
        x: 80,
        y: 440,
        text: 'Trade & Economy',
        content: 'What are the main exports/imports? How wealthy is the nation?',
        width: 250,
        height: 140,
        type: 'text'
      },
      {
        id: 'culture-exports',
        x: 80,
        y: 600,
        text: 'Culture Exports',
        content: 'Music, fashion, food, or art they\'re known for abroad.',
        width: 250,
        height: 140,
        type: 'text'
      },
      {
        id: 'country-languages',
        x: 80,
        y: 760,
        text: 'Languages & Dialects',
        content: 'What\'s spoken here? Any regional slang or secret codes?',
        width: 250,
        height: 120,
        type: 'text'
      },

      // CENTER COLUMN: Cultural foundation with tall culture node
      {
        id: 'local-culture',
        x: 350,
        y: 80,
        text: 'Local Culture',
        content: 'What defines the country\'s traditions, customs, festivals, and rituals?',
        width: 240,
        height: 200,
        type: 'text'
      },
      {
        id: 'country-geography',
        x: 350,
        y: 310,
        text: 'Geography & Climate',
        content: 'What terrain, natural resources, or weather shape life here?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-religion',
        x: 350,
        y: 450,
        text: 'Religion & Beliefs',
        content: 'Are there dominant faiths, cults, or superstitions?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-values',
        x: 350,
        y: 590,
        text: 'Values & Taboos',
        content: 'What\'s sacred, shameful, or central to identity?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'military-defense',
        x: 350,
        y: 730,
        text: 'Military & Defense',
        content: 'What\'s their army/navy like? Are they expansionist or defensive?',
        width: 240,
        height: 120,
        type: 'text'
      },

      // RIGHT COLUMN: Power structures with tall conflicts node
      {
        id: 'country-power',
        x: 610,
        y: 80,
        text: 'Power Structures',
        content: 'Who rules? What systems of government, monarchy, or councils exist?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'major-cities',
        x: 610,
        y: 220,
        text: 'Major Cities',
        content: 'List the most important or notable urban centers.',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-tech-magic',
        x: 610,
        y: 360,
        text: 'Technology & Magic',
        content: 'What\'s unique about their level of progress or magical practices?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-conflicts',
        x: 610,
        y: 500,
        text: 'Conflicts & Tensions',
        content: 'Rivalries, wars, rebellions, internal strife, and current political tensions.',
        width: 240,
        height: 200,
        type: 'text'
      },
      {
        id: 'everyday-life',
        x: 610,
        y: 720,
        text: 'Everyday Life',
        content: 'What\'s daily living like for common people vs. elites?',
        width: 240,
        height: 120,
        type: 'text'
      },

      // FAR RIGHT: Map with isolated space
      {
        id: 'local-map-instructions',
        x: 900,
        y: 80,
        text: 'Local Map',
        content: 'Upload a map of this country/region (any shape/size) →',
        width: 400,
        height: 70,
        type: 'text'
      },
      {
        id: 'local-map-image',
        x: 900,
        y: 170,
        text: 'Country Map',
        width: 400,
        height: 280,
        type: 'image'
      },
      {
        id: 'country-history',
        x: 900,
        y: 470,
        text: 'History & Origins',
        content: 'How did this country form? What key events shaped it? Founding myths, major wars, cultural shifts, and historical turning points.',
        width: 400,
        height: 300,
        type: 'text'
      }
    ],
    connections: []
  },
  location: {
    nodes: [
      // LEFT COLUMN: Info table anchor
      {
        id: 'country-info-table',
        x: 80,
        y: 80,
        text: 'Location Profile',
        width: 250,
        height: 320,
        type: 'table',
        tableData: [
          { col1: 'Name', col2: '' },
          { col1: 'Population', col2: '' },
          { col1: 'Capital', col2: '' },
          { col1: 'Founded', col2: '' },
          { col1: 'Area (sq km)', col2: '' },
          { col1: 'Currency', col2: '' },
          { col1: 'Main Language', col2: '' },
          { col1: 'Government', col2: '' },
          { col1: 'Development Level', col2: '' },
          { col1: 'Main Export', col2: '' }
        ]
      },
      {
        id: 'country-trade',
        x: 80,
        y: 440,
        text: 'Trade & Economy',
        content: 'What are the main exports/imports? How wealthy is the nation?',
        width: 250,
        height: 140,
        type: 'text'
      },
      {
        id: 'culture-exports',
        x: 80,
        y: 600,
        text: 'Culture Exports',
        content: 'What does this location share with the world? Art, music, customs, technology, philosophy.',
        width: 250,
        height: 140,
        type: 'text'
      },

      // MIDDLE COLUMN: Culture & Politics (reorganized)
      {
        id: 'country-politics',
        x: 370,
        y: 80,
        text: 'Politics & Leadership',
        content: 'Who rules? How? What parties/factions exist? How stable is the government?',
        width: 240,
        height: 140,
        type: 'text'
      },
      {
        id: 'country-social-order',
        x: 370,
        y: 240,
        text: 'Social Order',
        content: 'What social classes exist? How mobile is society? What are the cultural values?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-culture',
        x: 370,
        y: 380,
        text: 'Culture & Customs',
        content: 'What are the unique traditions, festivals, foods, and daily customs?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-cities',
        x: 370,
        y: 520,
        text: 'Major Cities',
        content: 'List the most important or notable urban centers.',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-tech-magic',
        x: 370,
        y: 660,
        text: 'Technology & Magic',
        content: 'What\'s unique about their level of progress or magical practices?',
        width: 240,
        height: 120,
        type: 'text'
      },

      // MIDDLE-RIGHT COLUMN: Resources & Geography (reorganized)
      {
        id: 'country-resources',
        x: 650,
        y: 80,
        text: 'Resources & Geography',
        content: 'What natural resources, terrains, and geographic features define this land?',
        width: 240,
        height: 140,
        type: 'text'
      },
      {
        id: 'country-climate',
        x: 650,
        y: 240,
        text: 'Climate & Environment',
        content: 'What\'s the weather like? Seasons? Environmental challenges?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-military',
        x: 650,
        y: 380,
        text: 'Military & Defense',
        content: 'How do they protect themselves? What\'s their military structure and strength?',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-religion',
        x: 650,
        y: 520,
        text: 'Religion & Beliefs',
        content: 'What do people believe? Major religions, spiritual practices, or philosophies.',
        width: 240,
        height: 120,
        type: 'text'
      },
      {
        id: 'country-conflicts',
        x: 650,
        y: 660,
        text: 'Conflicts & Tensions',
        content: 'Internal conflicts, border disputes, or major challenges they face.',
        width: 240,
        height: 120,
        type: 'text'
      },

      // RIGHT COLUMN: Map & History (extended)
      {
        id: 'local-map-instructions',
        x: 930,
        y: 80,
        text: 'Local Map',
        content: 'Upload a map of this location/region (any shape/size) →',
        width: 400,
        height: 70,
        type: 'text'
      },
      {
        id: 'local-map-image',
        x: 930,
        y: 170,
        text: 'Location Map',
        width: 400,
        height: 280,
        type: 'image'
      },
      {
        id: 'country-history',
        x: 930,
        y: 470,
        text: 'History & Origins',
        content: 'How did this location form? What key events shaped it? Founding myths, major wars, cultural shifts, and historical turning points.',
        width: 400,
        height: 300,
        type: 'text'
      }
    ],
    connections: []
  },
  'relationship-canvas': {
    nodes: [
      {
        id: 'relationship-instructions',
        x: 50,
        y: 50,
        text: 'Relationship Map',
        content: 'Welcome to your visual relationship map! Create character nodes here and use the relationship tool (❤️) to connect them with colored relationship lines.',
        width: 400,
        height: 100,
        type: 'text',
        color: '#e0f2fe'
      },
      {
        id: 'relationship-legend',
        x: 500,
        y: 50,
        text: 'Relationship Legend',
        width: 300,
        height: 220,
        type: 'table',
        tableData: [
          { col1: 'Type', col2: 'Color & Strength' },
          { col1: 'Romantic', col2: '🔴 Red (thick=strong)' },
          { col1: 'Family', col2: '🔵 Blue (dashed=weak)' },
          { col1: 'Friends', col2: '🟢 Green (normal)' },
          { col1: 'Professional', col2: '🟠 Orange' },
          { col1: 'Rivals/Enemies', col2: '🟣 Purple' },
          { col1: 'Other', col2: '⚫ Gray' }
        ]
      },
      {
        id: 'how-to-guide',
        x: 50,
        y: 180,
        text: 'How to Use',
        content: '1. Add character nodes using the User tool (👤)\n2. Select the Relationship tool (❤️) from the toolbar\n3. Click one character, then another to create a relationship\n4. Choose the relationship type, strength, and label\n5. Use filters to show/hide relationship types',
        width: 400,
        height: 160,
        type: 'text',
        color: '#f0fdf4'
      },
      {
        id: 'sample-character-1',
        x: 200,
        y: 400,
        text: 'Alice',
        content: 'Main protagonist - add more details about this character',
        width: 200,
        height: 150,
        type: 'character'
      },
      {
        id: 'sample-character-2',
        x: 600,
        y: 400,
        text: 'Bob',
        content: 'Alice\'s best friend - supporting character',
        width: 200,
        height: 150,
        type: 'character'
      },
      {
        id: 'sample-character-3',
        x: 400,
        y: 600,
        text: 'Charlie',
        content: 'The antagonist - creates conflict for Alice',
        width: 200,
        height: 150,
        type: 'character'
      }
    ],
    connections: []
  },
  'folder-canvas-timeline-folder': {
    nodes: [
      {
        id: 'event-1-opening',
        x: 50,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Opening Scene',
        summary: 'Introduce your protagonist and their ordinary world. Set the tone and establish the initial situation before everything changes.',
        durationText: ''
      },
      {
        id: 'event-2-inciting',
        x: 290,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Inciting Incident',
        summary: 'The event that kicks off your story and disrupts the protagonist\'s ordinary world. This is what sets everything in motion.',
        durationText: ''
      },
      {
        id: 'event-3-choice',
        x: 530,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Point of No Return',
        summary: 'The protagonist makes a crucial decision or faces a situation they cannot back away from. The stakes are raised.',
        durationText: ''
      },
      {
        id: 'event-4-midpoint',
        x: 770,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Midpoint Twist',
        summary: 'A major revelation or turning point that changes the protagonist\'s understanding of their situation. The game changes.',
        durationText: ''
      },
      {
        id: 'event-5-darkest',
        x: 1010,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Darkest Moment',
        summary: 'The lowest point for your protagonist. All seems lost, and they must find the strength to continue despite overwhelming odds.',
        durationText: ''
      },
      {
        id: 'event-6-climax',
        x: 1250,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Climax',
        summary: 'The final confrontation or decisive moment. The protagonist faces their greatest challenge and the main conflict reaches its peak.',
        durationText: ''
      },
      {
        id: 'event-7-resolution',
        x: 1490,
        y: 50,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Resolution',
        summary: 'The aftermath of the climax. Loose ends are tied up, and we see how the protagonist\'s world has changed.',
        durationText: ''
      }
    ],
    connections: [
      { id: 'timeline-opening-to-inciting', from: 'event-1-opening', to: 'event-2-inciting', type: 'leads-to' },
      { id: 'timeline-inciting-to-choice', from: 'event-2-inciting', to: 'event-3-choice', type: 'leads-to' },
      { id: 'timeline-choice-to-midpoint', from: 'event-3-choice', to: 'event-4-midpoint', type: 'leads-to' },
      { id: 'timeline-midpoint-to-darkest', from: 'event-4-midpoint', to: 'event-5-darkest', type: 'leads-to' },
      { id: 'timeline-darkest-to-climax', from: 'event-5-darkest', to: 'event-6-climax', type: 'leads-to' },
      { id: 'timeline-climax-to-resolution', from: 'event-6-climax', to: 'event-7-resolution', type: 'leads-to' }
    ]
  },
  // Generic event canvas template - used when clicking into any event node
  event: {
    nodes: [
      // LEFT COLUMN - Event Details
      {
        id: 'setting-atmosphere',
        x: 50,
        y: 50,
        text: 'Setting & Atmosphere',
        content: 'Where does this happen? What\'s the mood/tone? Time of day, weather, sensory details?',
        width: 350,
        height: 180,
        type: 'text'
      },
      {
        id: 'conflict-stakes',
        x: 50,
        y: 250,
        text: 'Conflict & Stakes',
        content: 'What\'s at stake in this moment? What could go wrong? What tension exists?',
        width: 350,
        height: 180,
        type: 'text'
      },
      {
        id: 'characters-involved',
        x: 50,
        y: 450,
        text: 'Characters Involved',
        width: 350,
        height: 200,
        type: 'table',
        tableData: [
          { col1: 'Character Name', col2: 'Role in Event' },
          { col1: '', col2: '' },
          { col1: '', col2: '' },
          { col1: '', col2: '' },
          { col1: '', col2: '' },
          { col1: '', col2: '' }
        ]
      },

      // ABOVE TIMELINE - Production Notes
      {
        id: 'key-dialogue',
        x: 450,
        y: 50,
        text: 'Key Dialogue/Quotes',
        content: 'Important lines or exchanges. Memorable moments.',
        width: 580,
        height: 120,
        type: 'text'
      },
      {
        id: 'visual-action-notes',
        x: 1050,
        y: 50,
        text: 'Visual/Action Notes',
        content: 'Key visual moments. Action sequences. Important blocking or cinematography ideas.',
        width: 580,
        height: 120,
        type: 'text'
      },

      // CENTER - Timeline (sub-events)
      {
        id: 'sub-event-1',
        x: 450,
        y: 200,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Sub-event 1',
        summary: 'What happens first in this event?',
        durationText: ''
      },
      {
        id: 'sub-event-2',
        x: 690,
        y: 200,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Sub-event 2',
        summary: 'What happens next?',
        durationText: ''
      },
      {
        id: 'sub-event-3',
        x: 930,
        y: 200,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Sub-event 3',
        summary: 'What happens after that?',
        durationText: ''
      },
      {
        id: 'sub-event-4',
        x: 1170,
        y: 200,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Sub-event 4',
        summary: 'What happens next?',
        durationText: ''
      },
      {
        id: 'sub-event-5',
        x: 1410,
        y: 200,
        width: 220,
        height: 280,
        type: 'event',
        title: 'Sub-event 5',
        summary: 'How does this event conclude?',
        durationText: ''
      },

      // RIGHT COLUMN - Narrative Analysis
      {
        id: 'narrative-purpose',
        x: 1680,
        y: 50,
        text: 'Narrative Purpose',
        content: 'How does this serve the overall story? What does the audience learn? What changes as a result?',
        width: 350,
        height: 180,
        type: 'text'
      },
      {
        id: 'themes-symbolism',
        x: 1680,
        y: 250,
        text: 'Themes & Symbolism',
        content: 'What themes are explored here? Any symbolic elements? Motifs or recurring imagery?',
        width: 350,
        height: 180,
        type: 'text'
      },
      {
        id: 'emotional-arc',
        x: 1680,
        y: 450,
        text: 'Emotional Arc',
        content: 'How should the audience feel? Emotional journey within this event. Key emotional beats.',
        width: 350,
        height: 200,
        type: 'text'
      }
    ],
    connections: [
      { id: 'sub-timeline-1-to-2', from: 'sub-event-1', to: 'sub-event-2', type: 'leads-to' },
      { id: 'sub-timeline-2-to-3', from: 'sub-event-2', to: 'sub-event-3', type: 'leads-to' },
      { id: 'sub-timeline-3-to-4', from: 'sub-event-3', to: 'sub-event-4', type: 'leads-to' },
      { id: 'sub-timeline-4-to-5', from: 'sub-event-4', to: 'sub-event-5', type: 'leads-to' }
    ]
  }
}