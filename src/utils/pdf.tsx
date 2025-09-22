// PDF generation utilities using jsPDF and HTML capture

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { InvoiceTemplate } from '@/components/documents/InvoiceTemplate';
import { PackingListTemplate } from '@/components/documents/PackingListTemplate';
import type { ShipmentWithItems, Product, Partner, Company } from '@/mocks/seeds';
import type { CostLine, CostSummary, Payment } from '@/mocks/types';
import { formatFcfa } from './currency';

interface DocumentMeta {
  number: string;
  date: string;
  signatureName?: string;
  version: number;
}

interface LegacyDocumentMeta {
  number: string;
  date: string;
  signatureName?: string;
}

interface RenderResult {
  dataUrl: string;
  fileName: string;
}

const generateQR = async (data: unknown): Promise<string> => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data));
  } catch (error) {
    console.error('QR generation failed:', error);
    return '';
  }
};

const addFooter = (pdf: jsPDF, pageNumber: number, totalPages: number, timestamp: string) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(`Generated ${timestamp}`, 20, pageHeight - 10);
  pdf.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
};

const renderTemplateToPdf = async (
  component: ReactElement,
  baseFileName: string
): Promise<RenderResult> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.width = '794px'; // ~210mm at 96dpi
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const reactRoot = createRoot(container);
  reactRoot.render(component);

  // Ensure the component has rendered before capturing
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const totalPages = Math.max(1, Math.ceil(imgHeight / pdfHeight));
    let heightLeft = imgHeight;
    let position = 0;
    let pageNumber = 1;
    const timestamp = new Date().toLocaleString('en-GB');

    while (true) {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      addFooter(pdf, pageNumber, totalPages, timestamp);
      heightLeft -= pdfHeight;
      if (heightLeft <= 0) {
        break;
      }
      pdf.addPage();
      pageNumber += 1;
      position = heightLeft - imgHeight;
    }

    const dataUrl = pdf.output('dataurlstring');

    return {
      dataUrl,
      fileName: `${baseFileName}.pdf`,
    };
  } finally {
    reactRoot.unmount();
    document.body.removeChild(container);
  }
};

export const renderInvoicePDF = async (
  shipment: ShipmentWithItems,
  company: Company,
  buyer: Partner,
  items: Array<{ product: Product; quantity: number }>,
  totals: { value: number; netWeight: number; grossWeight: number; packages: number },
  meta: DocumentMeta
): Promise<RenderResult> => {
  const qrDataUrl = await generateQR({
    shipmentRef: shipment.reference,
    docKey: 'INVOICE',
    version: meta.version,
    timestamp: Date.now(),
  });

  const template = (
    <InvoiceTemplate
      shipment={shipment}
      company={company}
      buyer={buyer}
      items={items}
      totals={totals}
      meta={meta}
      qrDataUrl={qrDataUrl}
    />
  );

  return renderTemplateToPdf(template, `${meta.number}_Commercial_Invoice`);
};

export const renderPackingListPDF = async (
  shipment: ShipmentWithItems,
  company: Company,
  buyer: Partner,
  items: Array<{ product: Product; quantity: number }>,
  totals: { value: number; netWeight: number; grossWeight: number; packages: number },
  meta: DocumentMeta
): Promise<RenderResult> => {
  const qrDataUrl = await generateQR({
    shipmentRef: shipment.reference,
    docKey: 'PACKING_LIST',
    version: meta.version,
    timestamp: Date.now(),
  });

  const template = (
    <PackingListTemplate
      shipment={shipment}
      company={company}
      buyer={buyer}
      items={items}
      totals={totals}
      meta={meta}
      qrDataUrl={qrDataUrl}
    />
  );

  return renderTemplateToPdf(template, `${meta.number}_Packing_List`);
};

export const renderProformaPDF = async (params: {
  shipment: ShipmentWithItems;
  company: Company;
  buyer: Partner;
  costLines: CostLine[];
  summary: CostSummary;
  meta: LegacyDocumentMeta;
}): Promise<RenderResult> => {
  const { shipment, company, buyer, costLines, summary, meta } = params;

  const qrData = {
    shipmentRef: shipment.reference,
    docKey: 'PROFORMA',
    number: meta.number,
    version: 1,
    timestamp: Date.now(),
  };

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ProList', 20, 25);

  pdf.setFontSize(16);
  pdf.text('PRO-FORMA INVOICE', 20, 35);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Pro-forma No: ${meta.number}`, 20, 50);
  pdf.text(`Date: ${meta.date}`, 20, 55);
  pdf.text(`Shipment: ${shipment.reference}`, 20, 60);

  pdf.setFont('helvetica', 'bold');
  pdf.text('From:', 20, 75);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.name, 20, 82);
  pdf.text(company.address, 20, 87);

  pdf.setFont('helvetica', 'bold');
  pdf.text('To:', 120, 75);
  pdf.setFont('helvetica', 'normal');
  pdf.text(buyer.name, 120, 82);
  if (buyer.address) {
    const addressLines = buyer.address.split(',');
    addressLines.forEach((line, index) => {
      pdf.text(line.trim(), 120, 87 + index * 5);
    });
  }

  let yPos = 120;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', 20, yPos);
  pdf.text('Type', 100, yPos);
  pdf.text('Amount', 150, yPos);

  pdf.line(20, yPos + 2, 190, yPos + 2);
  yPos += 10;

  pdf.setFont('helvetica', 'normal');
  costLines.forEach(line => {
    pdf.text(line.label, 20, yPos);
    pdf.text(line.type, 100, yPos);
    pdf.text(formatFcfa(line.amount_fcfa), 150, yPos);
    yPos += 8;
  });

  yPos += 10;
  pdf.line(100, yPos - 5, 190, yPos - 5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Subtotal:', 100, yPos);
  pdf.text(formatFcfa(summary.subtotal_fcfa), 150, yPos);
  yPos += 8;
  pdf.text('Tax:', 100, yPos);
  pdf.text(formatFcfa(summary.tax_fcfa), 150, yPos);
  yPos += 8;
  pdf.text('Total:', 100, yPos);
  pdf.text(formatFcfa(summary.total_fcfa), 150, yPos);

  const qrCodeUrl = await generateQR(qrData);
  if (qrCodeUrl) {
    try {
      pdf.addImage(qrCodeUrl, 'PNG', pageWidth - 35, pageHeight - 35, 25, 25);
    } catch (error) {
      console.warn('Failed to add QR code:', error);
    }
  }

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const timestamp = new Date().toLocaleString('en-GB');
  pdf.text(`Generated by ProList Demo • Not a legal document • ${timestamp}`, 20, pageHeight - 10);

  const dataUrl = pdf.output('dataurlstring');

  return {
    dataUrl,
    fileName: `${meta.number}_Proforma_Invoice.pdf`,
  };
};

export const renderReceiptPDF = async (params: {
  shipment: ShipmentWithItems;
  company: Company;
  payment: Payment;
  summary: CostSummary;
  meta: LegacyDocumentMeta;
}): Promise<RenderResult> => {
  const { shipment, company, payment, summary, meta } = params;

  const qrData = {
    shipmentRef: shipment.reference,
    docKey: 'RECEIPT',
    number: meta.number,
    version: 1,
    timestamp: Date.now(),
  };

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ProList', 20, 25);

  pdf.setFontSize(16);
  pdf.text('PAYMENT RECEIPT', 20, 35);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Receipt No: ${meta.number}`, 20, 50);
  pdf.text(`Date: ${meta.date}`, 20, 55);
  pdf.text(`Shipment: ${shipment.reference}`, 20, 60);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Received by:', 20, 75);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.name, 20, 82);
  pdf.text(company.address, 20, 87);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Details:', 20, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Method: ${payment.method.replace('_', ' ').toUpperCase()}`, 20, 112);
  pdf.text(`Amount: ${formatFcfa(payment.amount_fcfa)}`, 20, 119);
  if (payment.reference) {
    pdf.text(`Reference: ${payment.reference}`, 20, 126);
  }
  pdf.text(`Date: ${new Date(payment.paid_at).toLocaleDateString('en-GB')}`, 20, 133);
  if (payment.note) {
    pdf.text(`Note: ${payment.note}`, 20, 140);
  }

  let yPos = 160;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Account Summary:', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 10;
  pdf.text(`Total Due: ${formatFcfa(summary.total_fcfa)}`, 20, yPos);
  yPos += 8;
  pdf.text(`Total Paid: ${formatFcfa(summary.paid_fcfa)}`, 20, yPos);
  yPos += 8;
  pdf.text(`Balance: ${formatFcfa(summary.balance_fcfa)}`, 20, yPos);

  const qrCodeUrl = await generateQR(qrData);
  if (qrCodeUrl) {
    try {
      pdf.addImage(qrCodeUrl, 'PNG', pageWidth - 35, pageHeight - 35, 25, 25);
    } catch (error) {
      console.warn('Failed to add QR code:', error);
    }
  }

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const timestamp = new Date().toLocaleString('en-GB');
  pdf.text(`Generated by ProList Demo • Not a legal document • ${timestamp}`, 20, pageHeight - 10);

  const dataUrl = pdf.output('dataurlstring');

  return {
    dataUrl,
    fileName: `${meta.number}_Receipt.pdf`,
  };
};
