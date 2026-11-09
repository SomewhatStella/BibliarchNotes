import type {MetadataRoute} from 'next';
import {SITE_URL} from '../src/SeoPage';

// Public pages are open to everyone. People's private work sits behind a login, and these paths are app screens.
const PRIVATE = ['/api/', '/notes/dashboard', '/notes/story/', '/notes/admin', '/notes/settings', '/notes/join/', '/notes/reset-password', '/reset-password'];
// Named so it's explicit that search and AI assistants are welcome on the public pages.
const AI_AND_SEARCH = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{userAgent: '*', allow: '/', disallow: PRIVATE}, {userAgent: AI_AND_SEARCH, allow: '/', disallow: PRIVATE}],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
