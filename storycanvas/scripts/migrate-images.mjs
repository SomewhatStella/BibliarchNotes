#!/usr/bin/env node
/**
 * One-off migration: move pictures out of canvas_data and into Supabase Storage.
 *
 * Pictures used to be stored as base64 data URLs inside the nodes JSON. That
 * broke collaborative editing (the realtime message size limit) and is why
 * canvas_data ballooned past a gigabyte. This walks every canvas, uploads each
 * inline picture to the story-images bucket, and rewrites the node to hold the
 * storage path instead.
 *
 * SAFE BY DEFAULT: does nothing unless you pass --apply.
 *
 *   node scripts/migrate-images.mjs                 # dry run, reports what it would do
 *   node scripts/migrate-images.mjs --limit 5       # dry run, first 5 canvases only
 *   node scripts/migrate-images.mjs --apply --limit 5   # really convert 5 canvases
 *   node scripts/migrate-images.mjs --apply         # convert everything
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase dashboard ->
 * Settings -> API -> service_role). That key bypasses all security rules, so
 * keep it out of git - .env.local is already ignored.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, '..')

// ---------------------------------------------------------------- setup

function loadEnvLocal() {
  const env = {}
  try {
    const raw = readFileSync(join(projectRoot, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  } catch {
    // No .env.local - fall back to real environment variables.
  }
  return env
}

const fileEnv = loadEnvLocal()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing credentials.')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase -> Settings -> API -> service_role).')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity

const BUCKET = 'story-images'
const PAGE_SIZE = 50

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------- helpers

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

function parseDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const header = dataUrl.slice(0, comma)
  const mime = header.slice(5, header.indexOf(';')) || 'image/jpeg'
  if (!header.includes('base64')) return null
  const buffer = Buffer.from(dataUrl.slice(comma + 1), 'base64')
  if (buffer.length === 0) return null
  return { mime, buffer, ext: EXT_BY_MIME[mime] || 'jpg' }
}

async function uploadDataUrl(dataUrl, ownerId, nodeId, counter) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null

  // Same shape the app writes: <owner>/<node>-<unique>.<ext>
  const path = `${ownerId}/${nodeId}-${Date.now()}-${counter}.${parsed.ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.mime,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) throw error
  return { path, bytes: parsed.buffer.length }
}

const isInline = (value) => typeof value === 'string' && value.startsWith('data:')

// ---------------------------------------------------------------- migration

/**
 * Returns a new nodes array with every inline picture replaced by a storage
 * path, or null if nothing needed changing. Never mutates the input.
 */
async function migrateNodes(nodes, ownerId, stats) {
  if (!Array.isArray(nodes)) return null

  let changed = false
  let counter = 0
  const out = []

  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      out.push(node)
      continue
    }

    let next = node

    for (const field of ['imageUrl', 'profileImageUrl']) {
      if (!isInline(next[field])) continue

      stats.found++
      if (!APPLY) {
        stats.wouldUpload++
        stats.bytes += next[field].length
        changed = true
        continue
      }

      try {
        const result = await uploadDataUrl(next[field], ownerId, node.id || 'node', counter++)
        if (result) {
          next = { ...next, [field]: result.path }
          changed = true
          stats.uploaded++
          stats.bytes += result.bytes
        }
      } catch (err) {
        stats.failed++
        console.warn(`      ! ${field} on node ${node.id}: ${err.message}`)
      }
    }

    // Profile pictures are also copied into relationship maps, and those copies
    // carry their own base64. Convert them too or the map stays bloated.
    const chars = next.relationshipData?.selectedCharacters
    if (Array.isArray(chars) && chars.some((c) => isInline(c?.profileImageUrl))) {
      const newChars = []
      for (const character of chars) {
        if (!isInline(character?.profileImageUrl)) {
          newChars.push(character)
          continue
        }

        stats.found++
        if (!APPLY) {
          stats.wouldUpload++
          stats.bytes += character.profileImageUrl.length
          newChars.push(character)
          changed = true
          continue
        }

        try {
          const result = await uploadDataUrl(
            character.profileImageUrl,
            ownerId,
            character.id || 'character',
            counter++
          )
          newChars.push(result ? { ...character, profileImageUrl: result.path } : character)
          if (result) {
            changed = true
            stats.uploaded++
            stats.bytes += result.bytes
          }
        } catch (err) {
          newChars.push(character)
          stats.failed++
          console.warn(`      ! relationship character ${character.id}: ${err.message}`)
        }
      }

      next = {
        ...next,
        relationshipData: { ...next.relationshipData, selectedCharacters: newChars },
      }
    }

    out.push(next)
  }

  return changed ? out : null
}

// ---------------------------------------------------------------- main

async function main() {
  console.log(APPLY ? '\n*** APPLY MODE - this writes to the database ***\n' : '\n--- DRY RUN (nothing will be written) ---\n')

  // Owner lookup: the storage path needs the story's owner.
  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('id, user_id')

  if (storiesError) {
    console.error('Could not read stories:', storiesError.message)
    process.exit(1)
  }

  const ownerByStory = new Map(stories.map((s) => [s.id, s.user_id]))
  console.log(`${stories.length} stories, ${ownerByStory.size} owners\n`)

  const stats = { canvases: 0, converted: 0, found: 0, uploaded: 0, wouldUpload: 0, failed: 0, bytes: 0 }
  let page = 0

  while (stats.canvases < LIMIT) {
    const { data: rows, error } = await supabase
      .from('canvas_data')
      .select('id, story_id, canvas_type, nodes')
      .order('id')
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      console.error('Could not read canvases:', error.message)
      process.exit(1)
    }
    if (!rows || rows.length === 0) break

    for (const row of rows) {
      if (stats.canvases >= LIMIT) break
      stats.canvases++

      const ownerId = ownerByStory.get(row.story_id)
      if (!ownerId) {
        console.warn(`  ? canvas ${row.id}: no owner found for story ${row.story_id}, skipping`)
        continue
      }

      const before = stats.found
      const migrated = await migrateNodes(row.nodes, ownerId, stats)
      const foundHere = stats.found - before
      if (!migrated) continue

      console.log(`  canvas ${row.id} (${row.canvas_type}): ${foundHere} picture(s)`)

      if (APPLY) {
        const { error: updateError } = await supabase
          .from('canvas_data')
          .update({ nodes: migrated })
          .eq('id', row.id)

        if (updateError) {
          console.error(`      ! failed to save canvas ${row.id}: ${updateError.message}`)
          stats.failed++
          continue
        }
      }

      stats.converted++
    }

    page++
  }

  const mb = (stats.bytes / 1024 / 1024).toFixed(1)
  console.log('\n----------------------------------------')
  console.log(`Canvases scanned:   ${stats.canvases}`)
  console.log(`Canvases converted: ${stats.converted}`)
  console.log(`Pictures found:     ${stats.found}`)
  console.log(APPLY ? `Pictures uploaded:  ${stats.uploaded}` : `Would upload:       ${stats.wouldUpload}`)
  console.log(`Failures:           ${stats.failed}`)
  console.log(`Image data:         ~${mb} MB`)
  console.log('----------------------------------------')
  if (!APPLY) console.log('\nDry run only. Re-run with --apply to actually convert.\n')
}

main().catch((err) => {
  console.error('\nMigration stopped:', err)
  process.exit(1)
})
