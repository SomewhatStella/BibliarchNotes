import type {MetadataRoute} from 'next';
import {GUIDES, SITE_URL} from '../src/SeoPage';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1},
    ...GUIDES.map(g => ({url: SITE_URL + g.href, lastModified, changeFrequency: 'monthly' as const, priority: 0.8})),
  ];
}
