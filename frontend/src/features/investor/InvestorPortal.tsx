import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { investorApi, PortfolioSummary, HoldingDetail, CashEntry } from "./api";
import { Card, StatusBadge, SkeletonKPIs, SkeletonTable } from "../../components/ui";
import { DonutChart, palette } from "../../components/charts";

const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);



export function InvestorPortal() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [tab, setTab] = useState<"holdings" | "performance" | "cash">("holdings");

  const { data: dash, isLoading } = useQuery({
    queryKey: ["investor-dashboard"],
    queryFn: investorApi.dashboard,
  });

  const { data: holdings = [], isLoading: loadingHoldings } = useQuery({
    queryKey: ["investor-holdings", selectedAccount],
    queryFn: () => (selectedAccount ? investorApi.holdings(selectedAccount) : Promise.resolve([])),
    enabled: !!selectedAccount,
  });

  const { data: cash = [], isLoading: loadingCash } = useQuery({
    queryKey: ["investor-cash", selectedAccount],
    queryFn: () => (selectedAccount ? investorApi.cash(selectedAccount) : Promise.resolve([])),
    enabled: !!selectedAccount && tab === "cash",
  });

  if (isLoading) {
    return (
      <div className="fade-in">
        <div style={{ marginBottom: 24 }}>
          <h1>Investor Portal</h1>
          <p className="muted">Loading your portfolio&hellip;</p>
        </div>
        <SkeletonKPIs count={3} />
        <div style={{ marginTop: 24 }}><SkeletonTable rows={5} cols={4} /></div>
      </div>
    );
  }

  // Not yet a client — show onboarding status
  if (!dash?.profile) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto" }} className="fade-in">
        <h1 style={{ marginBottom: 8 }}>Welcome, Investor</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Your client account is being set up. Here is your onboarding status:
        </p>
        {dash?.onboarding ? (
          <Card>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="row row--between">
                <span className="faint">Name</span>
                <strong>{dash.onboarding.full_name}</strong>
              </div>
              <div className="row row--between">
                <span className="faint">PAN</span>
                <span className="mono">{dash.onboarding.pan}</span>
              </div>
              <div className="row row--between">
                <span className="faint">Proposed investment</span>
                <span>
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(dash.onboarding.proposed_investment_inr)}
                </span>
              </div>
              <div className="row row--between">
                <span className="faint">Status</span>
                <StatusBadge status={dash.onboarding.status} />
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="empty">
              No onboarding application found. Please contact your relationship manager to begin.
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Active client — full portal
  const { profile, portfolios, total_invested_paise } = dash;

  // Sector allocation from holdings
  const sectorMap = new Map<string, number>();
  holdings.forEach((h) => {
    const sector = h.sector || "Other";
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.cost_value_paise);
  });
  const sectorData = Array.from(sectorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value: Math.round(value / 100), color: palette(i) }));


  const totalHoldingsValue = holdings.reduce((s, h) => s + h.cost_value_paise, 0);
  const selectedPortfolio = portfolios.find((p: PortfolioSummary) => p.account_id === selectedAccount);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1>Welcome, {profile.full_name}</h1>
        <p className="muted">
          Client code: <span className="mono">{profile.client_code}</span> &middot;{" "}
          <span style={{ textTransform: "capitalize" }}>{profile.risk_category || "unrated"}</span> risk profile
        </p>
      </div>

      <div className="kpis" style={{ marginBottom: 24 }}>
        <div className="kpi">
          <span className="kpi__value">{portfolios.length}</span>
          <span className="kpi__label">Portfolios</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">
            {portfolios.reduce((s: number, p: PortfolioSummary) => s + p.holdings_count, 0)}
          </span>
          <span className="kpi__label">Total positions</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{inr(total_invested_paise)}</span>
          <span className="kpi__label">Total invested</span>
        </div>
      </div>

      {/* Portfolio cards */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {portfolios.map((p: PortfolioSummary) => (
          <Card
            key={p.account_id}
            style={{
              cursor: "pointer",
              border: selectedAccount === p.account_id ? "1px solid var(--color-gold)" : undefined,
              transition: "border .2s ease",
            }}
            onClick={() => { setSelectedAccount(p.account_id); setTab("holdings"); }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong className="mono">{p.account_code}</strong>
              <StatusBadge status={p.status} />
            </div>
            <div className="faint" style={{ marginBottom: 4 }}>{p.strategy_name}</div>
            <div style={{ fontSize: ".85rem" }}>
              {p.holdings_count} positions &middot; {inr(p.total_cost_paise)}
            </div>
            <div className="faint" style={{ fontSize: ".78rem", marginTop: 4 }}>
              Since {new Date(p.inception_date).toLocaleDateString("en-IN")}
            </div>
          </Card>
        ))}
      </div>

      {portfolios.length === 0 && (
        <Card>
          <div className="empty">
            No portfolio accounts yet. Your relationship manager will set these up for you.
          </div>
        </Card>
      )}

      {/* Detail view for selected account */}
      {selectedAccount && (
        <>
          <Card style={{ marginBottom: 24 }}>
            <div className="row row--between" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 8 }}>
                {(["holdings", "performance", "cash"] as const).map((t) => (
                  <button
                    key={t}
                    className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
                    onClick={() => setTab(t)}
                  >
                    {t === "holdings" ? "Holdings" : t === "performance" ? "Performance" : "Cash Ledger"}
                  </button>
                ))}
              </div>
              {selectedPortfolio && (
                <span className="mono faint" style={{ fontSize: ".82rem" }}>
                  {selectedPortfolio.account_code}
                </span>
              )}
            </div>

            {/* ─── Holdings Tab ─── */}
            {tab === "holdings" && (
              <>
                {loadingHoldings ? (
                  <SkeletonTable rows={5} cols={6} />
                ) : holdings.length === 0 ? (
                  <div className="empty">No holdings in this account.</div>
                ) : (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Security</th>
                          <th>ISIN</th>
                          <th>Sector</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Avg cost</th>
                          <th style={{ textAlign: "right" }}>Value</th>
                          <th style={{ textAlign: "right" }}>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h: HoldingDetail, i: number) => (
                          <tr key={i}>
                            <td className="mono" style={{ fontWeight: 600 }}>{h.security_symbol}</td>
                            <td className="mono" style={{ fontSize: ".82rem" }}>{h.security_isin}</td>
                            <td>{h.sector || "—"}</td>
                            <td style={{ textAlign: "right" }}>{h.quantity}</td>
                            <td style={{ textAlign: "right" }}>{inr(h.avg_cost_paise)}</td>
                            <td style={{ textAlign: "right" }}>{inr(h.cost_value_paise)}</td>
                            <td style={{ textAlign: "right", color: "var(--gold)" }}>
                              {totalHoldingsValue > 0
                                ? ((h.cost_value_paise / totalHoldingsValue) * 100).toFixed(1) + "%"
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="row row--between" style={{ marginTop: 12, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                      <span className="faint">Total ({holdings.length} positions)</span>
                      <strong>{inr(totalHoldingsValue)}</strong>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ─── Performance Tab ─── */}
            {tab === "performance" && (
              <div>
                {holdings.length === 0 ? (
                  <div className="empty">Add holdings to see performance data.</div>
                ) : (
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <h3 style={{ marginBottom: 12, fontSize: ".95rem" }}>Sector Allocation</h3>
                      {sectorData.length > 0 ? (
                        <DonutChart data={sectorData} size={180} />
                      ) : (
                        <div className="empty">No sector data available.</div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ marginBottom: 12, fontSize: ".95rem" }}>Holdings Distribution</h3>
                      <div style={{ display: "grid", gap: 8 }}>
                        {holdings
                          .sort((a, b) => b.cost_value_paise - a.cost_value_paise)
                          .slice(0, 8)
                          .map((h, i) => {
                            const pct = totalHoldingsValue > 0 ? (h.cost_value_paise / totalHoldingsValue) * 100 : 0;
                            return (
                              <div key={i}>
                                <div className="row row--between" style={{ marginBottom: 2 }}>
                                  <span style={{ fontSize: ".82rem" }} className="mono">{h.security_symbol}</span>
                                  <span className="faint" style={{ fontSize: ".78rem" }}>{pct.toFixed(1)}%</span>
                                </div>
                                <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    borderRadius: 3,
                                    background: `linear-gradient(90deg, ${palette(i)}dd, ${palette(i)})`,
                                    transition: "width .5s ease",
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {holdings.length > 8 && (
                        <p className="faint" style={{ marginTop: 8, fontSize: ".78rem" }}>
                          + {holdings.length - 8} more positions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Cash Ledger Tab ─── */}
            {tab === "cash" && (
              <>
                {loadingCash ? (
                  <SkeletonTable rows={5} cols={4} />
                ) : cash.length === 0 ? (
                  <div className="empty">No cash entries yet.</div>
                ) : (
                  <>
                    {/* Cash balance summary */}
                    {cash.length > 0 && (
                      <div className="row" style={{ gap: 24, marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                        <div>
                          <div className="faint" style={{ fontSize: ".78rem" }}>Current balance</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{inr(cash[0].balance_paise)}</div>
                        </div>
                        <div>
                          <div className="faint" style={{ fontSize: ".78rem" }}>Total entries</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{cash.length}</div>
                        </div>
                      </div>
                    )}
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                          <th style={{ textAlign: "right" }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cash.map((c: CashEntry, i: number) => (
                          <tr key={i}>
                            <td>{new Date(c.posted_on).toLocaleDateString("en-IN")}</td>
                            <td style={{ textTransform: "capitalize" }}>
                              {c.entry_type.replace(/_/g, " ")}
                            </td>
                            <td style={{ textAlign: "right", color: c.amount_paise >= 0 ? "var(--success)" : "var(--danger)" }}>
                              {inr(c.amount_paise)}
                            </td>
                            <td style={{ textAlign: "right" }}>{inr(c.balance_paise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
