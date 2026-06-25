export type BrokerId = "ppi" | "prex";

export type RiskProfileId = "conservative" | "balanced" | "aggressive";

export type MarketRateKey = "mep" | "ccl" | "blue";

export type CurrencyInput = {
  usdAmount: number;
  officialRate: number;
  mepRate: number;
  cclRate: number;
  blueRate: number;
  brokerId: BrokerId;
  selectedRate: MarketRateKey;
  fixedTransferFeeUsd: number;
  brokerOperationFeePercent: number;
  brokerFxMarginPercent: number;
  riskProfileId: RiskProfileId;
};

export type BrokerQuote = {
  sellableUsd: number;
  grossPesos: number;
  brokerFeePesos: number;
  netPesos: number;
  effectiveRate: number;
};

export type Decision = "sell" | "wait" | "neutral";

export type CalculationResult = BrokerQuote & {
  marketRate: number;
  investmentCostPesos: number;
  gainPesos: number;
  gainPercent: number;
  breakEvenRate: number;
  targetEffectiveRate: number;
  marginToTarget: number;
  decision: Decision;
  recommendation: string;
};
