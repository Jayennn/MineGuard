import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, AlertTriangle, ShieldAlert, Zap, Play, 
  MapPin, Clock, Search, SlidersHorizontal, AlertCircle, Sparkles, CheckCircle2,
  Database, Radio, Video, Square
} from 'lucide-react';
import { motion } from 'motion/react';
import { Worker, ViolationMetric, LocationMetric, ShiftMetric } from '../types';

interface DashboardProps {
  workers: Worker[];
  onNavigate: (tab: string) => void;
  violationsToday: number;
  violationsMonth: number;
  workersMonth: number;
}

export default function Dashboard({ 
  workers, 
  onNavigate,
  violationsToday,
  violationsMonth,
  workersMonth 
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);

  // HSE AI Live Inspector controls state
  const [isStreamActive, setIsStreamActive] = useState(true);
  const [reqHelmet, setReqHelmet] = useState(true);
  const [reqVest, setReqVest] = useState(true);
  const [reqBoots, setReqBoots] = useState(true);
  const [reqGoggles, setReqGoggles] = useState(true);
  const [reqGloves, setReqGloves] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Stream URL only renders when active
  const streamUrl = isStreamActive ? `http://localhost:8000/api/cctv/stream/STAGE-LIVE` : '';

  const updateComplianceSetting = async (key: string, value: boolean) => {
    let nextHelmet = reqHelmet;
    let nextVest = reqVest;
    let nextBoots = reqBoots;
    let nextGoggles = reqGoggles;
    let nextGloves = reqGloves;

    if (key === 'helmet') { setReqHelmet(value); nextHelmet = value; }
    else if (key === 'vest') { setReqVest(value); nextVest = value; }
    else if (key === 'boots') { setReqBoots(value); nextBoots = value; }
    else if (key === 'goggles') { setReqGoggles(value); nextGoggles = value; }
    else if (key === 'gloves') { setReqGloves(value); nextGloves = value; }

    try {
      await fetch('http://localhost:8000/api/cctv/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          req_helmet: nextHelmet,
          req_vest: nextVest,
          req_boots: nextBoots,
          req_goggles: nextGoggles,
          req_gloves: nextGloves
        })
      });
    } catch (err) {
      console.warn('Gagal memperbarui pengaturan kepatuhan di backend:', err);
    }
  };

  useEffect(() => {
    // Sync initial settings on component mount
    fetch('http://localhost:8000/api/cctv/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        req_helmet: reqHelmet,
        req_vest: reqVest,
        req_boots: reqBoots,
        req_goggles: reqGoggles,
        req_gloves: reqGloves
      })
    }).catch(() => {});
  }, []);

  // Pareto Ranking Data from PDF
  const ppeViolations: ViolationMetric[] = [
    { type: 'No Safety Helmet', count: 412, percentage: 32.1, color: '#E30613' }, // Kideco Red
    { type: 'No Safety Goggles', count: 210, percentage: 28.8, color: '#A855F7' }, // Purple
    { type: 'No Safety Boots', count: 186, percentage: 10.8, color: '#3B82F6' }, // Blue
    { type: 'No Safety Vest', count: 50, percentage: 9.8, color: '#10B981' }, // Emerald Green
  ];

  const totalPpeViolationsCount = 858;

  // Location contribution data from PDF
  const locationMetrics: LocationMetric[] = [
    { rank: 1, site: 'Pit B', severity: 'Critical', cases: 412, percentage: 32.1 },
    { rank: 2, site: 'Workshop', severity: 'Critical', cases: 210, percentage: 28.8 },
    { rank: 3, site: 'Pit A', severity: 'Medium', cases: 186, percentage: 10.8 },
    { rank: 4, site: 'Loading Point', severity: 'Low', cases: 50, percentage: 9.8 }
  ];

  // Shift metrics from PDF
  const shiftMetrics: ShiftMetric[] = [
    { shift: 'Morning', timeRange: '06.00 - 14.00', cases: 412, percentage: 32.1 },
    { shift: 'Afternoon', timeRange: '14.00 - 22.00', cases: 578, percentage: 45.0 },
    { shift: 'Night', timeRange: '22.00 - 06.00', cases: 270, percentage: 21.9 }
  ];

  // 24 Hours trend data matching PDF layout
  const hourlyTrend = [
    { hour: '00.00', count: 35 },
    { hour: '01.00', count: 25 },
    { hour: '02.00', count: 12 },
    { hour: '03.00', count: 16 },
    { hour: '04.00', count: 45 },
    { hour: '05.00', count: 42 },
    { hour: '06.00', count: 28 },
    { hour: '07.00', count: 10 },
    { hour: '08.00', count: 32 },
    { hour: '09.00', count: 2 },
    { hour: '10.00', count: 3 },
    { hour: '11.00', count: 10 },
    { hour: '12.00', count: 35 },
    { hour: '13.00', count: 25 },
    { hour: '14.00', count: 12 },
    { hour: '15.00', count: 15 },
    { hour: '16.00', count: 46 },
    { hour: '17.00', count: 44 },
    { hour: '18.00', count: 28 },
    { hour: '19.00', count: 34 },
    { hour: '20.00', count: 2 },
    { hour: '21.00', count: 3 },
    { hour: '22.00', count: 5 },
    { hour: '23.00', count: 8 },
    { hour: '24.00', count: 43 }
  ];

  const maxCount = Math.max(...hourlyTrend.map(d => d.count));

  // Filter workers based on search term
  const filteredWorkers = workers.filter(w => 
    w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      
      {/* 3 Metrics Cards at the Top in elegant Light Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Violations Today */}
        <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:shadow-md hover:border-[#E30613]/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E30613]" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Violations Today</p>
              <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{violationsToday}</h2>
            </div>
            <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[#E30613]">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-[#E30613]" />
            <span className="text-xs font-bold text-[#E30613]">+12% vs yesterday</span>
          </div>
        </div>

        {/* Card 2: Violations This Month */}
        <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:shadow-md hover:border-emerald-500/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Violations This Month</p>
              <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{violationsMonth}</h2>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-600">-4.8% vs last month</span>
          </div>
        </div>

        {/* Card 3: Workers Detected This Month */}
        <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:shadow-md hover:border-blue-500/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Workers Detected</p>
              <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{workersMonth.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5">
            <TrendingDown className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-600">-10% vs last month</span>
          </div>
        </div>

      </div>

      {/* PRIMARY DYNAMIC CCTV INSPECTION MONITOR with premium Light Command Panel */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Header with red Live Indicator */}
        <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#E30613]/10 border border-[#E30613]/20 rounded text-[#E30613]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">HSE AI Live Inspector</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">YOLOv8 & Real-Time Face Recognition Compliance Auditor</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isStreamActive ? 'bg-[#E30613] animate-ping' : 'bg-slate-400'}`} />
            <span className="text-xs font-mono font-black text-[#E30613]">
              {isStreamActive ? 'STAGE-LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* INTEGRATED COMMAND EDITOR & TOGGLES (DIRECTLY ABOVE THE MONITOR) */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* 1. Camera Selector Switches */}
          <div className="space-y-2">
            <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Camera Feed Source</span>
            <div className="flex items-center gap-2">
              {isStreamActive ? (
                <button 
                  onClick={() => { setIsStreamActive(false); setStreamError(false); }}
                  className="px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 border cursor-pointer bg-[#E30613] text-white shadow-md border-[#E30613] hover:bg-red-700"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>⏹ Stop Kamera</span>
                </button>
              ) : (
                <button 
                  onClick={() => { setIsStreamActive(true); setStreamError(false); }}
                  className="px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 border cursor-pointer bg-emerald-600 text-white shadow-md border-emerald-600 hover:bg-emerald-700"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>▶ Mulai Kamera</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. HSE Policy Checkboxes */}
          <div className="space-y-2 flex-1 max-w-2xl lg:ml-6">
            <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Compliance Rules (YOLO Verification Settings)</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              
              {/* Helm */}
              <label className="relative flex items-center justify-between px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer select-none transition-all shadow-2xs">
                <span className="text-xs font-bold text-slate-700">🛡️ Helm</span>
                <input 
                  type="checkbox" 
                  checked={reqHelmet} 
                  onChange={(e) => updateComplianceSetting('helmet', e.target.checked)}
                  className="w-4.5 h-4.5 text-[#E30613] rounded focus:ring-[#E30613] cursor-pointer accent-[#E30613]"
                />
              </label>

              {/* Rompi */}
              <label className="relative flex items-center justify-between px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer select-none transition-all shadow-2xs">
                <span className="text-xs font-bold text-slate-700">🦺 Rompi</span>
                <input 
                  type="checkbox" 
                  checked={reqVest} 
                  onChange={(e) => updateComplianceSetting('vest', e.target.checked)}
                  className="w-4.5 h-4.5 text-[#E30613] rounded focus:ring-[#E30613] cursor-pointer accent-[#E30613]"
                />
              </label>

              {/* Sepatu */}
              <label className="relative flex items-center justify-between px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer select-none transition-all shadow-2xs">
                <span className="text-xs font-bold text-slate-700">🥾 Sepatu</span>
                <input 
                  type="checkbox" 
                  checked={reqBoots} 
                  onChange={(e) => updateComplianceSetting('boots', e.target.checked)}
                  className="w-4.5 h-4.5 text-[#E30613] rounded focus:ring-[#E30613] cursor-pointer accent-[#E30613]"
                />
              </label>

              {/* Kacamata */}
              <label className="relative flex items-center justify-between px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer select-none transition-all shadow-2xs">
                <span className="text-xs font-bold text-slate-700">🥽 Kaca</span>
                <input 
                  type="checkbox" 
                  checked={reqGoggles} 
                  onChange={(e) => updateComplianceSetting('goggles', e.target.checked)}
                  className="w-4.5 h-4.5 text-[#E30613] rounded focus:ring-[#E30613] cursor-pointer accent-[#E30613]"
                />
              </label>

              {/* Sarung Tangan */}
              <label className="relative flex items-center justify-between px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer select-none transition-all shadow-2xs">
                <span className="text-xs font-bold text-slate-700">🧤 Glove</span>
                <input 
                  type="checkbox" 
                  checked={reqGloves} 
                  onChange={(e) => updateComplianceSetting('gloves', e.target.checked)}
                  className="w-4.5 h-4.5 text-[#E30613] rounded focus:ring-[#E30613] cursor-pointer accent-[#E30613]"
                />
              </label>

            </div>
          </div>

        </div>

        {/* MONITOR DISPLAY */}
        <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
          
          {/* Stream Display */}
          {isStreamActive && !streamError && (
            <img 
              src={streamUrl} 
              alt="Main Live CCTV Stream Screen" 
              onError={() => setStreamError(true)} 
              onLoad={() => setStreamError(false)} 
              className="w-full h-full object-contain"
            />
          )}

          {/* Camera Off Placeholder */}
          {!isStreamActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center select-none">
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center">
                <Video className="w-8 h-8 text-slate-500 mb-3" />
                <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">Kamera Tidak Aktif</span>
                <p className="text-[11px] text-slate-500 mt-1.5">Klik tombol "Mulai Kamera" untuk memulai pemantauan</p>
              </div>
            </div>
          )}

          {/* Server Offline Error */}
          {isStreamActive && streamError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-center px-4 select-none">
              <div className="relative z-10 p-6 bg-white border border-slate-200 rounded-xl max-w-md shadow-xl flex flex-col items-center">
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[#E30613] mb-3">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-sm text-slate-950 font-extrabold uppercase tracking-wider">FastAPI Server Offline</span>
                <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed text-center">
                  Jalankan backend local Anda dengan perintah <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">uvicorn main:app --reload --port 8000</code> untuk memproses aliran CCTV cerdas dengan model YOLO asli!
                </p>
                <button 
                  onClick={() => setStreamError(false)}
                  className="mt-4 px-4 py-2 bg-[#E30613] hover:bg-red-700 text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
                >
                  Coba Hubungkan Ulang Stream
                </button>
              </div>
            </div>
          )}
          
          {/* HUD Status tags - only show when streaming */}
          {isStreamActive && (
            <>
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-white font-mono text-xs select-none">
                <span className="w-2 h-2 bg-[#E30613] rounded-full animate-ping" />
                <span className="font-extrabold tracking-wider">LIVE FEED MONITOR</span>
              </div>

              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3.5 rounded-lg text-slate-300 font-mono text-[10px] leading-relaxed hidden sm:block select-none">
                SYSTEM: <span className="text-white font-bold">MINEGUARD KIDECO V1.2.0</span><br/>
                MODEL: <span className="text-emerald-400 font-bold">YOLOv8s + FaceRec</span><br/>
                INFERENCE LATENCY: <span className="text-cyan-400 font-bold">12.5 ms</span>
              </div>
            </>
          )}

        </div>

      </div>

      {/* AI Quick Insights Panel in Light Theme */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-sm tracking-wide text-slate-900 uppercase flex items-center gap-1.5">
              AI Quick Insights
              <span className="normal-case text-xs text-slate-500 font-normal">(Dihasilkan otomatis dari pemantauan CCTV)</span>
            </h3>
          </div>
          <div className="flex items-center space-x-1 text-xs text-emerald-600">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold">Real-time Analyzer Active</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Block: Critical Findings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 pb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">CRITICAL FINDINGS</h4>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-50 border border-slate-100 border-l-4 border-l-[#E30613] p-3 rounded-r-lg shadow-2xs">
                <p className="text-xs font-extrabold text-slate-900 mb-0.5">Kenaikan Pelanggaran Harian</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jumlah pelanggaran K-3 hari ini melonjak <span className="text-[#E30613] font-bold">12%</span> dibandingkan kemarin, mengindikasikan kelonggaran pengawasan lapangan.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 border-l-4 border-l-amber-500 p-3 rounded-r-lg shadow-2xs">
                <p className="text-xs font-extrabold text-slate-900 mb-0.5">Kepatuhan Helm Menjadi Isu Utama</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tidak memakai Safety Helmet mendominasi total pelanggaran (<span className="text-amber-600 font-bold">32.1%</span>), menjadikannya prioritas pembenahan terbesar.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 border-l-4 border-l-blue-500 p-3 rounded-r-lg shadow-2xs">
                <p className="text-xs font-extrabold text-slate-900 mb-0.5">Jam Rawan Kritis Terdeteksi</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trend pelanggaran memuncak pada jam <span className="text-blue-600 font-bold">03.00-04.00</span> dan <span className="text-blue-600 font-bold">16.00-17.00</span>, bertepatan dengan pergantian shift.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 border-l-4 border-l-[#E30613] p-3 rounded-r-lg shadow-2xs">
                <p className="text-xs font-extrabold text-slate-900 mb-0.5">Hotspot Area Utama: Pit B</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pit B menyumbang kasus terbanyak (<span className="text-[#E30613] font-bold">32.1%</span>), membutuhkan penempatan patroli HSE tambahan segera.
                </p>
              </div>
            </div>
          </div>

          {/* Right Block: Actions Recommended */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center space-x-1.5 pb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">HSE RECOMMENDED ACTIONS</h4>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3.5 flex-1">
                <div className="p-2 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">Action Required</span>
                  <p className="text-sm font-extrabold text-slate-900 mt-1.5">Pengetatan Inspeksi Lapangan</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Kerahkan petugas HSE tambahan ke area <span className="font-semibold text-slate-900">Workshop</span> dan <span className="font-semibold text-slate-900">Pit B</span> pada jam rawan kritis.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3.5 flex-1">
                <div className="p-2 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">Action Required</span>
                  <p className="text-sm font-extrabold text-slate-900 mt-1.5">Safety Briefing Terfokus</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Lakukan briefing wajib APD sebelum shift sore dimulai, berfokus penuh pada penggunaan <span className="font-semibold text-slate-900">Safety Helmet</span> dan <span className="font-semibold text-slate-900">Safety Goggles</span>.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Hourly Trend & Pareto rankings charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Trend Bar Chart in elegant light mode */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Violation Trend by Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hourly violations • last 24h (Kideco Site)</p>
            </div>
            <div className="px-2.5 py-1 bg-[#E30613]/10 rounded border border-[#E30613]/20 text-[10px] font-mono text-[#E30613] font-black">
              LIVE PREDICTION
            </div>
          </div>

          <div className="relative h-64 w-full flex items-end justify-between px-2 pt-6">
            
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 text-[10px] text-slate-400 font-mono">
              <div className="border-b border-slate-100 w-full flex justify-between"><span>50 cases</span><span className="h-0.5 w-full ml-2 border-b border-dashed border-slate-100" /></div>
              <div className="border-b border-slate-100 w-full flex justify-between"><span>30 cases</span><span className="h-0.5 w-full ml-2 border-b border-dashed border-slate-100" /></div>
              <div className="border-b border-slate-100 w-full flex justify-between"><span>10 cases</span><span className="h-0.5 w-full ml-2 border-b border-dashed border-slate-100" /></div>
              <div className="border-b border-slate-100 w-full flex justify-between"><span>0 cases</span><span className="h-0.5 w-full ml-2 border-b border-dashed border-slate-100" /></div>
            </div>

            {/* Bars */}
            <div className="relative z-10 w-full h-full flex items-end justify-between pl-10 pr-2 pb-6">
              {hourlyTrend.map((data, index) => {
                const heightPercentage = (data.count / maxCount) * 85;
                const isPeak = [0, 4, 16, 24].includes(index);
                
                return (
                  <div key={data.hour} className="group relative flex-1 flex flex-col items-center h-full justify-end mx-0.5 sm:mx-1">
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                      <div className="bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                        {data.hour} • {data.count} cases
                      </div>
                    </div>

                    {/* Bar */}
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ duration: 1, delay: index * 0.015 }}
                      className={`w-full rounded-t-sm relative transition-all duration-300 ${
                        isPeak 
                          ? 'bg-gradient-to-t from-red-700 to-[#E30613] shadow-xs' 
                          : 'bg-gradient-to-t from-orange-500/80 to-orange-400'
                      }`}
                    />

                    {/* X Axis Label */}
                    {index % 3 === 0 && (
                      <span className="absolute top-full mt-1.5 text-[9px] text-slate-500 font-mono tracking-tight">
                        {data.hour}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Donut chart for Frequent PPE Violations */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Most Frequent PPE Violations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pareto Ranking (Total 858 Cases)</p>
          </div>

          <div className="flex flex-col items-center justify-center my-4 space-y-4">
            
            {/* SVG Donut Chart with light mode center label */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#E30613"
                  strokeWidth="10"
                  strokeDasharray="70.6 220"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#A855F7"
                  strokeWidth="10"
                  strokeDasharray="63.3 220"
                  strokeDashoffset="-70.6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth="10"
                  strokeDasharray="23.7 220"
                  strokeDashoffset="-133.9"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="10"
                  strokeDasharray="21.5 220"
                  strokeDashoffset="-157.6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="41"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{totalPpeViolationsCount}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cases</span>
              </div>
            </div>

            {/* Legend Grid */}
            <div className="w-full space-y-1 text-xs">
              {ppeViolations.map((metric) => (
                <div 
                  key={metric.type} 
                  className={`flex items-center justify-between p-1.5 rounded transition-all cursor-pointer ${
                    selectedViolation === metric.type ? 'bg-slate-100 border border-slate-200' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedViolation(selectedViolation === metric.type ? null : metric.type)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                    <span className="text-slate-700 font-medium">{metric.type}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-slate-900 font-extrabold">{metric.count}</span>
                    <span className="text-slate-400">({metric.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* Tables Row: Locations & Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Violations Location Table */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Top Violations Location</h3>
              <p className="text-xs text-slate-500 mt-0.5">Site contribution share</p>
            </div>
            <span className="px-2 py-0.5 bg-red-50 text-[#E30613] text-[10px] font-mono border border-red-100 rounded uppercase font-extrabold">
              Hotspots Map
            </span>
          </div>

          <div className="space-y-2.5 mt-4">
            {locationMetrics.map((loc) => {
              const severityColors = {
                Critical: 'bg-red-50 text-red-700 border-red-100',
                Medium: 'bg-amber-50 text-amber-700 border-amber-100',
                Low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
              };

              return (
                <div 
                  key={loc.site} 
                  className="bg-slate-50 border border-slate-200/40 rounded-lg p-3.5 flex items-center justify-between transition-all hover:bg-slate-100/60 group"
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-mono font-black text-slate-800">
                      {loc.rank}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 group-hover:text-[#E30613] transition-colors">{loc.site}</h4>
                      <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityColors[loc.severity]}`}>
                        {loc.severity}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <p className="text-sm font-bold text-slate-900">{loc.cases} cases</p>
                    <p className="text-xs text-slate-500 mt-0.5">{loc.percentage}% contribution</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Violations by Shift */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Violations by Shift</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kideco Mining - all active locations</p>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-[10px] font-mono text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>3 Shifts Active</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/20">
                <div className="h-full bg-[#3B82F6]" style={{ width: '32.1%' }} title="Morning" />
                <div className="h-full bg-[#E30613]" style={{ width: '45.0%' }} title="Afternoon" />
                <div className="h-full bg-[#A855F7]" style={{ width: '22.9%' }} title="Night" />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
                <div className="flex items-center"><span className="w-2 h-2 bg-[#3B82F6] rounded-full mr-1.5" /> Morning (32.1%)</div>
                <div className="flex items-center"><span className="w-2 h-2 bg-[#E30613] rounded-full mr-1.5" /> Afternoon (45.0%)</div>
                <div className="flex items-center"><span className="w-2 h-2 bg-[#A855F7] rounded-full mr-1.5" /> Night (22.9%)</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-5">
            {shiftMetrics.map((shift, idx) => {
              const progressColor = idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-[#E30613]' : 'bg-purple-500';

              return (
                <div key={shift.shift} className="bg-slate-50 border border-slate-200/40 rounded-xl p-3.5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{shift.shift}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{shift.timeRange}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-slate-950">{shift.cases} cases</span>
                      <span className="block text-[10px] font-mono text-slate-400 mt-0.5">({shift.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-white border border-slate-200 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${shift.percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full ${progressColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer search panel */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs rounded-xl">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Cari Worker ID atau Nama..."
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3.5 py-2 w-full sm:w-64 focus:outline-none focus:border-[#E30613] transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button 
            className="flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
            onClick={() => onNavigate('Face Registration')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manage Registered Workers</span>
          </button>
        </div>
      </div>

      {/* Interactive search drop tray */}
      {searchTerm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg max-h-48 overflow-y-auto space-y-2"
        >
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">Hasil Pencarian ({filteredWorkers.length})</p>
          {filteredWorkers.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Tidak ada pekerja yang ditemukan dengan ID atau nama "{searchTerm}"</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredWorkers.map(w => (
                <div key={w.id} className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg flex items-center justify-between hover:border-slate-300 transition-all">
                  <div className="flex items-center space-x-3">
                    <img src={w.photoUrl} alt={w.name} className="w-7 h-7 rounded-full border border-slate-200 object-cover" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-950">{w.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{w.id} • {w.department}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">{w.status}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
