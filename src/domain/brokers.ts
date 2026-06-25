import type { BrokerId, BrokerQuote, CurrencyInput } from "./types";

export type BrokerPlugin = {
  id: BrokerId;
  name: string;
  summary: string;
  quote: (input: CurrencyInput, marketRate: number) => BrokerQuote;
};

const clampMoney = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

function quotePpi(input: CurrencyInput, marketRate: number): BrokerQuote {
  const sellableUsd = clampMoney(input.usdAmount - input.fixedTransferFeeUsd);
  const grossPesos = sellableUsd * marketRate;
  const brokerFeePesos = grossPesos * (input.brokerOperationFeePercent / 100);
  const netPesos = clampMoney(grossPesos - brokerFeePesos);

  return {
    sellableUsd,
    grossPesos,
    brokerFeePesos,
    netPesos,
    effectiveRate: input.usdAmount > 0 ? netPesos / input.usdAmount : 0,
  };
}

function quotePrex(input: CurrencyInput, marketRate: number): BrokerQuote {
  const transferBlocks = Math.ceil(input.usdAmount / 500);
  const transferFeeUsd = transferBlocks * 1.8;
  const sellableUsd = clampMoney(input.usdAmount - transferFeeUsd);
  const marginAdjustedRate = marketRate * (1 - input.brokerFxMarginPercent / 100);
  const grossPesos = sellableUsd * marginAdjustedRate;
  const brokerFeePesos = grossPesos * (input.brokerOperationFeePercent / 100);
  const netPesos = clampMoney(grossPesos - brokerFeePesos);

  return {
    sellableUsd,
    grossPesos,
    brokerFeePesos,
    netPesos,
    effectiveRate: input.usdAmount > 0 ? netPesos / input.usdAmount : 0,
  };
}

export const brokerPlugins: BrokerPlugin[] = [
  {
    id: "ppi",
    name: "PPI",
    summary: "Transferencia fija configurable y comisión porcentual de operación.",
    quote: quotePpi,
  },
  {
    id: "prex",
    name: "Prex",
    summary: "USD 1.80 cada USD 500 enviados y margen configurable sobre el tipo aplicado.",
    quote: quotePrex,
  },
];

export function getBrokerPlugin(brokerId: BrokerId): BrokerPlugin {
  return brokerPlugins.find((broker) => broker.id === brokerId) ?? brokerPlugins[0];
}
