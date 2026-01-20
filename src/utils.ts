export function slugify(str: string) {
  return (str ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseValorBR(value: string): number {
  if (!value) return 0;
  const normalized = value.toString().trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parsePago(value: string): boolean {
  return (value ?? "").toString().trim().toLowerCase() === "sim";
}

const mesesPt: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

export function parseMesPt(mes: string): Date {
  const raw = (mes ?? "").toString().trim();
  const [m, a] = raw.split(",").map((x) => x.trim());
  const mesIdx = mesesPt[(m ?? "").toLowerCase()];
  const ano = Number(a);
  if (mesIdx === undefined || !Number.isFinite(ano)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(ano, mesIdx, 1);
}
