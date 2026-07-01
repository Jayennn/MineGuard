import React, { useState } from 'react';
import { 
  UserPlus, Search, SlidersHorizontal, Upload, X, Trash2, Edit, Check,
  Briefcase, Landmark, ShieldCheck, CheckCircle2, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Worker } from '../types';

interface FaceRegistrationProps {
  workers: Worker[];
  onAddWorker: (worker: Worker, file: File | null) => void;
  onDeleteWorker: (id: string) => void;
  onUpdateWorker: (worker: Worker, file: File | null) => void;
}

export default function FaceRegistration({ 
  workers, 
  onAddWorker, 
  onDeleteWorker,
  onUpdateWorker 
}: FaceRegistrationProps) {
  // Form State
  const [workerId, setWorkerId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Auto generate next worker ID
  const generateNextId = () => {
    const numericIds = workers
      .map(w => parseInt(w.id.replace('WK-', ''), 10))
      .filter(num => !isNaN(num));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 1000;
    return `WK-${maxId + 1}`;
  };

  // Pre-fill with a valid default ID
  React.useEffect(() => {
    if (!workerId && !editingId) {
      setWorkerId(generateNextId());
    }
  }, [workers, workerId, editingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setWorkerId('');
    setFullName('');
    setDepartment('');
    setPosition('');
    setStatus('Active');
    setPhotoPreview(null);
    setPhotoFile(null);
    setEditingId(null);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !department || !position) {
      alert('Tolong isi semua field wajib!');
      return;
    }

    const defaultPhoto = photoPreview || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fullName.replace(/\s+/g, '')}`;

    if (editingId) {
      // Save Edits
      onUpdateWorker({
        id: workerId,
        name: fullName,
        department,
        position,
        status,
        photoUrl: defaultPhoto
      }, photoFile);
      setEditingId(null);
    } else {
      // Register New Worker
      onAddWorker({
        id: workerId,
        name: fullName,
        department,
        position,
        status,
        photoUrl: defaultPhoto
      }, photoFile);
    }
    
    resetForm();
  };

  const handleEditClick = (worker: Worker) => {
    setEditingId(worker.id);
    setWorkerId(worker.id);
    setFullName(worker.name);
    setDepartment(worker.department);
    setPosition(worker.position);
    setStatus(worker.status);
    setPhotoPreview(worker.photoUrl);
    setPhotoFile(null); // Keep original if no new file is uploaded
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredWorkers = workers.filter(w => 
    w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      
      {/* Form Card: Register New Worker */}
      <div id="register-worker-form-card" className="bg-white border border-slate-200/95 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-[#E30613]" />
            <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">
              {editingId ? `Edit Worker (${workerId})` : 'Register New Worker'}
            </h3>
          </div>
          <span className="text-xs text-slate-500">Fill in the details and upload a face photo for recognition</span>
        </div>

        <form onSubmit={handleRegister} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Photo Upload Box */}
            <div id="photo-upload-container" className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:border-[#E30613]/50 transition-all group relative">
              <input 
                type="file" 
                accept="image/*"
                id="photo-upload-input"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {photoPreview ? (
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-[#E30613]/80 group shadow-md bg-slate-100">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </button>
                </div>
              ) : (
                <label htmlFor="photo-upload-input" className="cursor-pointer flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-slate-200 group-hover:border-[#E30613]/40 group-hover:bg-[#E30613]/5 transition-all text-slate-500 shadow-2xs">
                    <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Upload Worker Photo</p>
                    <p className="text-[11px] text-slate-500 mt-1">Drag & drop or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#E30613] text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer shadow-sm">
                    Browse File
                  </span>
                </label>
              )}
              
              <div className="text-center mt-3">
                <p className="text-[10px] text-slate-500">Used for active face recognition on live CCTV feeds</p>
              </div>
            </div>

            {/* Column 2 & 3: Metadata inputs */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Worker ID */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Worker ID <span className="text-[#E30613]">*</span></label>
                <input 
                  type="text" 
                  id="input-worker-id"
                  required
                  disabled={!!editingId}
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  placeholder="e.g. WK-1234"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E30613] disabled:opacity-60 disabled:bg-slate-50 font-mono font-bold"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name <span className="text-[#E30613]">*</span></label>
                <input 
                  type="text" 
                  id="input-full-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E30613]"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department <span className="text-[#E30613]">*</span></label>
                <select 
                  id="select-department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E30613] cursor-pointer"
                >
                  <option value="">Select Department</option>
                  <option value="IT & Digitalization">IT & Digitalization</option>
                  <option value="Safety & HSE">Safety & HSE</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Mining Operation">Mining Operation</option>
                  <option value="Engineering & Geology">Engineering & Geology</option>
                </select>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Position <span className="text-[#E30613]">*</span></label>
                <input 
                  type="text" 
                  id="input-position"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Supervisor, Manager, Safety Officer"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E30613]"
                />
              </div>

              {/* Status Toggle buttons */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStatus('Active')}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      status === 'Active' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs' 
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Inactive')}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      status === 'Inactive' 
                        ? 'bg-red-50 border-[#E30613] text-[#E30613] shadow-2xs' 
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Form Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 border-t border-slate-200 pt-4">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <span>{editingId ? 'Save Changes' : '+ Register Worker'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Registered Workers List Section */}
      <div id="registered-workers-list-card" className="bg-white border border-slate-200/95 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">Registered Workers</h3>
            <p className="text-xs text-slate-500 mt-0.5">{workers.length} workers enrolled</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search name or ID..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#E30613] w-full sm:w-52"
              />
            </div>
            
            <button className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Photo</th>
                <th className="py-3 px-5">Worker ID</th>
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Position</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence mode="popLayout">
                {filteredWorkers.map((worker) => (
                  <motion.tr 
                    key={worker.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3.5 px-5">
                      <img 
                        src={worker.photoUrl} 
                        alt={worker.name} 
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-50" 
                      />
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#E30613]">
                      {worker.id}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {worker.name}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {worker.department}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {worker.position}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        worker.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-[#E30613] border-red-200'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => handleEditClick(worker)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded hover:border-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Edit Worker"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => onDeleteWorker(worker.id)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded hover:border-[#E30613] hover:text-[#E30613] transition-colors cursor-pointer"
                          title="Delete Worker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium bg-white">
                    No workers found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}