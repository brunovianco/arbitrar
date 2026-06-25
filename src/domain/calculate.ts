import { getBrokerPlugin } from "./brokers";
import { getRiskProfile } from "./profiles";
import type { CalculationResult, CurrencyInput, MarketRateKey } from "./types";

export function getMarketRate(input: CurrencyInput, key: MarketRateKey): number {
  const rates: Record<MarketRateKey, number> = {
    mep: input.mepRate,
    ccl: input.cclRate,
    blue: input.blueRate,
  };

  return Number.isFinite(rates[key]) ? Math.max(0, rates[key]) : 0;
}

export function calculateConversion(input: CurrencyInput): CalculationResult {
  const marketRate = getMarketRate(input, input.selectedRate);
  const broker = getBrokerPlugin(input.brokerId);
  const profile = getRiskProfile(input.riskProfileId);
  const quote = broker.quote(input, marketRate);
  const investmentCostPesos = input.usdAmount * input.officialRate;
  const gainPesos = quote.netPesos - investmentCostPesos;
  const gainPercent = investmentCostPesos > 0 ? (gainPesos / investmentCostPesos) * 100 : 0;
  const breakEvenRate = findMarketRateForEffectiveRate(input, input.officialRate);
  const targetEffectiveRate = input.officialRate + profile.minimumSpreadPesos;
  const marginToTarget = quote.effectiveRate - targetEffectiveRate;

  const decision =
    quote.effectiveRate >= targetEffectiveRate
      ? "sell"
      : Math.abs(marginToTarget) < 0.01
        ? "neutral"
        : "wait";

  const recommendation =
    decision === "sell"
      ? "Conviene vender segun tu regla actual."
      : decision === "neutral"
        ? "Estas en el borde; para un perfil conservador no hay margen suficiente."
        : "Mejor esperar: el tipo efectivo no alcanza tu umbral.";

  return {
    ...quote,
    marketRate,
    investmentCostPesos,
    gainPesos,
    gainPercent,
    breakEvenRate,
    targetEffectiveRate,
    marginToTarget,
    decision,
    recommendation,
  };
}

function findMarketRateForEffectiveRate(input: CurrencyInput, targetEffectiveRate: number): number {
  if (input.usdAmount <= 0 || targetEffectiveRate <= 0) {
    return 0;
  }

  const broker = getBrokerPlugin(input.brokerId);
  let low = 0;
  let high = Math.max(targetEffectiveRate * 2, 1);

  while (broker.quote(input, high).effectiveRate < targetEffectiveRate && high < 1_000_000) {
    high *= 2;
  }

  for (let index = 0; index < 48; index += 1) {
    const middle = (low + high) / 2;
    const effectiveRate = broker.quote(input, middle).effectiveRate;

    if (effectiveRate >= targetEffectiveRate) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return high;
}
