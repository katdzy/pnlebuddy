/*
 * Turns `pdftohtml -xml` output into plain lines, marking text that is bold or
 * green with ⟦KEY⟧. Many Philippine review files show the answer that way:
 * the correct option in bold (e.g. NURSING-TEST-1 sets), or in green on
 * Google Forms exports (wrong picks are red).
 *
 * Two-column option layouts ("A. ...      C. ...") are split into separate
 * lines so each option keeps its own formatting.
 */
export const KEY = "⟦KEY⟧";

interface Seg {
  top: number;
  left: number;
  width: number;
  text: string;
  bold: boolean;
  green: boolean;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function isGreen(hex: string): boolean {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  return g > 90 && g > r + 40 && g > b + 15;
}

export function layoutToText(xml: string): string {
  const fonts = new Map<string, { bold: boolean; green: boolean }>();
  for (const m of xml.matchAll(/<fontspec id="(\d+)"[^>]*family="([^"]*)"[^>]*color="([^"]*)"/g)) {
    fonts.set(m[1], { bold: /bold|black|heavy/i.test(m[2]), green: isGreen(m[3]) });
  }
  const pages: string[] = [];
  for (const pm of xml.matchAll(/<page number="(\d+)"[^>]*?width="(\d+)"[\s\S]*?<\/page>/g)) {
    const mid = Number(pm[2]) / 2;
    const segs: Seg[] = [];
    for (const t of pm[0].matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="\d+" font="(\d+)">([\s\S]*?)<\/text>/g)) {
      const inner = t[5];
      const text = decode(inner);
      if (!text.trim()) continue;
      const font = fonts.get(t[4]) ?? { bold: false, green: false };
      const boldTag = /<b>/.test(inner) && decode(inner.replace(/<b>[\s\S]*?<\/b>/g, "")).trim() === "";
      segs.push({
        top: Number(t[1]),
        left: Number(t[2]),
        width: Number(t[3]),
        text,
        bold: font.bold || boldTag,
        green: font.green,
      });
    }
    segs.sort((a, b) => a.top - b.top || a.left - b.left);

    const group = (list: Seg[]) => {
      const lines: Seg[][] = [];
      for (const s of list) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last[0].top - s.top) <= 4) last.push(s);
        else lines.push([s]);
      }
      return lines;
    };

    // Two-column pages: many lines have text both left of and right of the middle.
    let lines = group(segs);
    const split = lines.filter(
      (l) => l.some((s) => s.left + s.width < mid + 5) && l.some((s) => s.left >= mid - 5),
    ).length;
    if (lines.length > 8 && split >= lines.length * 0.4) {
      const left = segs.filter((s) => s.left < mid - 5);
      const right = segs.filter((s) => s.left >= mid - 5);
      lines = [...group(left), ...group(right)];
    }

    const out: string[] = [];
    for (const line of lines) {
      line.sort((a, b) => a.left - b.left);
      // Split where a wide gap is followed by an option letter (two-column options).
      const parts: Seg[][] = [[]];
      for (const s of line) {
        const cur = parts[parts.length - 1];
        const prev = cur[cur.length - 1];
        if (prev && s.left - (prev.left + prev.width) > 25 && /^\s*[A-Da-d][.)]\s/.test(s.text)) parts.push([s]);
        else cur.push(s);
      }
      for (const p of parts) {
        if (!p.length) continue;
        const text = p.map((s) => s.text).join("").replace(/\s+/g, " ").trim();
        const chars = p.reduce((n, s) => n + s.text.trim().length, 0);
        const keyed = p.reduce((n, s) => n + (s.bold || s.green ? s.text.trim().length : 0), 0);
        out.push(keyed > 0 && keyed >= chars * 0.6 ? `${text} ${KEY}` : text);
      }
    }
    pages.push(out.join("\n"));
  }
  return pages.join("\n\f");
}
