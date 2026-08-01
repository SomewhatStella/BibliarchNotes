// Images live in Supabase Storage and nodes carry only the storage PATH.
//
// They used to be stored as base64 data URLs inside the node itself, which broke
// collaboration outright: every edit broadcasts the whole nodes array over a
// Supabase Realtime channel, and Realtime caps a message at a few hundred KB. A
// photo blew past that, the broadcast failed, and the other person's next edit
// (whose copy of the node had no image) overwrote the uploader's - so the image
// appeared, flickered to the other side, then vanished for both.

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'story-images'

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID (for organizing files)
 * @param nodeId - The node ID (for unique naming)
 * @returns The storage path (e.g., "user123/node456-1234567890.jpg")
 */
export async function uploadImage(file: File, userId: string, nodeId: string): Promise<string> {
  const supabase = createClient()

  // Create unique filename with timestamp
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${nodeId}-${Date.now()}.${fileExt}`

  // Upload to storage with aggressive caching (1 year)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '31536000', // 1 year in seconds - prevents repeated fetches
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    throw error
  }

  // Return the storage path (not full URL)
  // This path is what we save in the database
  return data.path
}

/**
 * Get the public URL for a storage path
 * @param storagePath - The path returned from uploadImage
 * @returns The full public URL to display the image
 */
export function getImageUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return ''

  // Pass through anything that's already displayable: external URLs, legacy
  // base64, and the blob: URL used to preview an image while it uploads.
  if (
    storagePath.startsWith('http') ||
    storagePath.startsWith('data:') ||
    storagePath.startsWith('blob:')
  ) {
    return storagePath
  }

  // Built by hand rather than via supabase.storage.getPublicUrl() because this
  // runs in render for every image on the canvas, and getPublicUrl needs a
  // client instance. The URL shape is fixed and public.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''

  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

/**
 * Upload an image for a node and return its storage path.
 *
 * Resolves the current user itself so callers inside the canvas don't need to
 * thread a userId through. Returns null instead of throwing: a failed upload
 * should degrade (caller keeps the local data URL) rather than lose the image.
 */
export async function uploadNodeImage(file: File, nodeId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('Image upload skipped: not signed in')
      return null
    }

    return await uploadImage(file, user.id, nodeId)
  } catch (err) {
    console.error('Image upload failed, keeping local copy:', err)
    return null
  }
}

/**
 * Delete an image from storage
 * @param storagePath - The storage path to delete
 */
export async function deleteImage(storagePath: string): Promise<void> {
  // Don't try to delete base64 or external URLs
  if (storagePath.startsWith('data:') || storagePath.startsWith('http')) {
    return
  }

  const supabase = createClient()

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath])

  if (error) {
    console.error('Delete error:', error)
    throw error
  }
}

/**
 * Read a File back into a base64 data URL.
 *
 * Only used as a fallback when an upload fails: the on-screen preview is a
 * blob: URL that dies with the tab, so we embed the image the old way rather
 * than let the user lose it.
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a base64 data URL to a File object
 * Useful for migrating old base64 images to storage
 */
export function dataURLToFile(dataURL: string, filename: string = 'image.jpg'): File {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}
