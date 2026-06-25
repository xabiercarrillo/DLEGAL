import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://xlegal.com.py'
  const now = new Date()
  return [
    { url: base,                   lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/register`,     lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${base}/terminos`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/privacidad`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
