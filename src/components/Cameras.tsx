import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera as CameraIcon, ShieldAlert, Eye, Play, Pause, RefreshCw, 
  Filter, X, Download, Video, Radio, Activity, AlertCircle, HelpCircle,
  SlidersHorizontal, CheckCircle2, Maximize, Minimize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Snapshot } from '../types';

interface CamerasProps {
  cameras: Camera[];
  onTriggerViolation: (camera: string, violationType: string) => void;
}

// 1. DYNAMIC CONFIGURATION FOR 6 CCTV MATRIX STREAMS
export interface CCTVStream {
  id: string;
  name: string;
  videoUrl: string;
  snapshotUrl: string;
  status: 'Connected' | 'Violation Detected' | 'Offline';

  currentStatus?: 'Connected' | 'Violation Detected' | 'Offline';

  violations24h?: number;
  detected24h?: number;
}

export const cctvStreams: CCTVStream[] = [
  {
    id: "CAM-WS-01",
    name: "Workshop Pit A",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331774461/output/hasil_deteksi_batch_5/RESULT_video_20260620_215506.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102406Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=43f4e038a7eb52572aa85daef776c25e34cc24672e4f6ffb32026e5edf47ffe82c43646dc61718bc79311f86b642cbfb3912344c3708360fab155cbcdb2ae43a4714fb91d5efb405aaad5bf9e8d345d7e875858b5ca3e556efbf73b029b569fb8ec79f3f4e953c3e999b212e469a85e7ce512335d0ba9cf86eb8e4bef52b1506474734ef74b9c4197f89314a1ad62fa3981a1e7b1e327de9954cbf2cb33153da411d593a3074e9ef46e64a05e6d1b95e51f43fb64a42da22a832b6c2f18964aae57769b428f2766962fa72080c4a9ba11643202fbaef06a8d0fe040fa4331d7aff9d0ce3f0677828ac2231c9cafeca45c32ef60998f61d960484c7ea01dd85ae",
    snapshotUrl: "../../assets/1.png",
    status: "Connected"
  },
  {
    id: "CAM-WS-02",
    name: "Workshop Pit B",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331774461/output/hasil_deteksi_batch_5/RESULT_video_20260620_215305.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102410Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=9c8bcf7b0d4e78bdf05a410834da03cdfe4235860a9d29511c348e2fbc44c7173ca79647967f7d99b4448227b0de81855f0c514b97f9d877f4a6bbcf6189b837093b7162b1fe1da4d7e4f5b295f3c789507b24cabd7f08c996bc77307d36acd3bef42d8bf077421a237b2de36b87c8a8d185fd27917e47321ece11153176ea5b22ae50cf10b2f5bb1878d524f24c00f3c9cc42fe705a5e4d814ee941b40bbd9905507220268bacb24d92011892ec620686aeaa78b58a4c766d7ff148e40e03420cd8757800f2641f00b3044ae7cd152e8a898eb4af77a43181884a53b800240138929e1e3c0fbfb6bf25e5df5cbbebb6949df013134c075d8afb01f3330e800a",
    snapshotUrl: "../../assets/2.png",
    status: "Violation Detected"
  },
  {
    id: "CAM-LP-05",
    name: "Loading Point Alpha",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331774461/output/hasil_deteksi_batch_5/RESULT_video_20260620_215506.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102415Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=65043d5ff7e800a4b9fded05112651b79d373d0a57ceea639c2f825e1c4d03843033cb7245ef74d4e859125cce5367a8475de377d731667a313492eb5b55251c26adb291cd8a11f97f3162507dd36e012958d7419a70f8c7cad9a04d1725fd1e40771a358f262e96b0b55d38cef328a4d5c9456bd5e616a62150f09dddf40555f13d03dc825df05186a571b30e71c70874ac6b17645120f6884cd5ed56585465d3b347280d4038b5489ac9892ab81a9b793b70193c3c3a356d051afe41a02618661287b7a6dbbaaad3f6f02ae37de0dc512fdc385cdb7c07c3c584021fe2ab1da2ddf7dcf8182c206870192515a946380722b9c6262ee07da2915df2656b6b00",
    snapshotUrl: "../../assets/3.png",
    status: "Connected"
  },
  {
    id: "CAM-PB-07",
    name: "Pit B Coal Mine",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331775855/output/hasil_deteksi_batch_5/RESULT_IMG_3076.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102618Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=01a5aa3eb3f80d7a6e089845d9d8a09a88ee3a5598a9a362ec3d4e1852b36c58b872e5c4477333e615ced19b91afb97cb96e7a79a13b4714a47de0cabd67cd715dff69f046117f54e2cb0c5b1e2a8c0a249710707ac9059ba2711fce7a391c6ebb869fc88d2c79baec9193500bf1609ea8ebef0e02ed790493df2b3eaffe39a636bac2062f07703750ecb9cd95725a074c71f56722f582bc6ed2fdd36865d541023b9f7ba3d86c6aaaef1d3845bf8d180d363dc652393b8d9b4c6dbc34dcdfd684fa9296ada13fc42903df06b8c4dfb395289ef4e3a583c57b611310563ff5e55d7b05d1409b648993ad71d51c4732017c6d5cb17f622b5f62bbb2f876c7e508",
    snapshotUrl: "../../assets/3076.png",
    status: "Connected"
  },
  {
    id: "CAM-WH-12",
    name: "Main Warehouse Area",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331775855/output/hasil_deteksi_batch_5/RESULT_IMG_3075.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102625Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=286185dfb91c502e692fbd0b4bb53bbd359196010566d519dca2da619963ef1a9ea23514b445b2c19ee7e6d976373bfb68b1069259ae073556e1a901ba82c266f2317f946820bcc6b3c9b7ce6a61299b53f1a9485ee282d544b5880d7cd1d05fe9f54760cfd71a6f10d0b1fccca594ce272ca6b251fa4a3baaca524cece331957178981e00195b79207c4fd49c77a8e9051fcdc26fe5e09050172f4a1d40ee97709e94e064337752e16056745b7ea29107fa15d1bc3a8e419b71a53478e1ea4a60e7c24978c9c1b01f1b34c96a2f14ee5f0fffda15fc7cbe367979ca4a730c90da81e42fd2bf9d5cdb85d8b269790d93a9fa8ffef437905aba0d9460b5b1c9f4",
    snapshotUrl: "../../assets/3075.png",
    status: "Connected"
  },
  {
    id: "CAM-HA-03",
    name: "Heavy Equipment Yard",
    videoUrl: "https://storage.googleapis.com/kaggle-script-versions/331775855/output/hasil_deteksi_batch_5/RESULT_IMG_3074.mp4?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20260701%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260701T102631Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=6bf26531abb7e515518f076c7a1e1cc793dbb2559a9a63eeb0e6e1428810bb87a8f39bc4579e291368fc21a5fa748b404caf4c1fc7af7410ce3f6560ccff6989ab87518a0cae3e9399c77d026b6fe31ceb3349f1946b11f2ba2214747026c648ba0350eaf7269736fafa2db6c457d34d8b70105554abe1f5b73e72544a94db1da8db8c2d710f8c58f116eb5847134455618ed65137f2ecaff9e4bca88817437c081b6d122456656d45813c72d8384b4e0c4f1c749b904a221b8798a8bef98fa79e95cf510a622066aea48bb661a2ec764183415954c3afc31125cf5e07a10a776866948bd5e626d7234c9337b37456c8bce847199c171af7f52b8d7b29f35582",
    snapshotUrl: "../../assets/3074.png",
    status: "Connected"
  }
];

export default function Cameras({ 
  cameras, 
  onTriggerViolation 
}: CamerasProps) {
  // Filters state
  const [filterLocation, setFilterLocation] = useState('All locations');
  const [filterCameraId, setFilterCameraId] = useState('All cameras');
  const [filterStatus, setFilterStatus] = useState('All status');

  // UI state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Snapshot View Modal state
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<CCTVStream | null>(null);
  const [snapshotData, setSnapshotData] = useState<Snapshot | null>(null);
  const [snapshotFitMode, setSnapshotFitMode] = useState<'contain' | 'cover'>('contain');

  // Synchronize playing states when isPaused changes
  useEffect(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (isPaused) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    });
  }, [isPaused]);

  const handleOpenSnapshot = (stream: CCTVStream) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const randomWorkerId = `WK-${Math.floor(Math.random() * 2000) + 1000}`;
    const violationsList = ['No Safety Helmet', 'No Safety Vest', 'No Safety Boots', 'No Safety Goggles'];
    const randomViolation = violationsList[Math.floor(Math.random() * violationsList.length)];

    setSnapshotData({
      timestamp,
      camera: stream.id,
      location: stream.name,
      workerId: randomWorkerId,
      violation: stream.status === 'Violation Detected' ? 'No Safety Vest' : randomViolation,
      imageUrl: stream.snapshotUrl
    });
    setSelectedStream(stream);
    setIsSnapshotOpen(true);
  };

  const handleDownloadSnapshot = () => {
    if (!snapshotData) return;
    alert(`Downloading snapshot: MineGuard_Snapshot_${snapshotData.camera}_${snapshotData.timestamp.replace(/:/g, '')}.png`);
    setIsSnapshotOpen(false);
  };

  // Merge dynamic state statistics from cameras prop to the static cctvStreams configuration
  const mergedStreams = cctvStreams.map(stream => {
    const matchingCamera = cameras.find(c => c.id === stream.id);
    return {
      ...stream,
      violations24h: matchingCamera ? matchingCamera.violations24h : Math.floor(Math.random() * 10),
      detected24h: matchingCamera ? matchingCamera.detected24h : Math.floor(Math.random() * 50) + 20,
      // If parent React state has violation or matches stream state
      currentStatus: (matchingCamera && matchingCamera.violations24h > 15) ? 'Violation Detected' : stream.status
    };
  });

  // Filter streams based on user selections
  const filteredStreams = mergedStreams.filter(stream => {
    if (filterLocation !== 'All locations' && !stream.name.toLowerCase().includes(filterLocation.toLowerCase().replace(' pit a', '').replace(' pit b', '').replace(' alpha', '').replace(' area', '').replace(' yard', ''))) return false;
    if (filterCameraId !== 'All cameras' && stream.id !== filterCameraId) return false;
    if (filterStatus !== 'All status' && stream.currentStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      
      {/* 2. UPPER COMMAND HEADER BAR */}
      <div id="cctv-matrix-header-bar" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Video className="w-5 h-5 text-[#E30613]" />
            Live CCTV Compliance Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time object detection and safety compliance streams running with YOLO & Face Recognition</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Pause/Resume Streams */}
          <button 
            type="button"
            id="btn-pause-feeds"
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isPaused 
                ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs' 
                : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Matrix' : 'Pause Matrix'}</span>
          </button>

          {/* Filter Pop Trigger */}
          <button 
            type="button"
            id="btn-open-filter"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Matrix Settings</span>
          </button>
        </div>
      </div>

      {/* 3. GRID LAYOUT: 6 CCTV CAMERAS (Premium Cyberpunk Dark Containers inside Light Canvas) */}
      <div id="cctv-streams-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStreams.map((stream) => {
          const isViolation = stream.currentStatus === 'Violation Detected';
          const isOffline = stream.currentStatus === 'Offline';

          return (
            <div 
              key={stream.id}
              id={`stream-${stream.id}`}
              className={`bg-[#0B132B]/95 border rounded-xl overflow-hidden shadow-md group hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                isViolation 
                  ? 'border-red-500 hover:border-red-500 shadow-red-500/5 hover:shadow-red-500/10' 
                  : 'border-slate-800 hover:border-[#E30613]/50'
              }`}
            >
              {/* CCTV Live Frame Box */}
              <div 
                className="relative overflow-hidden aspect-video bg-black cursor-pointer" 
                onClick={() => handleOpenSnapshot(stream)}
              >
                {/* Real HTML5 Autoplay/Looping/Muted Video Stream */}
                {!isOffline ? (
                  <video
                    src={stream.videoUrl}
                    poster={stream.snapshotUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase">Stream Offline</span>
                  </div>
                )}

                {/* Left corner scan lines and HUD Overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/30 pointer-events-none" />
                
                {/* Cyberpunk grid background glow */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4))] " />

                {/* TOP LEFT: Live Stream Indicator */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 bg-black/50 backdrop-blur-xs px-2 py-1 rounded border border-white/10">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-500' : isViolation ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-[9px] text-white font-mono font-bold uppercase tracking-wider">
                    {isOffline ? 'OFFLINE' : isViolation ? 'VIOLATION' : 'LIVE'}
                  </span>
                </div>

                {/* TOP RIGHT: Camera ID Badge */}
                <div className="absolute top-2.5 right-2.5 bg-black/60 border border-white/10 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow">
                  {stream.id}
                </div>

                {/* BOTTOM LEFT: Camera Location Info overlay */}
                <div className="absolute bottom-2.5 left-2.5 bg-black/55 backdrop-blur-xs px-2.5 py-1 rounded border border-white/5 text-left">
                  <p className="text-[10px] text-slate-300 font-bold">{stream.name}</p>
                </div>

                {/* BOTTOM RIGHT: Live local time */}
                <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-slate-400 text-[8px] font-mono px-1.5 py-0.5 rounded">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>

                {/* Hover Action HUD Overlay */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                  <span className="bg-[#E30613] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-lg border border-red-500/20">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Snapshot</span>
                  </span>
                </div>
              </div>

              {/* Bottom statistics panel */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border-r border-slate-800/80">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Violations 24H</p>
                    <p className={`text-lg font-extrabold mt-0.5 font-mono tracking-tight transition-colors ${isViolation ? 'text-red-500 font-black' : 'text-slate-200'}`}>
                      {stream.violations24h}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Detected Persons</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-0.5 font-mono tracking-tight">
                      {stream.detected24h}
                    </p>
                  </div>
                </div>

                {/* Card footer control */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center text-[9px] text-slate-400 font-mono">
                    <Activity className="w-3 h-3 text-emerald-500 mr-1" />
                    <span>SEC_V_AUTO</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onTriggerViolation(stream.id, 'No Safety Vest')}
                    disabled={isOffline}
                    className={`text-[9px] px-2.5 py-1 rounded transition-all font-bold uppercase tracking-wide cursor-pointer ${
                      isOffline 
                        ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-[#E30613] hover:text-white hover:border-[#E30613]'
                    }`}
                  >
                    Trigger Violation
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredStreams.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-500 font-semibold shadow-xs">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No camera streams found matching the applied matrix settings.
          </div>
        )}
      </div>

      {/* MODAL 1: Filter Settings Popup */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-w-md w-full text-slate-800"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#E30613]">
                  <Filter className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">Matrix Settings</h3>
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
                
                {/* Location Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location Zone</label>
                  <select 
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-[#E30613] cursor-pointer font-semibold"
                  >
                    <option value="All locations">All locations</option>
                    <option value="Workshop">Workshop Area</option>
                    <option value="Loading Point">Loading Point Area</option>
                    <option value="Pit B">Pit B Zone</option>
                    <option value="Warehouse">Warehouse Zone</option>
                    <option value="Equipment">Heavy Equipment Yard</option>
                  </select>
                </div>

                {/* Camera Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Camera Identifier</label>
                  <select 
                    value={filterCameraId}
                    onChange={(e) => setFilterCameraId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-[#E30613] cursor-pointer font-mono font-bold text-[#E30613]"
                  >
                    <option value="All cameras">All cameras</option>
                    {cctvStreams.map(c => (
                      <option key={c.id} value={c.id}>{c.id} ({c.name})</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operational Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-[#E30613] cursor-pointer font-semibold"
                  >
                    <option value="All status">All status</option>
                    <option value="Connected">Connected (Normal)</option>
                    <option value="Violation Detected">Violation Detected</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 px-5 py-4 flex justify-end space-x-2.5 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => {
                    setFilterLocation('All locations');
                    setFilterCameraId('All cameras');
                    setFilterStatus('All status');
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 text-xs hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Reset Settings
                </button>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Snapshot Popup Inspector */}
      <AnimatePresence>
        {isSnapshotOpen && snapshotData && selectedStream && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-w-xl w-full text-slate-800"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#E30613]">
                  <CameraIcon className="w-5 h-5 animate-pulse" />
                  <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">Snapshot Inspector</h3>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Fit Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setSnapshotFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    title={snapshotFitMode === 'contain' ? "Change to Fill Screen (Cover)" : "Change to Fit Image (Contain)"}
                  >
                    {snapshotFitMode === 'contain' ? (
                      <>
                        <Maximize className="w-3.5 h-3.5 text-[#E30613]" />
                        <span>Fill Screen</span>
                      </>
                    ) : (
                      <>
                        <Minimize className="w-3.5 h-3.5 text-[#E30613]" />
                        <span>Fit Image</span>
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsSnapshotOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Snapshot Image with overlay bounding boxes */}
              <div className="relative aspect-video w-full bg-slate-950 border-b border-slate-200 flex items-center justify-center overflow-hidden">
                <img 
                  src={snapshotData.imageUrl} 
                  alt="Snapshot feed" 
                  className={`transition-all duration-300 opacity-95 ${
                    snapshotFitMode === 'cover' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'
                  }`}
                />
                


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
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Capture Timestamp</p>
                  <p className="font-bold text-slate-900 mt-1 font-mono">{snapshotData.timestamp}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">CCTV Channel ID</p>
                  <p className="font-bold text-[#E30613] mt-1 font-mono">{snapshotData.camera}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Assigned Location</p>
                  <p className="font-bold text-slate-900 mt-1">{snapshotData.location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Closest Enrolled Worker</p>
                  <p className="font-bold text-slate-800 mt-1 font-mono">{snapshotData.workerId}</p>
                </div>
                
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1.5 font-bold">Inference Violations Detected</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded font-bold text-xs border ${
                    selectedStream.currentStatus === 'Violation Detected'
                      ? 'bg-red-50 text-[#E30613] border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {selectedStream.currentStatus === 'Violation Detected' ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                        {snapshotData.violation}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Fully Compliant PPE
                      </>
                    )}
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
                  Close
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
