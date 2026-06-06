// Voucher PDF generator — A4 portrait, 4×9 grid (36 per page)
import { jsPDF } from 'jspdf';

export interface VoucherCard {
  code: string;
  packageName: string;
  durationHrs: number;
  priceUgx: number;
  expiresAt?: string | null;
}

export interface VoucherPdfOptions {
  cards: VoucherCard[];
  businessName?: string;
  domain?: string;
  brandColor?: string; // hex e.g. '#1a1a2e'
}

// ── Layout constants (all mm) ──────────────────────────────────────────────────
const PAGE_W  = 210;
const PAGE_H  = 297;
const MARGIN  = 10;
const COLS    = 4;
const ROWS    = 9;
const GAP_H   = 4;  // horizontal gap between columns
const GAP_V   = 4;  // vertical gap between rows

const CARD_W  = (PAGE_W - 2 * MARGIN - (COLS - 1) * GAP_H) / COLS;  // 44.5mm
const CARD_H  = (PAGE_H - 2 * MARGIN - (ROWS - 1) * GAP_V) / ROWS;  // ≈27.2mm

const HDR_H   = 6.5;  // header height
const ACC_H   = 0.8;  // accent stripe height
const FTR_H   = 4.5;  // footer height
const BODY_H  = CARD_H - HDR_H - ACC_H - FTR_H;

// ── Helpers ────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function fmtDuration(hrs: number): string {
  if (!hrs) return '';
  if (hrs < 1) return '';
  if (hrs < 24) return `${hrs}HR`;
  const d = Math.floor(hrs / 24);
  const h = hrs % 24;
  return h > 0 ? `${d}D ${h}H` : d === 1 ? '1 DAY' : `${d} DAYS`;
}

function fmtPrice(ugx: number): string {
  return `UGX ${Number(ugx).toLocaleString('en-UG')}`;
}

// ── Draw dashed cut lines across the full page ─────────────────────────────────
function drawCutLines(doc: jsPDF): void {
  const d = doc as any;
  d.setLineDash([0.8, 0.8], 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.18);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);

  // 3 vertical cut lines (between 4 columns)
  for (let c = 0; c < COLS - 1; c++) {
    const x = MARGIN + (c + 1) * CARD_W + c * GAP_H + GAP_H / 2;
    doc.line(x, 0, x, PAGE_H);
    doc.text('✂', x - 0.8, 3.5);
  }

  // 8 horizontal cut lines (between 9 rows)
  for (let r = 0; r < ROWS - 1; r++) {
    const y = MARGIN + (r + 1) * CARD_H + r * GAP_V + GAP_V / 2;
    doc.line(0, y, PAGE_W, y);
    doc.text('✂', 1.5, y + 0.8);
  }

  d.setLineDash([], 0);
}

// ── Draw one voucher card ──────────────────────────────────────────────────────
function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  idx: number,
  card: VoucherCard,
  businessName: string,
  domain: string,
  brandRgb: [number, number, number],
): void {
  const W = CARD_W;
  const H = CARD_H;
  const serial = `#${String(idx + 1).padStart(3, '0')}`;
  const durationLabel = fmtDuration(card.durationHrs);
  const priceLabel = fmtPrice(card.priceUgx);

  // ── Card base: white rounded rect ──
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, W, H, 1.5, 1.5, 'F');

  // ── Header: brand-color background ──
  // Draw brand-colored full rounded rect first (gets top rounded corners)
  doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.roundedRect(x, y, W, HDR_H + 2, 1.5, 1.5, 'F');
  // Square off the bottom of the header
  doc.rect(x, y + HDR_H - 0.5, W, 3, 'F');

  // Header text — "ISP HOTSPOT" subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(160, 175, 200);
  const d = doc as any;
  d.setCharSpace(1.5);
  doc.text('ISP HOTSPOT', x + W / 2, y + 2.4, { align: 'center' });

  // Business name — bold white
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  d.setCharSpace(0.2);
  const nameMaxW = W - 4;
  const nameTrunc = doc.getTextWidth(businessName) * (7 / doc.getFontSize()) > nameMaxW
    ? businessName.slice(0, 16) + (businessName.length > 16 ? '…' : '')
    : businessName;
  doc.text(nameTrunc.toUpperCase(), x + W / 2, y + HDR_H - 1.2, { align: 'center', maxWidth: nameMaxW });
  d.setCharSpace(0);

  // ── Accent stripe (blue) ──
  doc.setFillColor(37, 99, 235);
  doc.rect(x, y + HDR_H, W, ACC_H, 'F');

  // ── Body background (white) ──
  const bodyY = y + HDR_H + ACC_H;
  doc.setFillColor(255, 255, 255);
  doc.rect(x, bodyY, W, BODY_H, 'F');

  // "VOUCHER CODE" label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(153, 153, 153);
  d.setCharSpace(1);
  doc.text('VOUCHER CODE', x + W / 2, bodyY + 2.8, { align: 'center' });
  d.setCharSpace(0);

  // Code — big Courier bold
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 15, 15);
  d.setCharSpace(1.2);
  // Scale down if code is long
  const codeLen = card.code.length;
  const codeFontSize = codeLen <= 8 ? 13 : codeLen <= 10 ? 11 : 9;
  doc.setFontSize(codeFontSize);
  doc.text(card.code, x + W / 2, bodyY + 7.2, { align: 'center' });
  d.setCharSpace(0);

  // ── Pills row ──
  const pillY = bodyY + 10.2;
  const pillH = 3;
  const pillR = 0.8;
  const pkgText = card.packageName.length > 12 ? card.packageName.slice(0, 12) + '…' : card.packageName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);

  // Package pill — blue
  const pkgW = doc.getTextWidth(pkgText) + 3.5;
  const pkgPillX = x + 2.5;
  doc.setFillColor(219, 234, 254);
  doc.roundedRect(pkgPillX, pillY - 2.5, pkgW, pillH, pillR, pillR, 'F');
  doc.setTextColor(30, 64, 175);
  doc.text(pkgText, pkgPillX + pkgW / 2, pillY - 0.6, { align: 'center' });

  // Duration pill — green (only if we have a label)
  if (durationLabel) {
    const durW = doc.getTextWidth(durationLabel) + 3.5;
    const durPillX = pkgPillX + pkgW + 1.5;
    if (durPillX + durW < x + W - 1) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(durPillX, pillY - 2.5, durW, pillH, pillR, pillR, 'F');
      doc.setTextColor(21, 128, 61);
      doc.text(durationLabel, durPillX + durW / 2, pillY - 0.6, { align: 'center' });
    }
  }

  // ── Price + serial ──
  const priceY = bodyY + BODY_H - 0.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(153, 153, 153);
  d.setCharSpace(0.5);
  doc.text('PRICE', x + 2.5, priceY - 2.2);
  d.setCharSpace(0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 15, 15);
  doc.text(priceLabel, x + 2.5, priceY);

  // Serial number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(204, 204, 204);
  doc.text(serial, x + W - 2, priceY, { align: 'right' });

  // ── Footer background (#f9f9f9) ──
  const footerY = y + H - FTR_H;
  doc.setFillColor(249, 249, 249);
  // Rounded at bottom
  doc.roundedRect(x, footerY - 1, W, FTR_H + 1.5, 1.5, 1.5, 'F');
  // Square off the top of footer
  doc.rect(x, footerY - 1, W, 2, 'F');

  // Footer separator line
  doc.setDrawColor(229, 229, 229);
  doc.setLineWidth(0.15);
  doc.line(x, footerY, x + W, footerY);

  // Footer left: domain
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(136, 136, 136);
  doc.text(domain, x + 2.5, footerY + 3);

  // Footer right: green dot (unused = valid)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(34, 197, 94);
  doc.text('●', x + W - 2.5, footerY + 3, { align: 'right' });

  // ── Card border ── (drawn last so it's on top)
  doc.setDrawColor(229, 229, 229);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, W, H, 1.5, 1.5, 'S');
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function buildVoucherPdf(opts: VoucherPdfOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brandRgb = hexToRgb(opts.brandColor || '#1a1a2e');
  const businessName = opts.businessName || 'ISP HOTSPOT';
  const domain = opts.domain || 'web.icubeug.net';

  const perPage = COLS * ROWS;
  const totalPages = Math.max(1, Math.ceil(opts.cards.length / perPage));

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();
    drawCutLines(doc);

    const pageCodes = opts.cards.slice(p * perPage, (p + 1) * perPage);
    pageCodes.forEach((card, localIdx) => {
      const globalIdx = p * perPage + localIdx;
      const col = localIdx % COLS;
      const row = Math.floor(localIdx / COLS);
      const cx = MARGIN + col * (CARD_W + GAP_H);
      const cy = MARGIN + row * (CARD_H + GAP_V);
      drawCard(doc, cx, cy, globalIdx, card, businessName, domain, brandRgb);
    });
  }

  return doc;
}

export function downloadVoucherPdf(opts: VoucherPdfOptions, filename = 'vouchers.pdf'): void {
  buildVoucherPdf(opts).save(filename);
}

export function printVoucherPdf(opts: VoucherPdfOptions): void {
  const blob = buildVoucherPdf(opts).output('blob');
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url, '_blank');
  if (w) {
    w.addEventListener('load', () => {
      setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 500);
    });
  }
}
