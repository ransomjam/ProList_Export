import type { Company, Partner, Product, ShipmentWithItems } from '@/mocks/seeds';
import { abbreviateFcfa, formatFcfa } from '@/utils/currency';
import { format } from 'date-fns';
import { Fragment } from 'react';

interface InvoiceTemplateProps {
  shipment: ShipmentWithItems;
  company: Company;
  buyer: Partner;
  items: Array<{ product: Product; quantity: number }>;
  totals: { value: number; netWeight: number; grossWeight: number; packages: number };
  meta: { number: string; date: string; signatureName?: string; version: number };
  qrDataUrl: string;
}

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return format(parsed, 'dd MMM yyyy');
};

export const InvoiceTemplate = ({
  shipment,
  company,
  buyer,
  items,
  totals,
  meta,
  qrDataUrl,
}: InvoiceTemplateProps) => {
  const buyerAddressLines = buyer.address?.split(',') ?? [];
  const issuedDate = formatDate(meta.date);
  const signature = meta.signatureName?.trim();

  return (
    <div className="min-h-full w-full max-w-[210mm] bg-white p-10 text-slate-900">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-3xl font-black tracking-tight text-[#048ABF]">ProList</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.22em] text-[#049DBF]">
            Commercial Invoice
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-right shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice No.</p>
          <p className="text-lg font-bold text-slate-900">{meta.number}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</p>
          <p className="text-sm text-slate-700">{issuedDate}</p>
          <p className="mt-1 text-xs text-slate-500">Shipment ref. {shipment.reference}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</h3>
          <p className="text-base font-semibold text-slate-900">{company.name}</p>
          <p className="max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {company.address}
          </p>
          <p className="text-sm font-medium text-slate-600">TIN: {company.tin}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill To</h3>
          <p className="text-base font-semibold text-slate-900">{buyer.name}</p>
          <div className="max-w-xs text-sm leading-relaxed text-slate-600">
            {buyerAddressLines.map((line, index) => (
              <Fragment key={`${line}-${index}`}>{line.trim()}<br /></Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incoterm</p>
          <p className="text-sm font-medium text-slate-700">{shipment.incoterm}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Route</p>
          <p className="text-sm font-medium text-slate-700">{shipment.route}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Currency</p>
          <p className="text-sm font-medium text-slate-700">XAF (FCFA)</p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-[#048ABF]/10 text-left text-xs font-semibold uppercase tracking-wide text-[#048ABF]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">HS Code</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Line Value</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                  No items captured for this invoice.
                </td>
              </tr>
            ) : (
              items.map(({ product, quantity }, index) => {
                const lineValue = product.unit_price_fcfa * quantity;
                return (
                  <tr
                    key={`${product.id}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{product.hs_code}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatFcfa(product.unit_price_fcfa)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatFcfa(lineValue)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-inner">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</h4>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatFcfa(totals.value)}</dd>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <dt>Equivalent</dt>
              <dd>{abbreviateFcfa(totals.value)}</dd>
            </div>
            <div className="grid gap-1 text-xs text-slate-500 md:grid-cols-2">
              <span>Net weight: {totals.netWeight.toFixed(2)} kg</span>
              <span>Gross weight: {totals.grossWeight.toFixed(2)} kg</span>
            </div>
          </dl>
        </div>
        <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-600">Signed for export by</p>
            <p className="text-lg font-bold text-slate-900">{signature || 'Authorised Signatory'}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">ProList Manufacturing Ltd</p>
          </div>
          <div className="flex items-end justify-between pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</p>
              <p className="text-xs text-slate-500">
                Scan the QR code to confirm version v{meta.version}
              </p>
            </div>
            {qrDataUrl && (
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img src={qrDataUrl} alt="Commercial invoice QR code" className="h-20 w-20" />
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500 shadow-inner">
        Generated by ProList Demo · Not a legal document · All values in FCFA. Incoterm {shipment.incoterm} applies to this
        shipment.
      </footer>
    </div>
  );
};
