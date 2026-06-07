import { jsPDF } from 'jspdf';

export interface VoucherCard {
  code: string;
  packageName: string;
  durationHrs: number;
  priceUgx: number;
  expiresAt?: string | null;
  hotspotName?: string;
  validity?: string;
  supportPhones?: string[];
}

export interface VoucherPdfOptions {
  cards: VoucherCard[];
  businessName?: string;
  hotspotName?: string;
  domain?: string;
  supportPhones?: string[];
  brandColor?: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const COLS = 3;
const ROWS = 7;
const GAP = 4;
const CARD_W = (PAGE_W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = (PAGE_H - MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function durationLabel(hrs: number): string {
  if (!hrs) return 'Until used';
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function priceLabel(ugx: number): string {
  return ugx ? `UGX ${Number(ugx).toLocaleString('en-UG')}` : '';
}

function fitText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string {
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 4 && doc.getTextWidth(t + '...') > maxWidth) t = t.slice(0, -1);
  return t + '...';
}

function drawCutLines(doc: jsPDF) {
  const d = doc as any;
  d.setLineDash([0.7, 1.1], 0);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.15);
  for (let c = 1; c < COLS; c++) {
    const x = MARGIN + c * CARD_W + (c - 0.5) * GAP;
    doc.line(x, 4, x, PAGE_H - 4);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = MARGIN + r * CARD_H + (r - 0.5) * GAP;
    doc.line(4, y, PAGE_W - 4, y);
  }
  d.setLineDash([], 0);
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  idx: number,
  card: VoucherCard,
  opts: Required<Pick<VoucherPdfOptions, 'businessName' | 'hotspotName' | 'domain' | 'supportPhones' | 'brandColor'>>,
) {
  const [br, bg, bb] = hexToRgb(opts.brandColor);
  const hotspot = fitText(doc, card.hotspotName || opts.hotspotName, CARD_W - 8, 9);
  const pkg = fitText(doc, card.packageName || 'WiFi Package', CARD_W - 10, 7);
  const validity = card.validity || durationLabel(card.durationHrs);
  const support = (card.supportPhones?.length ? card.supportPhones : opts.supportPhones).filter(Boolean).join(' / ');
  const price = priceLabel(card.priceUgx);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, CARD_W, CARD_H, 2, 2, 'F');
  doc.setDrawColor(218, 224, 235);
  doc.roundedRect(x, y, CARD_W, CARD_H, 2, 2, 'S');

  doc.setFillColor(br, bg, bb);
  doc.roundedRect(x, y, CARD_W, 11, 2, 2, 'F');
  doc.rect(x, y + 8, CARD_W, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(hotspot, x + CARD_W / 2, y + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(105, 114, 128);
  doc.text('VOUCHER CODE', x + CARD_W / 2, y + 16.2, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(card.code.length > 10 ? 14 : 16);
  doc.setTextColor(17, 24, 39);
  doc.text(card.code, x + CARD_W / 2, y + 23, { align: 'center' });

  doc.setDrawColor(229, 231, 235);
  doc.line(x + 5, y + 26.5, x + CARD_W - 5, y + 26.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  doc.text(pkg, x + 5, y + 31.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(75, 85, 99);
  doc.text(`Validity: ${validity}`, x + 5, y + 35.2);
  if (price) doc.text(price, x + CARD_W - 5, y + 35.2, { align: 'right' });

  doc.setFontSize(5.5);
  doc.setTextColor(107, 114, 128);
  if (support) doc.text(`Support: ${support}`, x + 5, y + CARD_H - 7.4, { maxWidth: CARD_W - 10 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(br, bg, bb);
  doc.text('Powered by iCube', x + 5, y + CARD_H - 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`#${String(idx + 1).padStart(3, '0')}`, x + CARD_W - 5, y + CARD_H - 3.2, { align: 'right' });
}

export function buildVoucherPdf(opts: VoucherPdfOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const merged = {
    businessName: opts.businessName || 'iCube Hotspot',
    hotspotName: opts.hotspotName || opts.businessName || 'iCube Hotspot',
    domain: opts.domain || 'icubeug.net',
    supportPhones: opts.supportPhones || [],
    brandColor: opts.brandColor || '#2563eb',
  };

  const perPage = COLS * ROWS;
  const pages = Math.max(1, Math.ceil(opts.cards.length / perPage));
  for (let page = 0; page < pages; page++) {
    if (page > 0) doc.addPage();
    drawCutLines(doc);
    opts.cards.slice(page * perPage, (page + 1) * perPage).forEach((card, localIdx) => {
      const col = localIdx % COLS;
      const row = Math.floor(localIdx / COLS);
      drawCard(
        doc,
        MARGIN + col * (CARD_W + GAP),
        MARGIN + row * (CARD_H + GAP),
        page * perPage + localIdx,
        card,
        merged,
      );
    });
  }
  return doc;
}

export function downloadVoucherPdf(opts: VoucherPdfOptions, filename = 'vouchers.pdf'): void {
  buildVoucherPdf(opts).save(filename);
}

export function printVoucherPdf(opts: VoucherPdfOptions): void {
  const blob = buildVoucherPdf(opts).output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 500);
    });
  }
}
