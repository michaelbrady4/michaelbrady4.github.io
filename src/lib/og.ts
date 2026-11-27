/**
 * Build-time social preview images (Open Graph). One 1200x630 PNG per page and per blog post,
 * drawn as SVG with the site's tokens and rendered by resvg. No network and no paid service.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { site } from '../site';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export type OgCard = {
  /** Path under /og/ without the extension, e.g. "home" or "blog/my-post". */
  slug: string;
  title: string;
  subtitle?: string;
};

/** The fixed pages. Blog posts are added in src/pages/og/[...slug].png.ts. */
export const staticCards: OgCard[] = [
  { slug: 'home', title: site.name, subtitle: site.role },
  { slug: 'projects', title: 'Projects', subtitle: 'Selected projects by Michael Brady.' },
  { slug: 'library', title: 'Library', subtitle: 'Books, films, and videos I want to remember.' },
  { slug: 'blog', title: 'Blog', subtitle: 'Notes and posts by Michael Brady.' },
];

const known = new Set(staticCards.map((card) => card.slug));

/** The image path for a page. Unknown paths (like the 404 page) use the home card. */
export function ogImagePath(pathname: string): string {
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  if (!slug) return '/og/home.png';
  if (known.has(slug) || /^blog\/[^/]+$/.test(slug)) return `/og/${slug}.png`;
  return '/og/home.png';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Greedy word wrap by an estimated character width. Good enough for short titles. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s.,;:]+$/, '')}...`;
    return kept;
  }
  return lines;
}

function svgFor({ title, subtitle }: OgCard): string {
  const titleSize = title.length > 60 ? 56 : title.length > 40 ? 64 : title.length > 22 ? 76 : 92;
  const titleChars = Math.floor(720 / (titleSize * 0.54));
  const titleLines = wrap(title, titleChars, titleSize <= 56 ? 4 : 3);
  const subtitleLines = subtitle ? wrap(subtitle, 44, 2) : [];
  const titleLineHeight = Math.round(titleSize * 1.06);
  const subtitleSize = 34;
  const subtitleLineHeight = 46;

  const blockHeight =
    titleLines.length * titleLineHeight +
    (subtitleLines.length ? 28 + subtitleLines.length * subtitleLineHeight : 0);
  const top = Math.round((OG_HEIGHT - blockHeight) / 2) + titleSize * 0.82;

  const titleText = titleLines
    .map((line, i) => `<tspan x="88" y="${Math.round(top + i * titleLineHeight)}">${escapeXml(line)}</tspan>`)
    .join('');
  const subtitleTop = top + (titleLines.length - 1) * titleLineHeight + 28 + subtitleLineHeight;
  const subtitleText = subtitleLines
    .map(
      (line, i) =>
        `<tspan x="88" y="${Math.round(subtitleTop + i * subtitleLineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join('');
  const host = new URL(site.url).host;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <radialGradient id="orb" cx="34%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#f6ead6"/>
      <stop offset="40%" stop-color="#c9a36c"/>
      <stop offset="76%" stop-color="#6a88aa"/>
      <stop offset="100%" stop-color="#3d5d80"/>
    </radialGradient>
    <radialGradient id="cool" cx="0" cy="0.34" r="0.6">
      <stop offset="0%" stop-color="rgb(86,116,150)" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="rgb(86,116,150)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="warm" cx="1" cy="0" r="0.7">
      <stop offset="0%" stop-color="rgb(168,132,84)" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="rgb(168,132,84)" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="48"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#f3f1ec"/>
  <rect width="100%" height="100%" fill="url(#cool)"/>
  <rect width="100%" height="100%" fill="url(#warm)"/>
  <circle cx="1010" cy="420" r="210" fill="url(#orb)" opacity="0.55" filter="url(#soft)"/>
  <circle cx="1010" cy="420" r="150" fill="url(#orb)"/>
  <circle cx="102" cy="88" r="14" fill="url(#orb)"/>
  ${title === site.name ? '' : `<text x="128" y="98" font-family="Geist" font-weight="600" font-size="28" fill="#1a1c1f" letter-spacing="-0.4">${escapeXml(site.name)}</text>`}
  <text font-family="Geist" font-weight="600" font-size="${titleSize}" fill="#1a1c1f" letter-spacing="${(-titleSize * 0.035).toFixed(1)}">${titleText}</text>
  <text font-family="Geist" font-weight="400" font-size="${subtitleSize}" fill="#3c424e" letter-spacing="-0.3">${subtitleText}</text>
  <text x="88" y="566" font-family="Geist" font-weight="400" font-size="24" fill="#565d69">${escapeXml(host)}</text>
</svg>`;
}

let fontFiles: string[] | null = null;

function fonts(): string[] {
  if (!fontFiles) {
    const dir = resolve(process.cwd(), 'src/og/fonts');
    fontFiles = ['Geist-Regular.ttf', 'Geist-SemiBold.ttf'].map((name) => {
      const file = resolve(dir, name);
      readFileSync(file); // Fail the build loudly if a font is missing.
      return file;
    });
  }
  return fontFiles;
}

export function renderOgPng(card: OgCard): Buffer {
  const resvg = new Resvg(svgFor(card), {
    font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: 'Geist' },
    fitTo: { mode: 'width', value: OG_WIDTH },
  });
  return resvg.render().asPng();
}
