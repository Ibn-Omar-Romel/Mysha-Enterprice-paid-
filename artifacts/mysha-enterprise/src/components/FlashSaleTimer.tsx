import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function getEndOfDay(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  return end;
}

function calcTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    hours:   Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  const s = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-0.5">
        {s.split("").map((d, i) => (
          <div key={i} className="w-9 h-11 bg-[#0d1117] border border-gray-700 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xl tabular-nums">
            {d}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function FlashSaleTimer() {
  const [target] = useState(getEndOfDay);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 text-primary font-bold text-sm">
        <Zap size={14} fill="currentColor" /> Ends in
      </div>
      <div className="flex items-center gap-2">
        <Digit value={timeLeft.hours}   label="HRS" />
        <span className="text-gray-300 font-bold text-xl pb-3">:</span>
        <Digit value={timeLeft.minutes} label="MIN" />
        <span className="text-gray-300 font-bold text-xl pb-3">:</span>
        <Digit value={timeLeft.seconds} label="SEC" />
      </div>
    </div>
  );
}
