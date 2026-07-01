import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera as CameraIcon, ShieldAlert, Users, Eye, Play, Pause, RefreshCw, 
  Filter, Calendar, ChevronRight, X, Download, ShieldCheck, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Snapshot } from '../types';

interface CamerasProps {
  cameras: Camera[];
  onTriggerViolation: (camera: string, violationType: string) => void;
}

// Custom simulated CCTV feed using HTML Canvas
const SimulatedCCTV = ({ 
  cameraId, 
  location, 
  isPaused 
}: { 
  cameraId: string; 
  location: string; 
  isPaused: boolean; 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Simulation variables
  const workersRef = useRef([
    { x: 50, y: 80, dx: 0.4, dy: 0.2, size: 20, isSafe: true, name: "WK-1192", label: "SAFE PPE" },
    { x: 180, y: 90, dx: -0.3, dy: -0.1, size: 22, isSafe: false, name: "WK-2841", label: "NO VEST DETECTED" }
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (isPaused) return;

      // Draw background (Elegant Light Gray Blueprint canvas background)
      ctx.fillStyle = '#F8FAFC'; // slate 50
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw industrial grids
      ctx.strokeStyle = '#F1F5F9'; // slate 100
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw static machinery outline
      ctx.fillStyle = '#E2E8F0'; // slate 200
      if (location === 'Workshop') {
        // Workshop bench
        ctx.fillRect(40, 70, 80, 40);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(40, 70, 80, 40);
        ctx.fillStyle = '#64748B';
        ctx.font = '7px sans-serif';
        ctx.fillText('STATION B-03', 45, 82);
      } else {
        // Quarry staircase
        ctx.beginPath();
        ctx.moveTo(20, 110);
        ctx.lineTo(100, 110);
        ctx.lineTo(150, 140);
        ctx.lineTo(240, 140);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Update and Draw Workers
      workersRef.current.forEach((worker) => {
        // Move worker
        worker.x += worker.dx;
        worker.y += worker.dy;

        // Bounce boundaries
        if (worker.x < 15 || worker.x > canvas.width - 15) worker.dx *= -1;
        if (worker.y < 35 || worker.y > canvas.height - 25) worker.dy *= -1;

        // Draw bounding box
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = worker.isSafe ? '#10B981' : '#E30613'; // Emerald vs Kideco Red
        
        const boxW = worker.size;
        const boxH = worker.size * 2;
        const boxX = worker.x - boxW / 2;
        const boxY = worker.y - boxH / 2;

        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Draw identity indicator banner
        ctx.fillStyle = worker.isSafe ? '#10B981' : '#E30613';
        ctx.fillRect(boxX, boxY - 10, boxW, 10);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 6px sans-serif';
        ctx.fillText(worker.name, boxX + 2, boxY - 3);

        // Draw warning text if violation is present
        if (!worker.isSafe) {
          ctx.fillStyle = 'rgba(227, 6, 19, 0.15)';
          ctx.fillRect(boxX, boxY, boxW, boxH);

          ctx.fillStyle = '#E30613';
          ctx.font = '5px sans-serif';
          ctx.fillText("! NO VEST", boxX + 1, boxY + boxH + 8);
        }
      });

      // HUD indicators
      ctx.fillStyle = '#E30613';
      ctx.beginPath();
      ctx.arc(15, 20, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('REC CH ' + cameraId, 22, 22);

      // Date timer HUD
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      ctx.fillStyle = '#64748B';
      ctx.font = '6px monospace';
      ctx.fillText(timeStr, canvas.width - 45, 22);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [cameraId, location, isPaused]);

  return (
    <canvas 
      ref={canvasRef} 
      width={320} 
      height={180} 
      className="w-full h-full object-cover"
    />
  );
};

export default function Cameras({ 
  cameras, 
  onTriggerViolation 
}: CamerasProps) {
  // Filters state
  const [filterLocation, setFilterLocation] = useState('All locations');
  const [filterCameraId, setFilterCameraId] = useState('All cameras');
  const [filterNoHelmet, setFilterNoHelmet] = useState(true);
  const [filterNoVest, setFilterNoVest] = useState(false);
  const [filterNoBoots, setFilterNoBoots] = useState(false);
  const [filterNoGoggles, setFilterNoGoggles] = useState(false);

  // UI state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Snapshot View Modal state
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [snapshotData, setSnapshotData] = useState<Snapshot | null>(null);

  const handleOpenSnapshot = (camera: Camera) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const randomWorkerId = `WK-${Math.floor(Math.random() * 2000) + 1000}`;
    const violationsList = ['No Safety Helmet', 'No Safety Vest', 'No Safety Boots', 'No Safety Goggles'];
    const randomViolation = violationsList[Math.floor(Math.random() * violationsList.length)];

    setSnapshotData({
      timestamp,
      camera: camera.id,
      location: camera.location,
      workerId: randomWorkerId,
      violation: randomViolation,
      imageUrl: `https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400`
    });
    setSelectedCamera(camera);
    setIsSnapshotOpen(true);
  };

  const handleDownloadSnapshot = () => {
    if (!snapshotData) return;
    alert(`Downloading snapshot: MineGuard_Snapshot_${snapshotData.camera}_${snapshotData.timestamp.replace(/:/g, '')}.png`);
    setIsSnapshotOpen(false);
  };

  const filteredCameras = cameras.filter(cam => {
    if (filterLocation !== 'All locations' && cam.location !== filterLocation) return false;
    if (filterCameraId !== 'All cameras' && cam.id !== filterCameraId) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      
      {/* Upper Bar: Title & controls */}
      <div id="cctv-matrix-header-bar" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Video className="w-5 h-5 text-[#E30613]" />
            Live CCTV Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time safety compliance monitoring and object recognition feeds</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Pause/Resume Streams */}
          <button 
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isPaused 
                ? 'bg-amber-50 border-amber-300 text-amber-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Feeds' : 'Pause Feeds'}</span>
          </button>

          {/* Filter Pop Trigger */}
          <button 
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Violation Filter</span>
          </button>
        </div>
      </div>

      {/* Grid Layout of Cameras */}
      <div id="cctv-streams-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCameras.map((camera) => (
          <div 
            key={camera.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:border-[#E30613]/50 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Simulated Live Frame Feed (HTML Canvas) */}
            <div className="relative overflow-hidden aspect-video bg-slate-100 cursor-pointer" onClick={() => handleOpenSnapshot(camera)}>
              <SimulatedCCTV cameraId={camera.id} location={camera.location} isPaused={isPaused} />
              
              {/* Overlays top-right and bottom-right */}
              <div className="absolute top-2 right-2 bg-[#E30613] text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono shadow">
                {camera.id}
              </div>
              <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                {camera.location}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                <span className="bg-white/95 border border-[#E30613] text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xl">
                  <Eye className="w-3.5 h-3.5 text-[#E30613]" />
                  <span>Inspect Camera Snapshot</span>
                </span>
              </div>
            </div>

            {/* Bottom details block */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Violations 24H</p>
                  <p className="text-xl font-black text-slate-900 mt-1 font-mono tracking-tight group-hover:text-[#E30613] transition-colors">
                    {camera.violations24h}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Detected 24H</p>
                  <p className="text-xl font-black text-slate-900 mt-1 font-mono tracking-tight group-hover:text-emerald-600 transition-colors">
                    {camera.detected24h}
                  </p>
                </div>
              </div>

              {/* Demo Test Action Inside Card */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center text-[10px] text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                  <span>CCTV ACTIVE</span>
                </div>
                <button 
                  type="button"
                  onClick={() => onTriggerViolation(camera.id, 'No Safety Vest')}
                  className="text-[10px] bg-red-50 border border-red-200 hover:bg-[#E30613] hover:text-white text-[#E30613] px-2.5 py-1 rounded transition-all font-bold uppercase tracking-wide cursor-pointer"
                >
                  Trigger Alert
                </button>
              </div>
            </div>

          </div>
        ))}

        {filteredCameras.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 font-medium shadow-xs">
            No camera streams found matching the applied filters.
          </div>
        )}
      </div>

      {/* MODAL 1: Violation Filter Popup */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-w-md w-full"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#E30613]">
                  <Filter className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">Violation Filter</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                
                {/* Date Range Row */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date Range</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="text-[10px] text-slate-400 absolute top-1 left-2 font-semibold">FROM</span>
                      <input 
                        type="date" 
                        defaultValue="2026-06-01"
                        className="w-full bg-white border border-slate-200 rounded-lg pl-2 pr-2 pb-1.5 pt-4 text-xs text-slate-900 focus:outline-none focus:border-[#E30613]" 
                      />
                    </div>
                    <div className="relative">
                      <span className="text-[10px] text-slate-400 absolute top-1 left-2 font-semibold">TO</span>
                      <input 
                        type="date" 
                        defaultValue="2026-06-30"
                        className="w-full bg-white border border-slate-200 rounded-lg pl-2 pr-2 pb-1.5 pt-4 text-xs text-slate-900 focus:outline-none focus:border-[#E30613]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                  <select 
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-[#E30613] cursor-pointer"
                  >
                    <option value="All locations">All locations</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Pit A">Pit A</option>
                    <option value="Pit B">Pit B</option>
                    <option value="Loading Point">Loading Point</option>
                  </select>
                </div>

                {/* Camera Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Camera</label>
                  <select 
                    value={filterCameraId}
                    onChange={(e) => setFilterCameraId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-[#E30613] cursor-pointer"
                  >
                    <option value="All cameras">All cameras</option>
                    <option value="CAM-WS-03">CAM-WS-03</option>
                    <option value="CAM-LP-05">CAM-LP-05</option>
                    <option value="CAM-PB-07">CAM-PB-07</option>
                    <option value="CAM-WS-01">CAM-WS-01</option>
                    <option value="CAM-WS-02">CAM-WS-02</option>
                  </select>
                </div>

                {/* Violations checkbox list */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Violations Types</label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={filterNoHelmet} 
                        onChange={(e) => setFilterNoHelmet(e.target.checked)}
                        className="rounded border-slate-200 text-[#E30613] focus:ring-[#E30613] bg-white accent-[#E30613] cursor-pointer" 
                      />
                      <span className="text-xs text-slate-700">No Helmet</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={filterNoVest} 
                        onChange={(e) => setFilterNoVest(e.target.checked)}
                        className="rounded border-slate-200 text-[#E30613] focus:ring-[#E30613] bg-white accent-[#E30613] cursor-pointer" 
                      />
                      <span className="text-xs text-slate-700">No Safety Vest</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={filterNoBoots} 
                        onChange={(e) => setFilterNoBoots(e.target.checked)}
                        className="rounded border-slate-200 text-[#E30613] focus:ring-[#E30613] bg-white accent-[#E30613] cursor-pointer" 
                      />
                      <span className="text-xs text-slate-700">No Safety Boots</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={filterNoGoggles} 
                        onChange={(e) => setFilterNoGoggles(e.target.checked)}
                        className="rounded border-slate-200 text-[#E30613] focus:ring-[#E30613] bg-white accent-[#E30613] cursor-pointer" 
                      />
                      <span className="text-xs text-slate-700">No Safety Goggles</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 px-5 py-4 flex justify-end space-x-2.5 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => {
                    setFilterLocation('All locations');
                    setFilterCameraId('All cameras');
                    setFilterNoHelmet(true);
                    setFilterNoVest(false);
                    setFilterNoBoots(false);
                    setFilterNoGoggles(false);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 text-xs hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Snapshot Popup */}
      <AnimatePresence>
        {isSnapshotOpen && snapshotData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-w-xl w-full"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#E30613]">
                  <CameraIcon className="w-5 h-5 animate-pulse" />
                  <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">Snapshot Inspector</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsSnapshotOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Snapshot Image with overlay bounding boxes */}
              <div className="relative aspect-video w-full bg-slate-950 border-b border-slate-200">
                <img 
                  src={snapshotData.imageUrl} 
                  alt="Snapshot feed" 
                  className="w-full h-full object-cover opacity-80" 
                />
                
                {/* Simulated Bounding Box for the Violator */}
                <div className="absolute top-[28%] left-[40%] w-[18%] h-[55%] border-2 border-[#E30613] shadow-[0_0_12px_rgba(227,6,19,0.5)]">
                  {/* Badge */}
                  <div className="absolute -top-6 left-0 bg-[#E30613] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    WK-2841
                  </div>
                  {/* Nested missing vest indicator */}
                  <div className="absolute top-[35%] left-[5%] right-[5%] h-[40%] border border-dashed border-red-500 bg-red-950/40 flex items-center justify-center text-[7px] text-red-400 font-mono text-center">
                    NO VEST DETECTED
                  </div>
                </div>

                {/* Simulated Bounding Box for Safe Worker */}
                <div className="absolute top-[35%] left-[15%] w-[15%] h-[50%] border-2 border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <div className="absolute -top-6 left-0 bg-[#10B981] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    WK-1192
                  </div>
                </div>

                {/* Location Overlay Tags */}
                <div className="absolute top-3 right-3 bg-[#E30613] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg uppercase">
                  {snapshotData.camera}
                </div>
                <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-lg">
                  {snapshotData.location}
                </div>
              </div>

              {/* Snapshot Details */}
              <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-6 text-sm bg-white">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Timestamp</p>
                  <p className="font-bold text-slate-900 mt-1 font-mono">{snapshotData.timestamp}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Camera</p>
                  <p className="font-bold text-slate-900 mt-1 font-mono">{snapshotData.camera}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Location</p>
                  <p className="font-bold text-slate-900 mt-1">{snapshotData.location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Worker ID</p>
                  <p className="font-bold text-[#E30613] mt-1 font-mono">{snapshotData.workerId}</p>
                </div>
                
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1.5">Violation Class</p>
                  <span className="inline-flex items-center px-3 py-1 rounded bg-red-50 text-[#E30613] border border-red-200 font-bold text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                    {snapshotData.violation}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setIsSnapshotOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDownloadSnapshot}
                  className="px-5 py-2.5 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Snapshot</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}