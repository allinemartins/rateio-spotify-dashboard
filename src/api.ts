import Papa from "papaparse";
import { parseMesPt, parsePago, parseValorBR } from "./utils";

const RAW_CSV_URL = import.meta.env.VITE_RATEIO_CSV_URL as string;

if (!RAW_CSV_URL) {
  throw new Error("VITE_RATEIO_CSV_URL não definida");
}

export type CsvRow = {
  Mes: string;
  Pessoa: string;
  Valor: string;
  Pago: string;
  DataPagamento?: string;
};

export type Item = {
  mes: string;
  pessoa: string;
  valor: number;
  pago: boolean;
  dataPagamento?: string;
  mesDt: Date;
};

export async function fetchItems(): Promise<Item[]> {
  const url = `${RAW_CSV_URL}?t=${Date.now()}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Erro ao baixar CSV: ${res.status}`);

  const text = await res.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ",",
    transformHeader: (h) => h.trim().replaceAll('"', "").replace("\ufeff", ""),
  });

  const rows = (parsed.data ?? []).filter((r) => r && (r as any).Mes);
  const items: Item[] = rows.map((r) => ({
    mes: (r.Mes ?? "").trim(),
    pessoa: (r.Pessoa ?? "").trim(),
    valor: parseValorBR(r.Valor),
    pago: parsePago(r.Pago),
    dataPagamento: r.DataPagamento?.toString().trim(),
    mesDt: parseMesPt(r.Mes),
  }));

  items.sort((a, b) => a.mesDt.getTime() - b.mesDt.getTime());
  return items;
}
