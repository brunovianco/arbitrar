import type { CurrencyInput } from "../domain/types";

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares";

type DolarApiRate = {
  casa: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

export type LiveRates = Pick<CurrencyInput, "officialRate" | "mepRate" | "cclRate" | "blueRate"> & {
  source: string;
  updatedAt: string;
};

export async function fetchLiveRates(): Promise<LiveRates> {
  const response = await fetch(DOLAR_API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron consultar las cotizaciones.");
  }

  const rates = (await response.json()) as DolarApiRate[];
  const official = findRate(rates, "oficial");
  const mep = findRate(rates, "bolsa");
  const ccl = findRate(rates, "contadoconliqui");
  const blue = findRate(rates, "blue");
  const updatedAt = newestDate([official, mep, ccl, blue]);

  return {
    officialRate: official.venta,
    mepRate: mep.venta,
    cclRate: ccl.venta,
    blueRate: blue.venta,
    source: "DolarAPI",
    updatedAt,
  };
}

function findRate(rates: DolarApiRate[], casa: string): DolarApiRate {
  const rate = rates.find((item) => item.casa === casa);

  if (!rate || !Number.isFinite(rate.venta)) {
    throw new Error(`La cotizacion ${casa} no esta disponible.`);
  }

  return rate;
}

function newestDate(rates: DolarApiRate[]): string {
  return rates
    .map((rate) => rate.fechaActualizacion)
    .filter(Boolean)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}
