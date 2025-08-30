import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Info,
  Calculator,
  AlertTriangle,
  ArrowRightLeft,
  Percent,
} from "lucide-react";

// --- Helper types
type TxnType = "buy" | "sell";
type Instrument = "equity" | "gov_bond" | "other";

// Brokerage slabs for different instruments (rates are decimal fractions)
const equitySlabs: Array<[number, number]> = [
  [50_000, 0.006],
  [500_000, 0.0055],
  [2_000_000, 0.005],
  [10_000_000, 0.0045],
  [Number.POSITIVE_INFINITY, 0.004],
];

const govBondSlabs: Array<[number, number]> = [
  [500_000, 0.002],
  [5_000_000, 0.001],
  [Number.POSITIVE_INFINITY, 0.001],
];

const otherSlabs: Array<[number, number]> = [
  [50_000, 0.0075],
  [5_000_000, 0.006],
  [Number.POSITIVE_INFINITY, 0.004],
];

function getBrokerageRate(amount: number, instrument: Instrument) {
  const slabs =
    instrument === "equity"
      ? equitySlabs
      : instrument === "gov_bond"
      ? govBondSlabs
      : otherSlabs;
  for (const [limit, rate] of slabs) {
    if (amount <= limit) return rate;
  }
  return slabs[slabs.length - 1][1];
}

function nf(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NEPSEChargesCalculator() {
  const [txnType, setTxnType] = useState<TxnType>("sell");
  const [instrument, setInstrument] = useState<Instrument>("equity");
  const [amount, setAmount] = useState<number>(40000); // total trade value
  const [purchaseCost, setPurchaseCost] = useState<number>(30000); // needed for CGT on sell
  const [isIndividual, setIsIndividual] = useState<boolean>(true);
  const [dpCharge, setDpCharge] = useState<number>(25);
  const [units, setUnits] = useState<number>(10);
  const [applyPenalty, setApplyPenalty] = useState<boolean>(false);
  const [penaltyPct, setPenaltyPct] = useState<number>(20);

  // SEBON fee from user's provided source: 0.00015% of transaction amount
  const sebonRate = 0.0000015; // 0.00015% as a fraction

  const result = useMemo(() => {
    const rate = getBrokerageRate(amount || 0, instrument);
    const brokerage = (amount || 0) * rate;
    const sebon = (amount || 0) * sebonRate;

    const penalty =
      txnType === "sell" && applyPenalty
        ? (amount || 0) * (penaltyPct / 100)
        : 0;

    let cgt = 0;
    if (txnType === "sell") {
      const profit = Math.max((amount || 0) - (purchaseCost || 0), 0);
      const cgtRate = isIndividual ? 0.05 : 0.1; // 5% individuals, 10% institutions
      cgt = profit * cgtRate;
    }

    const chargesCommon = brokerage + sebon + (dpCharge || 0);

    const totalDeductions =
      txnType === "sell" ? chargesCommon + cgt + penalty : chargesCommon;
    const net =
      txnType === "sell"
        ? (amount || 0) - totalDeductions
        : (amount || 0) + totalDeductions;

    return { rate, brokerage, sebon, cgt, penalty, totalDeductions, net };
  }, [
    amount,
    instrument,
    txnType,
    dpCharge,
    purchaseCost,
    isIndividual,
    applyPenalty,
    penaltyPct,
  ]);

  const oddLotWarning = units > 0 && units < 10;

  return (
    <div className="min-h-screen w-full bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 mb-2"
        >
          NEPSE Charges Calculator
        </motion.h1>
        <p className="text-slate-600 mb-6">
          Quickly estimate brokerage, SEBON fee, DP charge, and capital gains
          tax for Nepal Stock Exchange trades. Defaults below reproduce a
          ₹40,000 sell example.
        </p>

        {/* Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader
              title="Trade"
              icon={<ArrowRightLeft className="w-5 h-5" />}
            />
            <div className="p-4 grid gap-3">
              <Field label="Transaction Type">
                <select
                  className="input"
                  value={txnType}
                  onChange={(e) => setTxnType(e.target.value as TxnType)}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </Field>
              <Field label="Instrument">
                <select
                  className="input"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value as Instrument)}
                >
                  <option value="equity">Equity (Shares)</option>
                  <option value="gov_bond">Government Bond</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Total Transaction Amount (NPR)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </Field>
              <Field label="Units (for odd-lot warning)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                />
              </Field>
              {oddLotWarning && (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 mt-1" />
                  <p className="text-sm">
                    Odd lot detected: NEPSE generally requires buying in lots of{" "}
                    <strong>10 units or more</strong>.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Taxes & Fees"
              icon={<Percent className="w-5 h-5" />}
            />
            <div className="p-4 grid gap-3">
              {txnType === "sell" && (
                <Field label="Original Purchase Cost (NPR) for CGT">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                  />
                </Field>
              )}
              <Field label="Depository (DP) Charge (NPR)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={dpCharge}
                  onChange={(e) => setDpCharge(Number(e.target.value))}
                />
              </Field>
              {txnType === "sell" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-600">
                    Payer Type (for CGT)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="payer"
                        checked={isIndividual}
                        onChange={() => setIsIndividual(true)}
                      />
                      Individual (5%)
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="payer"
                        checked={!isIndividual}
                        onChange={() => setIsIndividual(false)}
                      />
                      Institution (10%)
                    </label>
                  </div>
                </div>
              )}
              {txnType === "sell" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-600">
                    Apply 20% Penalty?
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={applyPenalty}
                      onChange={(e) => setApplyPenalty(e.target.checked)}
                    />
                    {applyPenalty && (
                      <input
                        className="input w-24"
                        type="number"
                        min={0}
                        max={100}
                        value={penaltyPct}
                        onChange={(e) => setPenaltyPct(Number(e.target.value))}
                      />
                    )}
                    {applyPenalty && (
                      <span className="text-sm text-slate-500">%</span>
                    )}
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <p>
                  SEBON fee assumed at <strong>0.00015%</strong> of transaction
                  amount (per your source). Brokerage slab is computed
                  automatically from the amount and instrument.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card>
            <CardHeader
              title="Summary"
              icon={<Calculator className="w-5 h-5" />}
            />
            <div className="p-4 grid gap-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                  label="Brokerage Rate"
                  value={`${(result.rate * 100).toFixed(3)}%`}
                />
                <Stat label="Brokerage (NPR)" value={nf(result.brokerage)} />
                <Stat label="SEBON Fee (NPR)" value={nf(result.sebon)} />
                <Stat label="DP Charge (NPR)" value={nf(dpCharge)} />
                {txnType === "sell" && (
                  <Stat
                    label="Capital Gains Tax (NPR)"
                    value={nf(result.cgt)}
                  />
                )}
                {txnType === "sell" && applyPenalty && (
                  <Stat label="Penalty (NPR)" value={nf(result.penalty)} />
                )}
                <Stat
                  label={
                    txnType === "sell"
                      ? "Total Deductions (NPR)"
                      : "Total Add-on Costs (NPR)"
                  }
                  value={nf(result.totalDeductions)}
                />
                <Stat
                  label={
                    txnType === "sell"
                      ? "Net Receivable (NPR)"
                      : "Total Payable (NPR)"
                  }
                  value={nf(result.net)}
                  highlight
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Values are estimates. Actual broker, SEBON, CDSC/DP, and tax may
                vary by policy or timing.
              </div>
            </div>
          </Card>
        </motion.div>

        {/* How to use */}
        {/* <div className="mt-6 text-sm text-slate-600">
          <h2 className="font-semibold mb-2">Deploy quickly</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Run{" "}
              <code className="bg-slate-100 rounded px-1">
                npm create vite@latest nepse-calculator -- --template react-ts
              </code>
            </li>
            <li>
              Replace{" "}
              <code className="bg-slate-100 rounded px-1">src/App.tsx</code>{" "}
              with this component (keep the{" "}
              <code className="bg-slate-100 rounded px-1">export default</code>
              ).
            </li>
            <li>
              Install optional UI libs:{" "}
              <code className="bg-slate-100 rounded px-1">
                npm i framer-motion lucide-react
              </code>
            </li>
            <li>
              (Optional) Add Tailwind: follow Tailwind + Vite guide, then wrap
              the app container with the classes used above.
            </li>
            <li>
              Run locally:{" "}
              <code className="bg-slate-100 rounded px-1">npm run dev</code>.
              Build for deployment:{" "}
              <code className="bg-slate-100 rounded px-1">npm run build</code>.
            </li>
            <li>
              Deploy: push to GitHub and connect to Netlify, Vercel, or GitHub
              Pages.
            </li>
          </ol>
        </div> */}
      </div>
    </div>
  );
}

// --- Small UI primitives (Tailwind-based) ---
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {children}
    </div>
  );
}
function CardHeader({
  title,
  icon,
}: {
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
      {icon}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "bg-emerald-50 border-emerald-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  );
}

// Tailwind-friendly input style
const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-slate-400";
// function InputClassFix() {
//   return null;
// }
const style = document.createElement("style");
style.innerHTML = `.input{ ${inputBase.replaceAll('"', "'")} }`;
document.head.appendChild(style);
