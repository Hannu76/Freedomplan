import React, { useEffect, useRef, useState } from 'react';
import { AreaSeries, createChart, ColorType } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function CurrencyWidget({ darkMode }) {
  const chartContainer = useRef(null);
  const chart = useRef(null);
  const area = useRef(null);

  const [rate, setRate] = useState(129.6584);
  const [history, setHistory] = useState([]);
  const [flash, setFlash] = useState("");
  const previous = useRef(128.9100);

  // Generate mock history data for the sparkline (30 days)
  useEffect(() => {
    const rows = [];
    let currentValue = 120.00;
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      currentValue += (Math.random() - 0.4) * 0.6;
      rows.push({
        time: d.toISOString().split("T")[0],
        value: Number(currentValue.toFixed(4))
      });
    }
    setHistory(rows);
  }, []);

  // Live polling mock
  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 0.1;
      const newRate = Number((rate + fluctuation).toFixed(4));
      
      if (newRate > previous.current) setFlash("text-green-500");
      else if (newRate < previous.current) setFlash("text-red-500");
      
      previous.current = newRate;
      setRate(newRate);

      setHistory(prev => {
        if (!prev.length) return prev;
        const newHistory = [...prev];
        const today = new Date().toISOString().split("T")[0];
        if (newHistory[newHistory.length - 1].time === today) {
          newHistory[newHistory.length - 1].value = newRate;
        } else {
          newHistory.push({ time: today, value: newRate });
        }
        return newHistory;
      });

      setTimeout(() => setFlash(""), 700);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [rate]);

  // Chart setup
  useEffect(() => {
    if (!chartContainer.current || !history.length) return;

    if (!chart.current) {
      chart.current = createChart(chartContainer.current, {
        width: chartContainer.current.clientWidth,
        height: chartContainer.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'transparent',
        },
        rightPriceScale: { visible: false },
        timeScale: { visible: false },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        crosshair: {
          mode: 1,
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
      });

      area.current = chart.current.addSeries(AreaSeries, {
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    const isRising = history.length > 1 && history[history.length - 1].value >= history[0].value;
    area.current.applyOptions({
      lineColor: isRising ? "#16A34A" : "#DC2626",
      topColor: isRising ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)",
      bottomColor: isRising ? "rgba(22,163,74,0.01)" : "rgba(220,38,38,0.01)",
    });

    area.current.setData(history);
    chart.current.timeScale().fitContent();

    const resize = () => {
      if (chart.current && chartContainer.current) {
        chart.current.applyOptions({
          width: chartContainer.current.clientWidth,
          height: chartContainer.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [history]);

  const difference = rate - previous.current;
  const percent = previous.current === 0 ? 0 : (difference / previous.current) * 100;
  const isPositive = difference >= 0;

  return (
    <div className={`w-full h-full min-h-[160px] flex flex-col justify-between p-4 rounded-[20px] transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="z-10 flex justify-between items-start">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Live Exchange Rate
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold figure transition-colors duration-300 ${flash || (darkMode ? 'text-white' : 'text-gray-900')}`}>
              £1 = ₹{rate.toFixed(4)}
            </span>
          </div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(difference).toFixed(4)} ({Math.abs(percent).toFixed(2)}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Live</span>
        </div>
      </div>
      
      <div className="absolute inset-0 top-1/3 z-0 overflow-hidden rounded-b-[20px]">
        <div ref={chartContainer} className="w-full h-full" />
      </div>
    </div>
  );
}
