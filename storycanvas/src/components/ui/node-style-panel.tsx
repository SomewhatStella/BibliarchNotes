'use client'

import React from 'react'
import { Square, Circle, Sparkles, Moon, Sun, Blend, Type, Bold, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NodeStylePreferences {
  corners: 'sharp' | 'rounded' | 'very-rounded'
  outlines: 'dark' | 'light' | 'mixed'
  textColor: 'dark' | 'mixed' | 'light'
  textAlign: 'left' | 'center' | 'right'
  font: 'default' | 'serif' | 'rounded' | 'handwritten' | 'display' | 'mono'
}

// Global font choices. These map to the next/font variables set up in the root
// layout, and each button previews its own face.
const FONT_OPTIONS: { value: NodeStylePreferences['font']; label: string; css?: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'serif', label: 'Serif', css: 'var(--font-serif), Georgia, serif' },
  { value: 'rounded', label: 'Rounded', css: 'var(--font-rounded), system-ui, sans-serif' },
  { value: 'handwritten', label: 'Handwritten', css: 'var(--font-handwritten), cursive' },
  { value: 'display', label: 'Display', css: 'var(--font-display), Georgia, serif' },
  { value: 'mono', label: 'Mono', css: 'var(--font-geist-mono), ui-monospace, monospace' },
]

function FontPicker({
  current,
  onChange,
}: {
  current: NodeStylePreferences['font']
  onChange: (value: string) => void
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">Font</span>
        <span className="text-[10px] text-muted-foreground">
          {FONT_OPTIONS.find(o => o.value === current)?.label ?? 'Default'}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {FONT_OPTIONS.map(option => (
          <Button
            key={option.value}
            size="sm"
            variant={current === option.value ? 'default' : 'outline'}
            onClick={() => onChange(option.value)}
            className="h-7 w-full p-0"
            title={option.label}
            style={option.css ? { fontFamily: option.css } : undefined}
          >
            <span className="text-xs leading-none">Aa</span>
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
        Applies to every box. A box with its own font keeps it.
      </p>
    </div>
  )
}

interface StyleToggleProps {
  label: string
  options: [string, string, string]
  current: string
  onChange: (value: string) => void
  icons?: [React.ReactNode, React.ReactNode, React.ReactNode]
}

function StyleToggle({ label, options, current, onChange, icons }: StyleToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={current === options[0] ? "default" : "outline"}
          onClick={() => onChange(options[0])}
          className="h-6 w-6 p-0"
          title={`${label}: ${options[0]}`}
        >
          {icons ? icons[0] : options[0].charAt(0).toUpperCase()}
        </Button>
        <Button
          size="sm"
          variant={current === options[1] ? "default" : "outline"}
          onClick={() => onChange(options[1])}
          className="h-6 w-6 p-0"
          title={`${label}: ${options[1]}`}
        >
          {icons ? icons[1] : options[1].charAt(0).toUpperCase()}
        </Button>
        <Button
          size="sm"
          variant={current === options[2] ? "default" : "outline"}
          onClick={() => onChange(options[2])}
          className="h-6 w-6 p-0"
          title={`${label}: ${options[2]}`}
        >
          {icons ? icons[2] : options[2].charAt(0).toUpperCase()}
        </Button>
      </div>
    </div>
  )
}

interface NodeStylePanelProps {
  preferences: NodeStylePreferences
  onUpdate: (key: keyof NodeStylePreferences, value: string) => void
}

export function NodeStylePanel({ preferences, onUpdate }: NodeStylePanelProps) {
  return (
    <div className="space-y-1">
        <FontPicker
          current={preferences.font ?? 'default'}
          onChange={(value) => onUpdate('font', value)}
        />

        <StyleToggle
          label="Corners"
          options={['sharp', 'rounded', 'very-rounded']}
          current={preferences.corners}
          onChange={(value) => onUpdate('corners', value)}
          icons={[
            <Square className="w-3 h-3" key="sharp" />,
            <Circle className="w-3 h-3" key="rounded" />,
            <Sparkles className="w-3 h-3" key="very-rounded" />
          ]}
        />

        <StyleToggle
          label="Outline"
          options={['dark', 'mixed', 'light']}
          current={preferences.outlines}
          onChange={(value) => onUpdate('outlines', value)}
          icons={[
            <Moon className="w-3 h-3" key="dark" />,
            <Blend className="w-3 h-3" key="mixed" />,
            <Sun className="w-3 h-3" key="light" />
          ]}
        />


        <StyleToggle
          label="Text Color"
          options={['dark', 'mixed', 'light']}
          current={preferences.textColor}
          onChange={(value) => onUpdate('textColor', value)}
          icons={[
            <Moon className="w-3 h-3" key="dark" />,
            <Blend className="w-3 h-3" key="mixed" />,
            <Sun className="w-3 h-3" key="light" />
          ]}
        />

        <StyleToggle
          label="Align"
          options={['left', 'center', 'right']}
          current={preferences.textAlign}
          onChange={(value) => onUpdate('textAlign', value)}
          icons={[
            <AlignLeft className="w-3 h-3" key="left" />,
            <AlignCenter className="w-3 h-3" key="center" />,
            <AlignRight className="w-3 h-3" key="right" />
          ]}
        />
    </div>
  )
}
