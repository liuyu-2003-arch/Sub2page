import React, { useState, useEffect } from 'react';
import { Upload, FileText, ExternalLink, Trash2, CheckCircle2, AlertCircle, Loader2, Edit3, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SubtitleFile {
  name: string;
  url: string;
  mtime: string;
}

export default function App() {
  const [files, setFiles] = useState<SubtitleFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const fetchSubtitles = async () => {
    try {
      const response = await fetch('/api/subtitles');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch subtitles:', err);
    }
  };

  useEffect(() => {
    fetchSubtitles();
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.srt') && !file.name.endsWith('.vtt')) {
      setError('Invalid format. Use .srt or .vtt');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Created: ${result.name}`);
        fetchSubtitles();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/subtitles/${name}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuccess('Deleted successfully');
        fetchSubtitles();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName || newName === oldName) {
      setEditingName(null);
      return;
    }

    try {
      const response = await fetch(`/api/subtitles/${oldName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      if (response.ok) {
        setSuccess('Renamed successfully');
        setEditingName(null);
        fetchSubtitles();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Rename failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const formatTitle = (name: string) => {
    // Remove the random hash added at the end (5 chars + hyphen)
    const baseName = name.replace(/-[a-z0-9]{5}$/, '');
    return baseName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white overflow-x-hidden">
      <div className="noise-bg" />
      
      {/* Navigation / Header */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
          <span className="font-display text-xl uppercase tracking-widest">SUB.GEN</span>
        </div>
        
        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.1)]"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Processing' : 'Upload Subtitle'}
            <input
              type="file"
              accept=".srt,.vtt"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </motion.button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-8 max-w-[1400px] mx-auto">
        {/* Hero Section */}
        <section className="mb-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="editorial-title">
              Crafted<br />
              <span className="text-transparent" style={{ WebkitTextStroke: '1px black' }}>Subtitles</span>
            </h1>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 items-end">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-2xl font-light leading-relaxed text-gray-600 max-w-xl"
            >
              Transforming raw data into cinematic reading experiences. 
              Minimal, focused, and designed for the modern web.
            </motion.p>
          </div>
        </section>

        {/* Status Messages */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`fixed bottom-8 right-8 z-[100] p-6 rounded-2xl glass-card flex items-center gap-4 min-w-[300px] ${
                error ? 'text-red-600 border-red-500/30' : 'text-emerald-600 border-emerald-500/30'
              }`}
            >
              {error ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              <div>
                <p className="font-bold uppercase text-xs tracking-widest mb-1">{error ? 'Error' : 'Success'}</p>
                <p className="text-sm opacity-80">{error || success}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid List */}
        <section>
          <div className="flex items-center gap-4 mb-12">
            <div className="h-[1px] flex-1 bg-black/10" />
            <h2 className="font-serif italic text-3xl">Archive</h2>
            <div className="h-[1px] w-20 bg-black/10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/10 border border-black/10 overflow-hidden rounded-3xl shadow-2xl shadow-black/5">
            {files.length === 0 ? (
              <div className="col-span-full py-40 text-center bg-white">
                <p className="text-gray-400 uppercase tracking-[0.5em] text-sm">Empty Archive</p>
              </div>
            ) : (
              files.map((file, index) => (
                <motion.div
                  key={file.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="group relative aspect-[4/5] bg-white overflow-hidden flex flex-col justify-end hover:bg-black transition-all duration-700 cursor-pointer"
                >
                  {/* Automatic Cover Image */}
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                    <img 
                      src={`https://picsum.photos/seed/${file.name}/800/1000?grayscale`} 
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="relative z-10 p-10 w-full bg-gradient-to-t from-white via-white/80 to-transparent group-hover:from-black group-hover:via-black group-hover:to-transparent transition-all duration-700">
                    <div className="flex justify-between items-start mb-8">
                      <span className="font-mono text-[10px] text-gray-400 group-hover:text-white/40">
                        0{index + 1}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingName(file.name);
                            setNewName(file.name);
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.name);
                          }}
                          className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.url, '_blank');
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {editingName === file.name ? (
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(file.name)}
                            className="bg-transparent border-b border-white text-white text-2xl font-serif italic outline-none w-full"
                          />
                          <button onClick={() => handleRename(file.name)} className="text-white"><Check className="w-5 h-5" /></button>
                          <button onClick={() => setEditingName(null)} className="text-white/50"><X className="w-5 h-5" /></button>
                        </div>
                      ) : (
                        <h3 
                          onClick={() => window.open(file.url, '_blank')}
                          className="text-3xl font-serif italic mb-4 group-hover:text-white transition-colors line-clamp-2 leading-tight cursor-pointer"
                        >
                          {formatTitle(file.name)}
                        </h3>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white/60">
                          {new Date(file.mtime).toLocaleDateString()}
                        </span>
                        <div className="h-px w-8 bg-black/10 group-hover:bg-white/20" />
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white/60">
                          Archive
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="px-8 py-20 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="font-display text-4xl opacity-10">SUB.GEN</div>
        <div className="text-center md:text-right">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-2">Designed for the future of reading</p>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
}
