import { useEffect, useMemo, useState, Fragment } from "react";
import { fetchItems } from "./api";
import type { Item } from "./api";
import { formatBRL, slugify } from "./utils";
import "./styles.css";

type Status = "Todos" | "Pago" | "Pendente";

function pickMesVigente(mesesDisponiveis: string[]) {
  const now = new Date();
  const monthPt = now.toLocaleString("pt-BR", { month: "long" });
  const mesAtualLabel =
    monthPt.charAt(0).toUpperCase() + monthPt.slice(1) + `, ${now.getFullYear()}`;

  if (mesesDisponiveis.includes(mesAtualLabel)) return mesAtualLabel;
  return mesesDisponiveis[mesesDisponiveis.length - 1] ?? "";
}

export default function App() {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // mês vigente
  const [mesVigente, setMesVigente] = useState("");

  // filtros do histórico
  const [pessoa, setPessoa] = useState("Todas");
  const [status, setStatus] = useState<Status>("Todos");
  

  async function load() {
    try {
      setLoading(true);
      const items = await fetchItems();
      setData(items);

      const mesesDisp = Array.from(new Set(items.map((i) => i.mes)));
      const vigente = pickMesVigente(mesesDisp);
      setMesVigente(vigente);

      const vigenteDt = items.find((r) => r.mes === vigente)?.mesDt;
      const anoVigente = vigenteDt?.getFullYear();

      const initialCollapsed: Record<number, boolean> = {};
      items.forEach((r) => {
        const ano = r.mesDt.getFullYear();
        initialCollapsed[ano] = ano !== anoVigente;
      });

      setCollapsedYears(initialCollapsed);

    } catch (e: any) {
      setError(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pessoas = useMemo(
    () => ["Todas", ...Array.from(new Set(data.map((i) => i.pessoa))).sort((a, b) => a.localeCompare(b))],
    [data]
  );

  // Histórico
  const historicoFiltrado = useMemo(() => {
    let rows = data;

    if (pessoa !== "Todas") rows = rows.filter((r) => r.pessoa === pessoa);

    if (status !== "Todos") {
      const wantPaid = status === "Pago";
      rows = rows.filter((r) => r.pago === wantPaid);
    }

    // Ordenar do mais recente pro mais antigo
    rows = [...rows].sort((a, b) => b.mesDt.getTime() - a.mesDt.getTime());
    return rows;
  }, [data, pessoa, status]);

  const historicoPorAno = useMemo(() => {
    const map = new Map<number, Item[]>();

    for (const r of historicoFiltrado) {
      const ano = r.mesDt.getFullYear();
      if (!map.has(ano)) map.set(ano, []);
      map.get(ano)!.push(r);
    }

    return Array.from(map.entries());
  }, [historicoFiltrado]);

  const pagosTotal = useMemo(
    () => data.filter((r) => r.pago).reduce((acc, r) => acc + r.valor, 0),
    [data]
  );

  const totalMembros = useMemo(() => new Set(data.map((r) => r.pessoa)).size, [data]);
  
  const pendentesAteMesVigente = useMemo(() => {
    if (!mesVigente) return 0;
    const vigenteDt = data.find((r) => r.mes === mesVigente)?.mesDt;
    if (!vigenteDt) return 0;

    return data.filter((r) => !r.pago && r.mesDt.getTime() <= vigenteDt.getTime()).length;
  }, [data, mesVigente]);

  const statusVigente = useMemo(() => {
    if (!mesVigente) return [];
    return data.filter((r) => r.mes === mesVigente);
  }, [data, mesVigente]);

  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});

  function toggleYear(year: number) {
    setCollapsedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  }

  if (loading) return <div className="page">Carregando…</div>;
  if (error) return <div className="page error">{error}</div>;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>🎵 Rateio Spotify</h1>
          <p>Dashboard (leitura)</p>
        </div>

        <button className="btn" onClick={load}>
          Recarregar
        </button>
      </header>

      {/* Status do mês vigente */}
      <section className="panel">
        <h2>Mês vigente {mesVigente ? `(${mesVigente})` : ""}</h2>

        <div className="cards">
          {statusVigente.map((r, idx) => (
            <div key={`${r.pessoa}-${idx}`} className={`card ${r.pago ? "paid" : "pending"}`}>
              <img
                className="avatar"
                src={`/avatars/${slugify(r.pessoa)}.png`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/avatars/default.png";
                }}
                alt={r.pessoa}
              />
              <div className="cardBody">
                <div className="name">{r.pessoa}</div>
                <div className="value">{formatBRL(r.valor)}</div>
                <span className={`badge ${r.pago ? "ok" : "no"}`}>{r.pago ? "Pago" : "Pendente"}</span>
              </div>
            </div>
          ))}

          {statusVigente.length === 0 && <div className="empty">Sem dados para o mês vigente.</div>}
        </div>
      </section>

      {/* KPIs */}
      <section className="kpis">
        <Kpi title="💰 Total pago (geral)" value={formatBRL(pagosTotal)} />
        <Kpi title="👥 Total membros" value={String(totalMembros)} />
        <Kpi title="❌ Pendências em aberto" value={String(pendentesAteMesVigente)} />
      </section>

      {/* Filtros do histórico (sem mês) */}
      <section className="filters">
        <div className="field">
          <label>Pessoa (Histórico)</label>
          <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
            {pessoas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Status (Histórico)</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="Todos">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div className="field">
          <label>Info</label>
          <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)" }}>
            Histórico completo (filtros por pessoa/status)
          </div>
        </div>
      </section>

      {/* Histórico */}
      <section className="panel">
        <h2>Histórico (filtrado)</h2>
        <div className="btnExpandCollapsed">
          <button
            className="btn"
            onClick={() => {
              const allCollapsed = historicoPorAno.every(
                ([ano]) => collapsedYears[ano] === true
              );

              const next: Record<number, boolean> = {};
              historicoPorAno.forEach(([ano]) => {
                next[ano] = !allCollapsed;
              });

              setCollapsedYears(next);
            }}
          >
            Expandir / Colapsar todos
          </button>
        </div>      
        <div className="tableWrap">    
          <table>            
            <thead>
              <tr>
                <th>Mês</th>
                <th>Pessoa</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th>Status</th>
                <th>DataPagamento</th>
              </tr>
            </thead>
            <tbody>
              {historicoPorAno.map(([ano, rows]) => {
                const isCollapsed = collapsedYears[ano] === true;

                return (
                  <Fragment key={ano}>
                    {/* Header do ano */}
                    <tr className="yearRow clickable" onClick={() => toggleYear(ano)}>
                      <td colSpan={5}>
                        <span className="yearTag">
                          {isCollapsed ? "▶" : "▼"} {ano}
                        </span>
                      </td>
                    </tr>

                    {/* Linhas do ano (condicionais) */}
                    {!isCollapsed &&
                      rows.map((r, idx) => (
                        <tr
                          key={`${r.mes}-${r.pessoa}-${idx}`}
                          className={[
                            !r.pago ? "rowPending" : "",
                            r.mes === mesVigente ? "rowVigente" : "",
                          ].join(" ").trim()}
                        >
                          <td>
                            {r.mes}
                            {r.mes === mesVigente && <span className="tagVigente">Vigente</span>}
                          </td>
                          <td>{r.pessoa}</td>
                          <td style={{ textAlign: "right" }}>{formatBRL(r.valor)}</td>
                          <td>{r.pago ? "Sim" : "Nao"}</td>
                          <td>{r.dataPagamento ?? "-"}</td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}

              {historicoFiltrado.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Sem dados com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">Fonte: CSV do Gist (somente leitura).</footer>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi">
      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
    </div>
  );
}
