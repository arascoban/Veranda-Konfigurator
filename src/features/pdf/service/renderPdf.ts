import { PDFDocument, PageSizes, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { PdfPlanDrawing, PdfRow, PdfTemplate } from '../template/pdfTemplate';

const [PAGE_WIDTH, PAGE_HEIGHT] = PageSizes.A4;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_SPACE = 64;

function hex(value: string): RGB {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Same values as the UI tokens (TASARIM_PLANI_LUNA_SOL.md §3); print uses opaque surfaces only.
const colors = {
  anthracite: hex('#383E42'),
  text: hex('#20272B'),
  secondary: hex('#53616A'),
  border: hex('#738089'),
  surface: hex('#EEF1F2'),
  roof: hex('#DCE4E8'),
  white: rgb(1, 1, 1),
};

/** Standard PDF fonts use WinAnsi; typographic spaces from Intl are not part of it. */
export function toPdfText(text: string): string {
  return text.replace(/[    ]/g, ' ');
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of toPdfText(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
      // A single word wider than the column is split by characters instead of overflowing.
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

type Fonts = { regular: PDFFont; bold: PDFFont };

class Layout {
  page!: PDFPage;
  y = 0;
  readonly pages: PDFPage[] = [];

  constructor(private readonly doc: PDFDocument, private readonly fonts: Fonts, private readonly template: PdfTemplate) {}

  addPage(first: boolean) {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    const bandHeight = first ? 72 : 40;
    this.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - bandHeight, width: PAGE_WIDTH, height: bandHeight, color: colors.anthracite });
    const baseline = PAGE_HEIGHT - bandHeight / 2 - 5;
    this.text(this.template.brand, MARGIN, baseline, first ? 15 : 11, this.fonts.bold, colors.white);
    const label = this.template.documentLabel.toUpperCase();
    const size = first ? 11 : 9;
    this.text(label, PAGE_WIDTH - MARGIN - this.fonts.bold.widthOfTextAtSize(label, size), baseline, size, this.fonts.bold, colors.white);
    this.y = PAGE_HEIGHT - bandHeight - (first ? 36 : 28);
  }

  ensureSpace(height: number) {
    if (this.y - height < FOOTER_SPACE) this.addPage(false);
  }

  text(value: string, x: number, y: number, size: number, font: PDFFont, color: RGB = colors.text) {
    this.page.drawText(toPdfText(value), { x, y, size, font, color });
  }

  paragraph(value: string, x: number, width: number, size: number, font: PDFFont, color: RGB = colors.text, leading = size * 1.35) {
    for (const line of wrapText(value, font, size, width)) {
      this.ensureSpace(leading);
      this.text(line, x, this.y - size, size, font, color);
      this.y -= leading;
    }
  }

  heading(value: string, x: number, width: number) {
    this.ensureSpace(34);
    this.y -= 6;
    this.text(value, x, this.y - 12, 12, this.fonts.bold);
    this.y -= 18;
    this.page.drawLine({ start: { x, y: this.y }, end: { x: x + width, y: this.y }, thickness: 0.8, color: colors.anthracite });
    this.y -= 6;
  }

  rows(rows: PdfRow[], x: number, width: number, labelWidth: number) {
    const size = 9.5;
    const leading = 13;
    for (const row of rows) {
      const values = wrapText(row.value, this.fonts.bold, size, width - labelWidth);
      const labels = wrapText(row.label, this.fonts.regular, size, labelWidth - 6);
      const count = Math.max(values.length, labels.length);
      this.ensureSpace(count * leading + 4);
      labels.forEach((line, index) => this.text(line, x, this.y - size - index * leading, size, this.fonts.regular, colors.secondary));
      values.forEach((line, index) => this.text(line, x + labelWidth, this.y - size - index * leading, size, this.fonts.bold));
      this.y -= count * leading + 4;
    }
  }
}

function drawPlan(layout: Layout, fonts: Fonts, plan: PdfPlanDrawing, x: number, top: number, width: number, height: number) {
  const page = layout.page;
  page.drawRectangle({ x, y: top - height, width, height, borderColor: colors.border, borderWidth: 0.6 });
  const padX = 34;
  const padTop = 34;
  const padBottom = 40;
  const scale = Math.min((width - padX * 2) / plan.widthMm, (height - padTop - padBottom) / plan.depthMm);
  const w = plan.widthMm * scale;
  const d = plan.depthMm * scale;
  const left = x + (width - w) / 2;
  const wallY = top - height + padBottom + ((height - padTop - padBottom) - d) / 2;
  const frontY = wallY + d;

  page.drawRectangle({ x: left, y: wallY, width: w, height: d, color: colors.roof, borderColor: colors.border, borderWidth: 0.5 });
  for (const center of plan.roofSupportCentersMm) {
    const sx = left + center * scale;
    page.drawLine({ start: { x: sx, y: wallY }, end: { x: sx, y: frontY }, thickness: 0.7, color: colors.secondary });
  }
  // Wall line and gutter line.
  page.drawLine({ start: { x: left - 8, y: wallY }, end: { x: left + w + 8, y: wallY }, thickness: 3, color: colors.anthracite });
  page.drawLine({ start: { x: left, y: frontY }, end: { x: left + w, y: frontY }, thickness: 1.6, color: colors.anthracite });
  // Posts at scale, but never thinner than a visible mark; the garden side sits on the gutter line.
  const postW = Math.max(3, plan.postSectionMm.alongGutterMm * scale);
  const postD = Math.max(3, plan.postSectionMm.towardsGardenMm * scale);
  for (const center of plan.postCentersMm) {
    page.drawRectangle({ x: left + center * scale - postW / 2, y: frontY - postD, width: postW, height: postD, color: colors.anthracite });
  }

  const small = 8;
  const label = (value: string, cx: number, y: number, font = fonts.regular) =>
    layout.text(value, cx - font.widthOfTextAtSize(toPdfText(value), small) / 2, y, small, font, colors.secondary);

  // Width dimension above the gutter.
  const dimY = frontY + 14;
  page.drawLine({ start: { x: left, y: dimY }, end: { x: left + w, y: dimY }, thickness: 0.5, color: colors.secondary });
  for (const ex of [left, left + w]) page.drawLine({ start: { x: ex, y: dimY - 3 }, end: { x: ex, y: dimY + 3 }, thickness: 0.5, color: colors.secondary });
  label(formatCm(plan.widthMm), left + w / 2, dimY + 4, fonts.bold);

  // Depth dimension on the right, rotated.
  const dimX = left + w + 14;
  page.drawLine({ start: { x: dimX, y: wallY }, end: { x: dimX, y: frontY }, thickness: 0.5, color: colors.secondary });
  for (const ey of [wallY, frontY]) page.drawLine({ start: { x: dimX - 3, y: ey }, end: { x: dimX + 3, y: ey }, thickness: 0.5, color: colors.secondary });
  const depthText = toPdfText(formatCm(plan.depthMm));
  page.drawText(depthText, {
    x: dimX + 11, y: wallY + d / 2 - fonts.bold.widthOfTextAtSize(depthText, small) / 2,
    size: small, font: fonts.bold, color: colors.secondary, rotate: degrees(90),
  });

  label('Hauswand', left + w / 2, wallY - 14);
  layout.text('links', left, wallY - 14, small, fonts.regular, colors.secondary);
  layout.text('rechts', left + w - fonts.regular.widthOfTextAtSize('rechts', small), wallY - 14, small, fonts.regular, colors.secondary);
  label('Gartenseite · Stützen an der Rinne', left + w / 2, top - 14);
}

function formatCm(valueMm: number): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(valueMm / 10)} cm`;
}

/** Renders the template to an A4 PDF. Content that does not fit continues on a new page. */
export async function renderPdfDocument(template: PdfTemplate, createdAt: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${template.documentLabel} ${template.title}`);
  doc.setSubject(template.documentLabel);
  doc.setCreator(template.brand);
  doc.setProducer(template.brand);
  doc.setLanguage('de-DE');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const layout = new Layout(doc, fonts, template);
  layout.addPage(true);

  layout.paragraph(template.title, MARGIN, CONTENT_WIDTH, 20, fonts.bold, colors.text, 25);
  layout.paragraph(template.subtitle, MARGIN, CONTENT_WIDTH, 11, fonts.regular, colors.secondary, 16);
  layout.y -= 10;

  // Meta data in four columns.
  const metaWidth = CONTENT_WIDTH / template.meta.length;
  const metaTop = layout.y;
  let metaBottom = metaTop;
  template.meta.forEach((row, index) => {
    const x = MARGIN + index * metaWidth;
    layout.text(row.label, x, metaTop - 8, 8, fonts.regular, colors.secondary);
    wrapText(row.value, fonts.bold, 9.5, metaWidth - 8).forEach((line, lineIndex) => {
      layout.text(line, x, metaTop - 22 - lineIndex * 12, 9.5, fonts.bold);
      metaBottom = Math.min(metaBottom, metaTop - 26 - lineIndex * 12);
    });
  });
  layout.y = metaBottom - 10;

  // Two columns: facts on the left, the schematic plan on the right.
  const gutter = 24;
  const leftWidth = 232;
  const rightX = MARGIN + leftWidth + gutter;
  const rightWidth = CONTENT_WIDTH - leftWidth - gutter;
  const columnsTop = layout.y;
  const firstPage = layout.page;
  const planHeight = 250;
  drawPlan(layout, fonts, template.plan, rightX, columnsTop - 6, rightWidth, planHeight);
  layout.y = columnsTop - 6 - planHeight - 6;
  layout.paragraph(template.plan.caption, rightX, rightWidth, 8, fonts.regular, colors.secondary, 11);
  const rightBottom = layout.y;

  layout.y = columnsTop;
  for (const section of template.sections) {
    layout.heading(section.heading, MARGIN, leftWidth);
    layout.rows(section.rows, MARGIN, leftWidth, 96);
  }
  layout.y = layout.page === firstPage ? Math.min(layout.y, rightBottom) - 14 : layout.y - 14;

  // Price block.
  const priceSize = 9.5;
  const detailLines = template.price.details.flatMap((detail) => wrapText(detail, fonts.regular, priceSize, CONTENT_WIDTH - 32));
  const priceHeight = 20 + 18 + detailLines.length * 13 + template.price.lines.length * 13 + 14;
  layout.ensureSpace(priceHeight + 8);
  const boxTop = layout.y;
  layout.page.drawRectangle({ x: MARGIN, y: boxTop - priceHeight, width: CONTENT_WIDTH, height: priceHeight, color: colors.surface });
  layout.page.drawRectangle({ x: MARGIN, y: boxTop - priceHeight, width: 4, height: priceHeight, color: colors.anthracite });
  layout.text('Preis', MARGIN + 16, boxTop - 18, 9, fonts.regular, colors.secondary);
  layout.text(template.price.headline, MARGIN + 16, boxTop - 36, 14, fonts.bold);
  let priceY = boxTop - 52;
  for (const line of detailLines) {
    layout.text(line, MARGIN + 16, priceY, priceSize, fonts.regular, colors.secondary);
    priceY -= 13;
  }
  for (const row of template.price.lines) {
    layout.text(row.label, MARGIN + 16, priceY, priceSize, fonts.regular);
    layout.text(row.value, MARGIN + CONTENT_WIDTH - 16 - fonts.bold.widthOfTextAtSize(toPdfText(row.value), priceSize), priceY, priceSize, fonts.bold);
    priceY -= 13;
  }
  layout.y = boxTop - priceHeight - 10;

  layout.heading('Hinweise', MARGIN, CONTENT_WIDTH);
  for (const note of template.notes) {
    const lines = wrapText(note, fonts.regular, 9, CONTENT_WIDTH - 12);
    lines.forEach((line, index) => {
      layout.ensureSpace(12.5);
      if (index === 0) layout.text('•', MARGIN, layout.y - 9, 9, fonts.regular, colors.secondary);
      layout.text(line, MARGIN + 12, layout.y - 9, 9, fonts.regular, colors.secondary);
      layout.y -= 12.5;
    });
    layout.y -= 2;
  }

  const total = layout.pages.length;
  layout.pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_WIDTH - MARGIN, y: 40 }, thickness: 0.5, color: colors.border });
    page.drawText(toPdfText(template.footer), { x: MARGIN, y: 28, size: 8, font: fonts.regular, color: colors.secondary });
    const pageLabel = `Seite ${index + 1} von ${total}`;
    page.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(pageLabel, 8), y: 28, size: 8, font: fonts.regular, color: colors.secondary });
  });

  return doc.save();
}
