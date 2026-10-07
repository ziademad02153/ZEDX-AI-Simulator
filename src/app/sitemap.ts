import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://zedx-ai.tech';

    const routes = [
        '',
        '/about',
        '/download',
        '/pricing',
        '/contact-sales',
        '/privacy',
        '/terms'
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        priority: route === '' ? 1 : 0.8,
    }));

    return routes;
}
