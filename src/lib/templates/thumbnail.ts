import type { TemplateArchetype, TemplateDefinition } from "./types";

/**
 * Generates a template's preview image as SVG.
 *
 * Why generate rather than ship 64 PNGs: a screenshot of a running app
 * would be a fabrication (none of these have been generated yet), and a
 * stock photograph tells the reader nothing about what they would get. A
 * wireframe drawn from the template's own archetype is honest and
 * informative — a CRM shows a pipeline, a chat app shows a conversation,
 * a storefront shows a product grid. It is labelled in the UI as a layout
 * preview, not as a screenshot.
 *
 * Everything is deterministic from the template's slug, so the same
 * template always looks the same, and pure, so it renders identically on
 * the server and in a test.
 */

const WIDTH = 640;
const HEIGHT = 400;

/** Neutral chrome that reads correctly against Appo's dark surfaces. */
const INK = {
  canvas: "#0F1014",
  surface: "#16181F",
  raised: "#1D202A",
  line: "#272A33",
  text: "#3A3F4B",
  textStrong: "#565C6B",
};

/**
 * Deterministic 32-bit hash of the slug, used to vary block widths so the
 * previews are not 64 identical wireframes.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function varier(seed: string) {
  let state = hash(seed) || 1;
  return (min: number, max: number): number => {
    // xorshift32 — small, deterministic, no dependency.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return min + (state % Math.max(1, max - min + 1));
  };
}

function rect(x: number, y: number, w: number, h: number, fill: string, rx = 4, opacity?: number): string {
  const op = opacity === undefined ? "" : ` opacity="${opacity}"`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${op}/>`;
}

function circle(cx: number, cy: number, r: number, fill: string, opacity?: number): string {
  const op = opacity === undefined ? "" : ` opacity="${opacity}"`;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${op}/>`;
}

/** The window chrome every preview sits inside. */
function chrome(accent: string): string {
  return [
    rect(0, 0, WIDTH, HEIGHT, INK.canvas, 0),
    rect(0, 0, WIDTH, 34, INK.surface, 0),
    circle(20, 17, 4.5, INK.line),
    circle(36, 17, 4.5, INK.line),
    circle(52, 17, 4.5, INK.line),
    rect(76, 10, 180, 14, INK.raised, 7),
    rect(WIDTH - 60, 10, 44, 14, accent, 7, 0.35),
    `<line x1="0" y1="34" x2="${WIDTH}" y2="34" stroke="${INK.line}" stroke-width="1"/>`,
  ].join("");
}

function sidebar(accent: string, next: (min: number, max: number) => number): string {
  const parts = [rect(0, 34, 132, HEIGHT - 34, INK.surface, 0)];
  parts.push(rect(16, 52, 22, 22, accent, 6, 0.7));
  parts.push(rect(46, 58, next(40, 62), 10, INK.text, 3));
  for (let i = 0; i < 7; i++) {
    const y = 96 + i * 30;
    if (i === 1) parts.push(rect(12, y - 7, 108, 26, accent, 7, 0.16));
    parts.push(rect(20, y, 12, 12, i === 1 ? accent : INK.text, 3));
    parts.push(rect(40, y + 2, next(46, 76), 9, i === 1 ? INK.textStrong : INK.text, 3));
  }
  return parts.join("");
}

function header(x: number, accent: string, next: (min: number, max: number) => number, width: number): string {
  return [
    rect(x, 58, next(120, 190), 16, INK.textStrong, 5),
    rect(x, 84, next(180, 260), 9, INK.text, 4),
    rect(x + width - 96, 58, 88, 26, accent, 7, 0.85),
  ].join("");
}

type Painter = (accent: string, next: (min: number, max: number) => number) => string;

/**
 * One painter per archetype. Each draws a recognisably different product
 * shape — that is the entire point of the archetype field.
 */
const PAINTERS: Record<TemplateArchetype, Painter> = {
  dashboard: (accent, next) => {
    const parts = [sidebar(accent, next), header(160, accent, next, 464)];
    for (let i = 0; i < 3; i++) {
      const x = 160 + i * 156;
      parts.push(rect(x, 112, 144, 66, INK.surface, 8));
      parts.push(rect(x + 14, 126, next(40, 62), 8, INK.text, 3));
      parts.push(rect(x + 14, 144, next(48, 70), 16, i === 0 ? accent : INK.textStrong, 4, i === 0 ? 0.9 : 1));
    }
    parts.push(rect(160, 192, 300, 176, INK.surface, 8));
    // A simple area chart so a dashboard reads as a dashboard.
    const points: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const x = 176 + i * 27;
      const y = 340 - next(20, 110);
      points.push(`${x},${y}`);
    }
    parts.push(`<polyline points="${points.join(" ")}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round"/>`);
    parts.push(`<polygon points="176,352 ${points.join(" ")} 446,352" fill="${accent}" opacity="0.12"/>`);
    parts.push(rect(472, 192, 152, 176, INK.surface, 8));
    for (let i = 0; i < 5; i++) {
      parts.push(circle(490, 216 + i * 30, 7, INK.raised));
      parts.push(rect(506, 211 + i * 30, next(60, 100), 9, INK.text, 3));
    }
    return parts.join("");
  },

  feed: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    for (let i = 0; i < 2; i++) {
      const y = 54 + i * 168;
      parts.push(rect(150, y, 340, 152, INK.surface, 10));
      parts.push(circle(172, y + 24, 12, accent, 0.6));
      parts.push(rect(192, y + 16, next(70, 110), 9, INK.textStrong, 3));
      parts.push(rect(192, y + 30, next(50, 74), 7, INK.text, 3));
      parts.push(rect(164, y + 48, 312, 68, INK.raised, 6));
      for (let a = 0; a < 3; a++) {
        parts.push(circle(174 + a * 30, y + 132, 6, INK.text));
        parts.push(rect(184 + a * 30, y + 128, 14, 8, INK.text, 3));
      }
    }
    parts.push(rect(510, 54, 114, 90, INK.surface, 10));
    parts.push(rect(510, 158, 114, 120, INK.surface, 10));
    return parts.join("");
  },

  list: (accent, next) => {
    const parts = [sidebar(accent, next), header(160, accent, next, 464)];
    for (let i = 0; i < 6; i++) {
      const y = 112 + i * 44;
      parts.push(rect(160, y, 464, 36, i % 2 === 0 ? INK.surface : "transparent", 6));
      parts.push(rect(172, y + 12, 12, 12, i === 0 ? accent : INK.text, 3));
      parts.push(rect(194, y + 10, next(120, 240), 9, INK.textStrong, 3));
      parts.push(rect(194, y + 24, next(80, 150), 7, INK.text, 3));
      parts.push(rect(560, y + 12, next(28, 52), 12, INK.raised, 6));
    }
    return parts.join("");
  },

  table: (accent, next) => {
    const parts = [sidebar(accent, next), header(160, accent, next, 464)];
    parts.push(rect(160, 112, 464, 26, INK.surface, 6));
    for (let c = 0; c < 4; c++) parts.push(rect(174 + c * 116, 121, next(44, 76), 8, INK.text, 3));
    for (let r = 0; r < 7; r++) {
      const y = 146 + r * 32;
      parts.push(`<line x1="160" y1="${y + 26}" x2="624" y2="${y + 26}" stroke="${INK.line}" stroke-width="1"/>`);
      for (let c = 0; c < 4; c++) {
        const fill = c === 3 && r % 3 === 0 ? accent : INK.text;
        parts.push(rect(174 + c * 116, y + 9, next(38, 88), 8, fill, 3, c === 3 && r % 3 === 0 ? 0.7 : 1));
      }
    }
    return parts.join("");
  },

  chat: (accent, next) => {
    const parts = [rect(0, 34, 176, HEIGHT - 34, INK.surface, 0)];
    for (let i = 0; i < 6; i++) {
      const y = 56 + i * 46;
      if (i === 0) parts.push(rect(8, y - 8, 160, 40, accent, 8, 0.14));
      parts.push(circle(30, y + 10, 12, i === 0 ? accent : INK.raised, i === 0 ? 0.7 : 1));
      parts.push(rect(50, y + 2, next(60, 100), 9, INK.textStrong, 3));
      parts.push(rect(50, y + 17, next(40, 96), 7, INK.text, 3));
    }
    const bubbles = [
      { x: 200, w: 210, h: 44, mine: false },
      { x: 330, w: 250, h: 34, mine: true },
      { x: 200, w: 180, h: 34, mine: false },
      { x: 300, w: 280, h: 56, mine: true },
    ];
    let y = 60;
    for (const b of bubbles) {
      parts.push(rect(b.x, y, b.w, b.h, b.mine ? accent : INK.surface, 12, b.mine ? 0.75 : 1));
      y += b.h + 16;
    }
    parts.push(rect(200, HEIGHT - 58, 424, 38, INK.surface, 10));
    parts.push(rect(216, HEIGHT - 44, next(90, 170), 9, INK.text, 3));
    parts.push(circle(602, HEIGHT - 39, 12, accent, 0.85));
    return parts.join("");
  },

  kanban: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0), header(28, accent, next, 596)];
    for (let col = 0; col < 4; col++) {
      const x = 28 + col * 150;
      parts.push(rect(x, 112, 138, 264, INK.surface, 8));
      parts.push(rect(x + 12, 124, next(50, 80), 9, INK.textStrong, 3));
      parts.push(circle(x + 122, 128, 6, col === 1 ? accent : INK.raised, col === 1 ? 0.8 : 1));
      // Cards are laid out against the column's real bottom edge (112 + 264
      // minus padding) so a column with more cards packs them tighter
      // instead of spilling outside the board.
      const columnBottom = 112 + 264 - 12;
      let cardY = 146;
      const cards = 2 + (col % 3);
      for (let c = 0; c < cards; c++) {
        const h = Math.min(next(44, 62), columnBottom - cardY - 10 * (cards - c - 1));
        if (h < 30) break;
        parts.push(rect(x + 10, cardY, 118, h, INK.raised, 6));
        parts.push(rect(x + 20, cardY + 12, next(50, 96), 8, INK.text, 3));
        parts.push(rect(x + 20, cardY + h - 18, 26, 8, col === 1 ? accent : INK.text, 4, col === 1 ? 0.7 : 1));
        cardY += h + 10;
      }
    }
    return parts.join("");
  },

  storefront: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(28, 54, next(120, 170), 14, INK.textStrong, 5));
    parts.push(rect(WIDTH - 148, 52, 120, 22, INK.surface, 8));
    for (let i = 0; i < 6; i++) {
      const x = 28 + (i % 3) * 200;
      const y = 92 + Math.floor(i / 3) * 148;
      parts.push(rect(x, y, 184, 132, INK.surface, 10));
      parts.push(rect(x + 12, y + 12, 160, 68, INK.raised, 6));
      parts.push(rect(x + 12, y + 90, next(70, 130), 9, INK.textStrong, 3));
      parts.push(rect(x + 12, y + 106, 42, 10, accent, 4, 0.85));
      parts.push(rect(x + 138, y + 102, 34, 16, accent, 6, 0.25));
    }
    return parts.join("");
  },

  calendar: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0), header(28, accent, next, 596)];
    for (let d = 0; d < 7; d++) parts.push(rect(30 + d * 84, 112, 44, 8, INK.text, 3));
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 7; col++) {
        const x = 28 + col * 84;
        const y = 132 + row * 62;
        const isToday = row === 1 && col === 3;
        parts.push(rect(x, y, 76, 54, isToday ? INK.raised : INK.surface, 6));
        parts.push(rect(x + 8, y + 8, 12, 7, isToday ? accent : INK.text, 2));
        if ((row + col) % 3 === 0) parts.push(rect(x + 8, y + 24, next(30, 58), 9, accent, 3, 0.7));
        if ((row + col) % 4 === 1) parts.push(rect(x + 8, y + 38, next(24, 50), 9, INK.text, 3));
      }
    }
    return parts.join("");
  },

  profile: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(0, 34, WIDTH, 96, accent, 0, 0.18));
    parts.push(circle(96, 130, 38, INK.surface));
    parts.push(circle(96, 130, 32, accent, 0.55));
    parts.push(rect(150, 116, next(120, 180), 14, INK.textStrong, 5));
    parts.push(rect(150, 140, next(180, 250), 9, INK.text, 4));
    parts.push(rect(WIDTH - 140, 118, 112, 28, accent, 8, 0.85));
    for (let i = 0; i < 3; i++) {
      parts.push(rect(28 + i * 200, 192, 184, 74, INK.surface, 8));
      parts.push(rect(44 + i * 200, 208, next(40, 64), 8, INK.text, 3));
      parts.push(rect(44 + i * 200, 226, next(50, 84), 16, INK.textStrong, 4));
    }
    parts.push(rect(28, 282, 584, 92, INK.surface, 8));
    return parts.join("");
  },

  editor: (accent, next) => {
    const parts = [rect(0, 34, 150, HEIGHT - 34, INK.surface, 0)];
    for (let i = 0; i < 8; i++) {
      const indent = i % 3 === 2 ? 16 : 0;
      parts.push(rect(20 + indent, 58 + i * 28, 10, 10, i === 2 ? accent : INK.text, 2));
      parts.push(rect(38 + indent, 59 + i * 28, next(48, 86 - indent), 8, i === 2 ? INK.textStrong : INK.text, 3));
    }
    parts.push(rect(178, 58, next(180, 280), 18, INK.textStrong, 5));
    let y = 96;
    for (let i = 0; i < 9; i++) {
      const w = next(180, 430);
      parts.push(rect(178, y, w, 9, INK.text, 3));
      y += i === 3 ? 34 : 22;
      if (i === 3) parts.push(rect(178, y - 26, 200, 14, accent, 4, 0.3));
    }
    parts.push(rect(178, HEIGHT - 44, 120, 22, accent, 7, 0.75));
    return parts.join("");
  },

  map: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.surface, 0)];
    // Suggestive street grid rather than a fake map tile.
    for (let i = 1; i < 8; i++) {
      parts.push(`<line x1="${i * 80}" y1="34" x2="${i * 80 - 30}" y2="${HEIGHT}" stroke="${INK.line}" stroke-width="1.5"/>`);
    }
    for (let i = 1; i < 5; i++) {
      parts.push(`<line x1="0" y1="${34 + i * 74}" x2="${WIDTH}" y2="${34 + i * 74 + 12}" stroke="${INK.line}" stroke-width="1.5"/>`);
    }
    parts.push(`<path d="M 120 360 C 200 300, 260 280, 330 220 S 460 140, 540 110" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`);
    for (const [cx, cy] of [[120, 360], [330, 220], [540, 110]] as const) {
      parts.push(circle(cx, cy, 9, accent));
      parts.push(circle(cx, cy, 16, accent, 0.2));
    }
    parts.push(rect(24, 54, 208, 108, INK.canvas, 10, 0.94));
    parts.push(rect(40, 70, next(90, 140), 10, INK.textStrong, 3));
    parts.push(rect(40, 90, next(120, 170), 8, INK.text, 3));
    parts.push(rect(40, 122, 90, 22, accent, 7, 0.85));
    return parts.join("");
  },

  gallery: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(28, 54, next(110, 160), 14, INK.textStrong, 5));
    const heights = [140, 96, 118, 96, 140, 118];
    let x = 28;
    for (let col = 0; col < 3; col++) {
      let y = 90;
      for (let row = 0; row < 2; row++) {
        const h = heights[(col * 2 + row) % heights.length];
        parts.push(rect(x, y, 184, h, INK.surface, 10));
        parts.push(rect(x, y, 184, h, accent, 10, col === 1 && row === 0 ? 0.22 : 0.07));
        y += h + 14;
      }
      x += 200;
    }
    return parts.join("");
  },

  landing: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(0, 34, WIDTH, 40, INK.surface, 0));
    parts.push(rect(24, 48, 60, 12, accent, 4, 0.8));
    for (let i = 0; i < 4; i++) parts.push(rect(WIDTH - 232 + i * 52, 50, 36, 8, INK.text, 3));
    parts.push(rect(140, 108, 360, 20, INK.textStrong, 6));
    parts.push(rect(190, 138, 260, 20, INK.textStrong, 6));
    parts.push(rect(180, 176, 280, 9, INK.text, 4));
    parts.push(rect(216, 194, 208, 9, INK.text, 4));
    parts.push(rect(220, 224, 100, 30, accent, 9));
    parts.push(rect(332, 224, 92, 30, INK.surface, 9));
    for (let i = 0; i < 3; i++) {
      parts.push(rect(60 + i * 176, 288, 160, 84, INK.surface, 10));
      parts.push(rect(76 + i * 176, 304, 22, 22, accent, 6, 0.5));
      parts.push(rect(76 + i * 176, 336, next(70, 120), 8, INK.text, 3));
      parts.push(rect(76 + i * 176, 350, next(50, 96), 8, INK.text, 3));
    }
    return parts.join("");
  },

  form: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(168, 60, 304, 300, INK.surface, 12));
    parts.push(rect(192, 84, next(120, 190), 14, INK.textStrong, 5));
    parts.push(rect(192, 106, next(160, 250), 8, INK.text, 3));
    let y = 138;
    for (let i = 0; i < 4; i++) {
      parts.push(rect(192, y, next(50, 84), 8, INK.text, 3));
      parts.push(rect(192, y + 16, 256, 28, INK.raised, 7));
      if (i === 1) parts.push(rect(192, y + 16, 256, 28, accent, 7, 0.14));
      y += 56;
    }
    parts.push(rect(192, 344, 110, 26, accent, 7));
    return parts.join("");
  },

  player: (accent, next) => {
    const parts = [rect(0, 34, WIDTH, HEIGHT - 34, INK.canvas, 0)];
    parts.push(rect(48, 68, 200, 200, INK.surface, 14));
    parts.push(rect(48, 68, 200, 200, accent, 14, 0.24));
    parts.push(circle(148, 168, 30, INK.canvas, 0.55));
    parts.push(`<polygon points="140,156 168,168 140,180" fill="${accent}"/>`);
    parts.push(rect(280, 92, next(160, 230), 16, INK.textStrong, 5));
    parts.push(rect(280, 118, next(110, 170), 9, INK.text, 4));
    for (let i = 0; i < 4; i++) {
      parts.push(rect(280, 156 + i * 34, 12, 12, INK.text, 3));
      parts.push(rect(302, 157 + i * 34, next(120, 260), 9, i === 0 ? INK.textStrong : INK.text, 3));
    }
    parts.push(rect(48, 306, 544, 5, INK.raised, 3));
    parts.push(rect(48, 306, next(140, 380), 5, accent, 3));
    for (let i = 0; i < 3; i++) parts.push(circle(276 + i * 44, 348, i === 1 ? 15 : 10, i === 1 ? accent : INK.raised));
    return parts.join("");
  },
};

/**
 * Renders the SVG preview for a template. Deterministic and pure — the
 * same template always produces byte-identical output, which is what makes
 * long-lived HTTP caching on the thumbnail route safe.
 */
export function renderTemplateThumbnail(template: Pick<TemplateDefinition, "slug" | "archetype" | "accent" | "name">): string {
  const next = varier(template.slug);
  const painter = PAINTERS[template.archetype] ?? PAINTERS.dashboard;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Layout preview: ${escapeAttribute(template.name)}">`,
    `<defs><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${template.accent}" stop-opacity="0.20"/>`,
    `<stop offset="60%" stop-color="${template.accent}" stop-opacity="0"/>`,
    `</linearGradient></defs>`,
    rect(0, 0, WIDTH, HEIGHT, INK.canvas, 0),
    chrome(template.accent),
    painter(template.accent, next),
    // A single restrained accent wash, top-left, so the previews read as a
    // set without every one of them being a gradient.
    rect(0, 0, WIDTH, HEIGHT, "url(#glow)", 0),
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="0" fill="none" stroke="${INK.line}"/>`,
    `</svg>`,
  ].join("");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inline data URI, for the rare place a URL cannot be used. */
export function thumbnailDataUri(template: Pick<TemplateDefinition, "slug" | "archetype" | "accent" | "name">): string {
  return `data:image/svg+xml;base64,${Buffer.from(renderTemplateThumbnail(template), "utf8").toString("base64")}`;
}

export const THUMBNAIL_DIMENSIONS = { width: WIDTH, height: HEIGHT };
