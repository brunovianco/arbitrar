const PPI_COMMISSIONS_URL = "https://www.portfoliopersonal.com/Contenido/comisiones?v=072026";
const PUBLIC_BONDS_OPERATION = "Compra/Venta de Títulos Públicos";

type PpiCommissionRow = {
  tipoOperacion?: string;
  internet?: string;
  asesor?: string;
  minimo?: string;
};

type PpiCommissionBlock = {
  subheadline?: string;
  listData?: PpiCommissionRow[];
};

export type PpiOperationCommission = {
  operation: string;
  percent: number;
  rawValue: string;
  effectiveFrom: string;
  source: string;
  next?: {
    percent: number;
    rawValue: string;
    effectiveFrom: string;
  };
};

export async function fetchPpiPublicBondsCommission(today = new Date()): Promise<PpiOperationCommission> {
  const response = await fetch(PPI_COMMISSIONS_URL);

  if (!response.ok) {
    throw new Error("No se pudieron consultar las comisiones de PPI.");
  }

  const html = await response.text();
  const nextData = extractNextData(html);
  const blocks = collectCommissionBlocks(nextData);
  const schedule = selectCommissionSchedule(blocks, today);
  const row = findOperationRow(schedule.current.block);

  if (!row?.internet) {
    throw new Error("PPI no publico la comision de Titulos Publicos en el formato esperado.");
  }

  const nextRow = schedule.next ? findOperationRow(schedule.next.block) : null;

  return {
    operation: PUBLIC_BONDS_OPERATION,
    percent: parsePercent(row.internet),
    rawValue: row.internet,
    effectiveFrom: schedule.current.date,
    source: "PPI",
    next: nextRow?.internet
      ? {
          percent: parsePercent(nextRow.internet),
          rawValue: nextRow.internet,
          effectiveFrom: schedule.next?.date ?? "Fecha no informada",
        }
      : undefined,
  };
}

function extractNextData(html: string): unknown {
  const document = new DOMParser().parseFromString(html, "text/html");
  const script = document.querySelector("#__NEXT_DATA__");

  if (!script?.textContent) {
    throw new Error("PPI no expuso datos estructurados de comisiones.");
  }

  return JSON.parse(script.textContent) as unknown;
}

function collectCommissionBlocks(value: unknown): PpiCommissionBlock[] {
  const blocks: PpiCommissionBlock[] = [];
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const item = pending.pop();

    if (!isRecord(item)) {
      continue;
    }

    if (isCommissionBlock(item)) {
      blocks.push(item);
    }

    for (const child of Object.values(item)) {
      if (isRecord(child) || Array.isArray(child)) {
        pending.push(child);
      }
    }
  }

  return blocks;
}

function isCommissionBlock(value: Record<string, unknown>): value is PpiCommissionBlock {
  if (!Array.isArray(value.listData) || typeof value.subheadline !== "string") {
    return false;
  }

  return value.listData.some(
    (row) => isRecord(row) && row.tipoOperacion === PUBLIC_BONDS_OPERATION && typeof row.internet === "string",
  );
}

function selectCommissionSchedule(
  blocks: PpiCommissionBlock[],
  today: Date,
): {
  current: { block: PpiCommissionBlock; date: string };
  next: { block: PpiCommissionBlock; date: string } | null;
} {
  const datedBlocks = blocks
    .map((block) => ({ block, date: parseEffectiveDate(block.subheadline) }))
    .filter((item): item is { block: PpiCommissionBlock; date: string } => Boolean(item.date))
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));

  const current =
    datedBlocks
      .filter((item) => Date.parse(item.date) <= today.getTime())
      .at(-1) ?? datedBlocks[0];

  if (!current) {
    if (blocks[0]) {
      return {
        current: { block: blocks[0], date: "Fecha no informada" },
        next: null,
      };
    }

    throw new Error("No se encontraron bloques de comisiones de PPI.");
  }

  const next = datedBlocks.find((item) => Date.parse(item.date) > today.getTime()) ?? null;

  return { current, next };
}

function findOperationRow(block: PpiCommissionBlock): PpiCommissionRow | null {
  return block.listData?.find((item) => item.tipoOperacion === PUBLIC_BONDS_OPERATION) ?? null;
}

function parsePercent(value: string): number {
  const match = value.match(/(\d+(?:[,.]\d+)?)\s*%/);

  if (!match) {
    throw new Error(`No se pudo interpretar el porcentaje "${value}".`);
  }

  return Number(match[1].replace(",", "."));
}

function parseEffectiveDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/Vigentes desde el\s+(\d+)(?:ro)?\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})/i);

  if (!match) {
    return null;
  }

  const month = monthNumber(match[2]);

  if (!month) {
    return null;
  }

  const day = match[1].padStart(2, "0");

  return `${match[3]}-${month}-${day}`;
}

function monthNumber(value: string): string | null {
  const months: Record<string, string> = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    setiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };

  return months[value.toLocaleLowerCase("es-AR")] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
