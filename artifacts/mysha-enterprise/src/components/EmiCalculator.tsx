import { useState } from "react";
import { ChevronDown, CreditCard, Calculator } from "lucide-react";
import { formatBDT } from "@/lib/format";

interface EmiCalculatorProps {
  price: number;
}

const BANKS = [
  { name: "BRAC Bank",     logo: "B", color: "#b10606" },
  { name: "Dutch-Bangla",  logo: "D", color: "#006eb8" },
  { name: "City Bank",     logo: "C", color: "#f7941d" },
  { name: "Islami Bank",   logo: "I", color: "#1e6b3a" },
  { name: "MTB",           logo: "M", color: "#003087" },
  { name: "EBL",           logo: "E", color: "#e20613" },
];

const PLANS = [
  { months: 3,  rate: 0,    label: "3 Months",  badge: "0% Interest", badgeColor: "green" },
  { months: 6,  rate: 0.5,  label: "6 Months",  badge: null,          badgeColor: "" },
  { months: 12, rate: 1.0,  label: "12 Months", badge: "Popular",     badgeColor: "blue" },
  { months: 18, rate: 1.25, label: "18 Months", badge: null,          badgeColor: "" },
  { months: 24, rate: 1.5,  label: "24 Months", badge: null,          badgeColor: "" },
  { months: 36, rate: 2.0,  label: "36 Months", badge: null,          badgeColor: "" },
];

export function EmiCalculator({ price }: EmiCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(12);

  const selectedPlan = PLANS.find(p => p.months === selectedMonths)!;
  const totalAmount = price * (1 + selectedPlan.rate / 100 * selectedPlan.months);
  const monthlyPayment = totalAmount / selectedMonths;
  const totalInterest = totalAmount - price;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Calculator size={18} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">EMI Calculator</p>
            <p className="text-xs text-gray-500">From {formatBDT(Math.round(price / 3))} / month · 0% on 3 months</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="p-5 border-t bg-white space-y-5">
          {/* Tenure Selector */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Select Tenure</p>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map(plan => (
                <button
                  key={plan.months}
                  onClick={() => setSelectedMonths(plan.months)}
                  className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                    selectedMonths === plan.months
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      plan.badgeColor === "green"
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}>
                      {plan.badge}
                    </span>
                  )}
                  <p className={`font-bold text-base ${selectedMonths === plan.months ? "text-primary" : "text-gray-800"}`}>
                    {plan.months}
                  </p>
                  <p className="text-xs text-gray-500">months</p>
                </button>
              ))}
            </div>
          </div>

          {/* Calculation Result */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Payment</span>
              <span className="text-2xl font-bold text-primary">{formatBDT(Math.round(monthlyPayment))}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Product Price</span>
                <span className="font-medium">{formatBDT(price)}</span>
              </div>
              {totalInterest > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Processing Fee ({selectedPlan.rate}%)</span>
                  <span className="font-medium">+{formatBDT(Math.round(totalInterest))}</span>
                </div>
              )}
              {totalInterest === 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Interest</span>
                  <span>0% (FREE!)</span>
                </div>
              )}
              <div className="flex justify-between text-gray-900 font-bold border-t border-gray-200 pt-1.5">
                <span>Total Payable</span>
                <span>{formatBDT(Math.round(totalAmount))}</span>
              </div>
            </div>
          </div>

          {/* Bank Logos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CreditCard size={12} /> Available on all major banks
            </p>
            <div className="flex flex-wrap gap-2">
              {BANKS.map(bank => (
                <div
                  key={bank.name}
                  title={bank.name}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <div
                    className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.logo}
                  </div>
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{bank.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            * EMI subject to bank approval. Processing fees and terms vary by bank.
          </p>
        </div>
      )}
    </div>
  );
}
