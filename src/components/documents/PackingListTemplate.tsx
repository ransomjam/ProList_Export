import type { Company, Partner, Product, ShipmentWithItems } from '@/mocks/seeds';
import { abbreviateFcfa, formatFcfa } from '@/utils/currency';
import { format } from 'date-fns';

interface PackingListTemplateProps {
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

export const PackingListTemplate = ({
  shipment,
  company,
  buyer,
  items,
  totals,
  meta,
  qrDataUrl,
}: PackingListTemplateProps) => {
  const issuedDate = formatDate(meta.date);

  return (
    <div className="min-h-full w-full max-w-[210mm] bg-white p-10 text-slate-900">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-3xl font-black tracking-tight text-[#048ABF]">ProList</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.22em] text-[#03A6A6]">Packing List</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-right shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packing List No.</p>
          <p className="text-lg font-bold text-slate-900">{meta.number}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</p>
          <p className="text-sm text-slate-700">{issuedDate}</p>
          <p className="mt-1 text-xs text-slate-500">Shipment ref. {shipment.reference}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exporter</h3>
          <p className="text-base font-semibold text-slate-900">{company.name}</p>
          <p className="max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {company.address}
          </p>
          <p className="text-sm font-medium text-slate-600">TIN: {company.tin}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consignee</h3>
          <p className="text-base font-semibold text-slate-900">{buyer.name}</p>
          <p className="max-w-xs text-sm leading-relaxed text-slate-600">{buyer.address}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
          <p className="text-sm font-medium text-slate-700">{shipment.mode}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Route</p>
          <p className="text-sm font-medium text-slate-700">{shipment.route}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incoterm</p>
          <p className="text-sm font-medium text-slate-700">{shipment.incoterm}</p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-[#03A6A6]/10 text-left text-xs font-semibold uppercase tracking-wide text-[#03A6A6]">
            <tr>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Net Weight (kg)</th>
              <th className="px-4 py-3 text-right">Gross Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                  No packages captured for this shipment.
                </td>
              </tr>
            ) : (
              items.map(({ product, quantity }, index) => {
                const netWeight = (product.weight_kg || 0) * quantity;
                const grossWeight = netWeight * 1.02;
                return (
                  <tr
                    key={`${product.id}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">Pkg {index + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {product.name}
                      <span className="mt-1 block text-xs text-slate-500">HS {product.hs_code}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{netWeight.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{grossWeight.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-inner">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Totals</h4>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt>Total packages</dt>
              <dd className="font-medium text-slate-900">{totals.packages}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Net weight</dt>
              <dd className="font-medium text-slate-900">{totals.netWeight.toFixed(2)} kg</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Gross weight</dt>
              <dd className="font-medium text-slate-900">{totals.grossWeight.toFixed(2)} kg</dd>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <dt>Declared value</dt>
              <dd>
                {formatFcfa(totals.value)} ({abbreviateFcfa(totals.value)})
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checked by</p>
            <p className="text-lg font-bold text-slate-900">{meta.signatureName || 'Warehouse Supervisor'}</p>
            <p className="text-xs text-slate-500">Verification complete on {issuedDate}</p>
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
                <img src={qrDataUrl} alt="Packing list QR code" className="h-20 w-20" />
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500 shadow-inner">
        Generated by ProList Demo · Not a legal document. Values shown for customs reference only.
      </footer>
    </div>
  );
};
