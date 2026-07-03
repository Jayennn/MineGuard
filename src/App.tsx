import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, UserRoundPlus, Video, LogOut, ShieldAlert, Zap, AlertTriangle, CheckCircle2,
  Lock, Settings, Bell, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// Import Types
import { Worker, Camera } from './types';

// Import Components
import Dashboard from './components/Dashboard';
import FaceRegistration from './components/FaceRegistration';
import Cameras from './components/Cameras';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  
  // Real-time counter metrics
  const [violationsToday, setViolationsToday] = useState(47);
  const [violationsMonth, setViolationsMonth] = useState(798);
  const [workersMonth, setWorkersMonth] = useState(1862);

  // Active Alert System
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    camera: string;
    location: string;
    workerId: string;
    violation: string;
    time: string;
  } | null>(null);

  // Initial Registered Workers matching Page 2 PDF exactly
  const [workers, setWorkers] = useState<Worker[]>([
    {
      id: 'WK-1234',
      name: 'Vanessa Pakan',
      department: 'IT & Digitalization',
      position: 'Manager',
      status: 'Active',
      photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Vanessa'
    },
    {
      id: 'WK-1192',
      name: 'Bhisma Prayogi',
      department: 'Safety & HSE',
      position: 'Safety Officer',
      status: 'Active',
      photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bhisma'
    },
    {
      id: 'WK-3014',
      name: 'Gian Al Haritz',
      department: 'Maintenance',
      position: 'Technician',
      status: 'Active',
      photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Gian'
    },
    {
      id: 'WK-0872',
      name: 'Travis Edrick',
      department: 'Safety & HSE',
      position: 'Supervisor',
      status: 'Active',
      photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Travis'
    }
  ]);

  // Fetch workers from FastAPI backend on mount if reachable
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/workers');
        if (response.ok) {
          const data = await response.json();
          const mappedWorkers = data.map((w: any) => ({
            id: w.id,
            name: w.name,
            department: w.department,
            position: w.position,
            status: w.status,
            photoUrl: w.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${w.name.replace(/\s+/g, '')}`
          }));
          setWorkers(mappedWorkers);
        }
      } catch (err) {
        console.warn('[MineGuard Web] FastAPI backend not available. Running in high-fidelity offline simulation mode.');
      }
    };
    fetchWorkers();
  }, []);

  // Initial Cameras matching Page 3 PDF
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 'CAM-WS-01', location: 'Workshop Pit A', violations24h: 24, detected24h: 112, status: 'Online' },
    { id: 'CAM-WS-02', location: 'Workshop Pit B', violations24h: 32, detected24h: 96, status: 'Online' },
    { id: 'CAM-LP-05', location: 'Loading Point Alpha', violations24h: 12, detected24h: 84, status: 'Online' },
    { id: 'CAM-PB-07', location: 'Pit B Coal Mine', violations24h: 5, detected24h: 62, status: 'Online' },
    { id: 'CAM-WH-12', location: 'Main Warehouse', violations24h: 8, detected24h: 140, status: 'Online' },
    { id: 'CAM-HA-03', location: 'Heavy Equipment Area', violations24h: 15, detected24h: 74, status: 'Online' }
  ]);

  // Simulated ticks to increase metrics every 15 seconds to look dynamic and real-time
  useEffect(() => {
    const interval = setInterval(() => {
      // Small randomized increments to simulate ongoing operation
      setViolationsToday(prev => prev + (Math.random() > 0.7 ? 1 : 0));
      setViolationsMonth(prev => prev + (Math.random() > 0.8 ? 1 : 0));
      setWorkersMonth(prev => prev + (Math.random() > 0.6 ? 1 : 0));

      // Randomly update 24h stats for one camera
      setCameras(prev => prev.map(cam => {
        if (Math.random() > 0.8) {
          const isViolation = Math.random() > 0.7;
          return {
            ...cam,
            detected24h: cam.detected24h + 1,
            violations24h: cam.violations24h + (isViolation ? 1 : 0)
          };
        }
        return cam;
      }));

      // Occasionally trigger an active alert banner
      if (Math.random() > 0.85 && !activeAlert) {
        const randCam = cameras[Math.floor(Math.random() * cameras.length)];
        triggerAlert(randCam.id, 'No Safety Helmet');
      }

    }, 15000);

    return () => clearInterval(interval);
  }, [activeAlert, cameras]);

  // Action to manually trigger a violation alert from camera screen
  const triggerAlert = (cameraId: string, violationType: string) => {
    const cam = cameras.find(c => c.id === cameraId) || cameras[0];
    const randomId = `WK-${Math.floor(Math.random() * 2000) + 1000}`;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Update camera count immediately
    setCameras(prev => prev.map(c => {
      if (c.id === cameraId) {
        return { ...c, violations24h: c.violations24h + 1, detected24h: c.detected24h + 1 };
      }
      return c;
    }));

    // Increment today and monthly stats
    setViolationsToday(prev => prev + 1);
    setViolationsMonth(prev => prev + 1);

    // Set Active Alert
    setActiveAlert({
      id: Math.random().toString(),
      camera: cameraId,
      location: cam.location,
      workerId: randomId,
      violation: violationType,
      time
    });

    // Auto-clear alert after 8 seconds
    setTimeout(() => {
      setActiveAlert(null);
    }, 8000);
  };

  // Registered Worker handlers (Local + Live FastAPI CRUD with file uploads)
  const handleAddWorker = async (newWorker: Worker, file: File | null) => {
    const formData = new FormData();
    formData.append('id', newWorker.id);
    formData.append('name', newWorker.name);
    formData.append('department', newWorker.department);
    formData.append('position', newWorker.position);
    formData.append('status', newWorker.status);
    if (file) {
      formData.append('photo', file);
    }

    try {
      const response = await fetch('http://localhost:8000/api/workers', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        const added: Worker = {
          id: data.worker.id,
          name: data.worker.name,
          department: data.worker.department,
          position: data.worker.position,
          status: data.worker.status,
          photoUrl: data.worker.photoUrl
        };
        // Update local React state with returned database record
        setWorkers(prev => [added, ...prev.filter(w => w.id !== added.id)]);
      } else {
        // Fallback locally
        setWorkers(prev => [newWorker, ...prev.filter(w => w.id !== newWorker.id)]);
      }
    } catch (err) {
      console.warn('FastAPI server offline. Registering worker locally.', err);
      setWorkers(prev => [newWorker, ...prev.filter(w => w.id !== newWorker.id)]);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pekerja dengan ID ${id}?`)) {
      try {
        const response = await fetch(`http://localhost:8000/api/workers/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setWorkers(prev => prev.filter(w => w.id !== id));
        } else {
          setWorkers(prev => prev.filter(w => w.id !== id));
        }
      } catch (err) {
        console.warn('FastAPI server offline. Deleting worker locally.', err);
        setWorkers(prev => prev.filter(w => w.id !== id));
      }
    }
  };

  const handleUpdateWorker = async (updatedWorker: Worker, file: File | null) => {
    // Our FastAPI POST automatically acts as an UPSERT when ID exists,
    // so we can reuse our multipart-friendly handleAddWorker!
    await handleAddWorker(updatedWorker, file);
  };

  const handleDismissAlert = () => {
    setActiveAlert(null);
  };

  const handleInspectAlert = () => {
    setActiveTab('Cameras');
    setActiveAlert(null);
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-800 overflow-hidden font-sans selection:bg-[#E30613]/10">
      
      {/* Dynamic Flashing Alert Banner (Command Center Level) */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-50 p-4 bg-gradient-to-r from-red-800 via-[#E30613] to-red-800 border-b-2 border-[#E30613] text-white shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-3.5 mx-auto max-w-7xl w-full">
              <div className="p-2 bg-black/40 rounded-full text-white animate-bounce">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-mono font-bold tracking-widest text-red-200">
                  ⚠️ SAFETY VIOLATION DETECTED [{activeAlert.time}]
                </p>
                <p className="text-sm font-semibold">
                  <span className="font-mono text-white underline">{activeAlert.camera}</span> at <span className="font-bold">{activeAlert.location}</span>: Worker <span className="font-bold text-yellow-300 font-mono">{activeAlert.workerId}</span> is missing <span className="font-extrabold text-white underline decoration-2">{activeAlert.violation}</span>!
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleInspectAlert}
                  className="px-3.5 py-1.5 bg-white text-[#E30613] text-xs font-bold rounded hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Live</span>
                </button>
                <button 
                  onClick={handleDismissAlert}
                  className="p-1.5 bg-black/20 hover:bg-black/40 rounded transition-colors text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION (Left) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
        
        {/* Top Header Logo Block */}
        <div>
          <div className="p-6 border-b border-slate-200 flex items-center space-x-3 bg-slate-50/85">
            <div className="p-2 bg-[#E30613]/10 border border-[#E30613]/20 rounded-lg text-[#E30613] shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">MineGuard</h1>
              <p className="text-[10px] font-mono text-[#E30613] tracking-widest font-black uppercase">Kideco HSE AI</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('Dashboard')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'Dashboard' 
                  ? 'bg-[#E30613] text-white shadow-md shadow-red-500/10' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('Face Registration')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'Face Registration' 
                  ? 'bg-[#E30613] text-white shadow-md shadow-red-500/10' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UserRoundPlus className="w-4.5 h-4.5" />
              <span>Face Registration</span>
            </button>

            <button 
              onClick={() => setActiveTab('Cameras')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'Cameras' 
                  ? 'bg-[#E30613] text-white shadow-md shadow-red-500/10' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Video className="w-4.5 h-4.5" />
              <span>Cameras</span>
            </button>
          </nav>
        </div>

        {/* Bottom Lock & Info block */}
        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-3">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-extrabold uppercase tracking-wider text-[9px] text-emerald-600">Security Secured</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-mono">
              IP: SEC_COM_8000<br/>
              Kideco Network V2
            </p>
          </div>

          <button 
            onClick={() => alert('Log out dari MineGuard command center...')}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all uppercase tracking-wider font-mono cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>

      </aside>

      {/* MAIN VIEW PORTAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP STATUS HEADER BAR WITH KIDECO RED BLOCK (Page 1 mockup) */}
        <header className="bg-[#E30613] h-14 flex items-center justify-between px-6 shadow-md shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 bg-[#00FF88] rounded-full animate-ping" />
            <span className="text-white text-xs font-mono font-black tracking-widest uppercase flex items-center gap-1.5">
              MINEGUARD COMMAND CENTER
              <span className="bg-black/30 text-white font-sans text-[9px] px-1.5 py-0.5 rounded font-normal normal-case">
                Hackathon KIC 2026
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-5">
            {/* Live Indicator pulse */}
            <div className="flex items-center space-x-2 bg-black/20 border border-white/10 px-3 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF88]"></span>
              </span>
              <span className="text-white text-[10px] font-bold uppercase tracking-wider font-mono">System Live</span>
            </div>

            <div className="text-white text-xs font-mono font-semibold">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* CONTENT HOLDER WITH SMOOTH ANIMATION PORTALS */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          
          {/* Section Breadcrumbs header */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-5 uppercase tracking-wider">
            <span>MineGuard</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">{activeTab}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'Dashboard' && (
                <Dashboard 
                  workers={workers} 
                  onNavigate={setActiveTab}
                  violationsToday={violationsToday}
                  violationsMonth={violationsMonth}
                  workersMonth={workersMonth}
                />
              )}
              {activeTab === 'Face Registration' && (
                <FaceRegistration 
                  workers={workers} 
                  onAddWorker={handleAddWorker}
                  onDeleteWorker={handleDeleteWorker}
                  onUpdateWorker={handleUpdateWorker}
                />
              )}
              {activeTab === 'Cameras' && (
                <Cameras 
                  cameras={cameras} 
                  onTriggerViolation={triggerAlert} 
                />
              )}
            </motion.div>
          </AnimatePresence>

        </div>

      </main>

    </div>
  );
}
