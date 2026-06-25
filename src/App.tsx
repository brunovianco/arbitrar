import { useCallback, useEffect, useMemo, useState } from "react";
import { legalSections, legalUpdatedAt } from "./content/legal";
import { brokerPlugins } from "./domain/brokers";
import { calculateConversion } from "./domain/calculate";
import { riskProfiles } from "./domain/profiles";
import type { BrokerId, CurrencyInput, MarketRateKey, RiskProfileId } from "./domain/types";
import { fetchPpiPublicBondsCommission, type PpiOperationCommission } from "./services/ppiCommissionsApi";
import { fetchLiveRates, type LiveRates } from "./services/ratesApi";
import { formatArs, formatPercent, formatRate, formatUsd } from "./utils/format";

const initialInput: CurrencyInput = {
  usdAmount: 1000,
  officialRate: 920,
  mepRate: 1180,
  cclRate: 1210,
  blueRate: 1225,
  brokerId: "ppi",
  selectedRate: "ccl",
  fixedTransferFeeUsd: 80,
  brokerOperationFeePercent: 0.6,
  brokerFxMarginPercent: 2,
  riskProfileId: "conservative",
};

const rateOptions: Array<{ id: MarketRateKey; label: string }> = [
  { id: "ccl", label: "CCL" },
  { id: "mep", label: "MEP" },
  { id: "blue", label: "Blue" },
];

function App() {
  const [input, setInput] = useState<CurrencyInput>(initialInput);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [liveRates, setLiveRates] = useState<LiveRates | null>(null);
  const [ratesStatus, setRatesStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ppiCommission, setPpiCommission] = useState<PpiOperationCommission | null>(null);
  const [commissionStatus, setCommissionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const result = useMemo(() => calculateConversion(input), [input]);
  const selectedBroker = brokerPlugins.find((broker) => broker.id === input.brokerId);
  const selectedProfile = riskProfiles.find((profile) => profile.id === input.riskProfileId);

  const refreshRates = useCallback(async () => {
    setRatesStatus("loading");
    setRatesError(null);

    try {
      const rates = await fetchLiveRates();
      setLiveRates(rates);
      setInput((current) => ({
        ...current,
        officialRate: rates.officialRate,
        mepRate: rates.mepRate,
        cclRate: rates.cclRate,
        blueRate: rates.blueRate,
      }));
      setRatesStatus("success");
    } catch (error) {
      setRatesStatus("error");
      setRatesError(error instanceof Error ? error.message : "No se pudieron consultar las cotizaciones.");
    }
  }, []);

  const refreshPpiCommission = useCallback(async () => {
    setCommissionStatus("loading");
    setCommissionError(null);

    try {
      const commission = await fetchPpiPublicBondsCommission();
      setPpiCommission(commission);
      setInput((current) =>
        current.brokerId === "ppi" ? { ...current, brokerOperationFeePercent: commission.percent } : current,
      );
      setCommissionStatus("success");
    } catch (error) {
      setCommissionStatus("error");
      setCommissionError(error instanceof Error ? error.message : "No se pudieron consultar las comisiones de PPI.");
    }
  }, []);

  useEffect(() => {
    void refreshRates();
    void refreshPpiCommission();
  }, [refreshPpiCommission, refreshRates]);

  const updateNumber = (key: keyof CurrencyInput) => (value: string) => {
    setInput((current) => ({ ...current, [key]: Number(value) }));
  };

  const decisionTone = {
    sell: "border-emerald-600 bg-emerald-50 text-emerald-950",
    neutral: "border-amber-500 bg-amber-50 text-amber-950",
    wait: "border-rose-500 bg-rose-50 text-rose-950",
  }[result.decision];

  const decisionLabel = {
    sell: "Vender",
    neutral: "Borde",
    wait: "Esperar",
  }[result.decision];

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Arbitr<b>AR</b></p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Conviene vender hoy?</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-80">
            <Metric label="Perfil" value={selectedProfile?.label ?? "Conservador"} />
            <Metric label="Broker" value={selectedBroker?.name ?? "PPI"} />
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-2">
          <ExternalDataPanel
            title="Cotizaciones en vivo"
            status={ratesStatus}
            loadingText="Actualizando cotizaciones..."
            idleText="Usando valores editables de referencia."
            successText={liveRates ? `${liveRates.source} · ${formatDateTime(liveRates.updatedAt)}` : null}
            error={ratesError}
            actionLabel="Actualizar"
            onRefresh={refreshRates}
          />
          <ExternalDataPanel
            title="Comisiones PPI"
            status={commissionStatus}
            loadingText="Consultando comisiones..."
            idleText="Usando comision editable de referencia."
            successText={
              ppiCommission
                ? formatPpiCommissionStatus(ppiCommission)
                : null
            }
            error={commissionError}
            actionLabel="Actualizar"
            onRefresh={refreshPpiCommission}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft sm:grid-cols-2">
            <NumberField label="Monto USD" value={input.usdAmount} min={0} step={100} onChange={updateNumber("usdAmount")} />
            <NumberField label="Oficial" value={input.officialRate} min={0} step={1} onChange={updateNumber("officialRate")} />
            <NumberField label="MEP" value={input.mepRate} min={0} step={1} onChange={updateNumber("mepRate")} />
            <NumberField label="CCL" value={input.cclRate} min={0} step={1} onChange={updateNumber("cclRate")} />
            <NumberField label="Blue" value={input.blueRate} min={0} step={1} onChange={updateNumber("blueRate")} />

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Tipo a vender</span>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={input.selectedRate}
                onChange={(event) =>
                  setInput((current) => ({ ...current, selectedRate: event.target.value as MarketRateKey }))
                }
              >
                {rateOptions.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Broker</span>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={input.brokerId}
                onChange={(event) => setInput((current) => ({ ...current, brokerId: event.target.value as BrokerId }))}
              >
                {brokerPlugins.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.name}
                  </option>
                ))}
              </select>
              <span className="text-xs leading-5 text-slate-500">{selectedBroker?.summary}</span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Perfil</span>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={input.riskProfileId}
                onChange={(event) =>
                  setInput((current) => ({ ...current, riskProfileId: event.target.value as RiskProfileId }))
                }
              >
                {riskProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
              <span className="text-xs leading-5 text-slate-500">{selectedProfile?.description}</span>
            </label>

            <NumberField
              label="Comision transferencia USD"
              value={input.fixedTransferFeeUsd}
              min={0}
              step={1}
              disabled={input.brokerId === "prex"}
              onChange={updateNumber("fixedTransferFeeUsd")}
            />
            <NumberField
              label="Comision operacion %"
              value={input.brokerOperationFeePercent}
              min={0}
              step={0.1}
              onChange={updateNumber("brokerOperationFeePercent")}
            />
            <NumberField
              label="Margen Prex %"
              value={input.brokerFxMarginPercent}
              min={0}
              step={0.1}
              disabled={input.brokerId !== "prex"}
              onChange={updateNumber("brokerFxMarginPercent")}
            />
          </form>

          <aside className="flex flex-col gap-4">
            <section className={`rounded-lg border-2 p-5 shadow-soft ${decisionTone}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em]">Semaforo</p>
                  <h2 className="mt-2 text-4xl font-semibold">{decisionLabel}</h2>
                </div>
                <div className="rounded-md bg-white/70 px-3 py-2 text-right text-sm font-semibold">
                  {formatRate(result.effectiveRate)}
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6">{result.recommendation}</p>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <ResultCard label="Pesos netos" value={formatArs.format(result.netPesos)} strong />
              <ResultCard label="Tipo efectivo" value={formatRate(result.effectiveRate)} strong />
              <ResultCard label="Ganancia" value={formatArs.format(result.gainPesos)} tone={result.gainPesos >= 0 ? "good" : "bad"} />
              <ResultCard label="Ganancia %" value={formatPercent.format(result.gainPercent / 100)} tone={result.gainPercent >= 0 ? "good" : "bad"} />
              <ResultCard label="Break Even pub." value={formatRate(result.breakEvenRate)} />
              <ResultCard label="Objetivo" value={formatRate(result.targetEffectiveRate)} />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <h2 className="text-lg font-semibold text-slate-950">Detalle</h2>
              <dl className="mt-3 grid gap-3 text-sm">
                <Detail label="USD iniciales" value={formatUsd.format(input.usdAmount)} />
                <Detail label="USD vendibles" value={formatUsd.format(result.sellableUsd)} />
                <Detail label="Tipo publicado usado" value={formatRate(result.marketRate)} />
                <Detail label="Comision broker" value={formatArs.format(result.brokerFeePesos)} />
                <Detail label="Costo al oficial" value={formatArs.format(result.investmentCostPesos)} />
                <Detail
                  label="Margen contra regla"
                  value={formatArs.format(result.marginToTarget * input.usdAmount)}
                  tone={result.marginToTarget >= 0 ? "good" : "bad"}
                />
              </dl>
            </section>
          </aside>
        </section>

        <footer className="border-t border-slate-200 pb-2 pt-5 text-sm text-slate-600">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="max-w-4xl leading-6">
              ArbitraAR es una herramienta informativa independiente. Cotizaciones provistas por fuentes publicas
              como DolarAPI. Prex, PPI, Portfolio Personal Inversiones, HSBC y las marcas mencionadas pertenecen a
              sus titulares y no tienen afiliacion, patrocinio ni relacion con este sitio.
            </p>
            <button
              className="h-10 shrink-0 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 transition hover:border-teal-600 hover:text-teal-700"
              type="button"
              onClick={() => setIsTermsOpen(true)}
            >
              Terminos
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">© 2026 ArbitraAR. Todos los derechos reservados.</p>
        </footer>
      </div>
      <TermsModal open={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </main>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  step: number;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function NumberField({ label, value, min, step, disabled = false, onChange }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        type="number"
        min={min}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ExternalDataPanel({
  title,
  status,
  loadingText,
  idleText,
  successText,
  error,
  actionLabel,
  onRefresh,
}: {
  title: string;
  status: "idle" | "loading" | "success" | "error";
  loadingText: string;
  idleText: string;
  successText: string | null;
  error: string | null;
  actionLabel: string;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-soft sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {status === "loading" ? loadingText : successText ?? idleText}
        </p>
        {error ? <p className="mt-1 text-sm font-medium text-rose-700">{error}</p> : null}
      </div>
      <button
        className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-wait disabled:opacity-60"
        type="button"
        disabled={status === "loading"}
        onClick={() => void onRefresh()}
      >
        {status === "loading" ? "Actualizando" : actionLabel}
      </button>
    </div>
  );
}

function ResultCard({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-950";

  return (
    <div className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-3 break-words ${strong ? "text-2xl" : "text-xl"} font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-950";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-semibold ${toneClass}`}>{value}</dd>
    </div>
  );
}

function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <section className="max-h-[92vh] w-full overflow-hidden rounded-t-lg bg-white shadow-soft sm:mx-auto sm:max-w-4xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">ArbitraAR</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Terminos y Condiciones</h2>
            <p className="mt-1 text-sm text-slate-500">Ultima actualizacion: {formatDate(legalUpdatedAt)}</p>
          </div>
          <button
            className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 transition hover:border-teal-600 hover:text-teal-700"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Este texto es una base preventiva para un proyecto informativo y no reemplaza la revision de un abogado
            matriculado. Si el sitio escala, monetiza o incorpora usuarios registrados, conviene revisarlo formalmente.
          </p>

          <div className="mt-5 grid gap-5">
            {legalSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
                <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-600">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  if (value === "Fecha no informada") {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatPpiCommissionStatus(commission: PpiOperationCommission): string {
  const current = `${commission.rawValue} · ${commission.operation} · desde ${formatDate(commission.effectiveFrom)}`;

  if (!commission.next) {
    return current;
  }

  return `${current} · proxima ${commission.next.rawValue} desde ${formatDate(commission.next.effectiveFrom)}`;
}

export default App;
