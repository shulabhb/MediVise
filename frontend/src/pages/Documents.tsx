import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoggedInNavbar from '../components/LoggedInNavbar';

type Doc = {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  uploadDate: string;
  documentType: string;
};

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BASE_URL = 'http://127.0.0.1:8000';

  async function fetchWithAuth(path: string, init?: RequestInit) {
    const token = await user?.getIdToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
      'Authorization': token ? `Bearer ${token}` : '',
    } as Record<string, string>;
    if (init?.body && !(init.headers as any)?.['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  }

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchWithAuth('/documents');
        setDocs(list as any);
      } catch (e) {
        console.error('Failed to load documents', e);
      }
    })();
  }, [user]);

  const handleNewClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    try {
      const token = await user?.getIdToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (data?.document) {
        setDocs(prev => [data.document, ...prev]);
      }
    } catch (e) {
      console.error('Upload failed', e);
      alert('Failed to upload document');
    }
  };

  const openViewer = (id: string) => {
    navigate(`/documents/view/${id}`);
  };

  const downloadDoc = async (id: string, filename: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${BASE_URL}/documents/${id}/file`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download document');
    }
  };

  const iconBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)',
    background: 'transparent',
    cursor: 'pointer'
  };

  const TooltipButton = ({ label, onClick, ariaLabel, children }: { label: string; onClick: () => void; ariaLabel: string; children: React.ReactNode }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={iconBtnStyle}
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseEnter={(e) => {
          const t = (e.currentTarget.nextSibling as HTMLElement);
          if (t) t.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const t = (e.currentTarget.nextSibling as HTMLElement);
          if (t) t.style.opacity = '0';
        }}
      >{children}</button>
      <span
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 8px',
          fontSize: 12,
          color: '#0f172a',
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 120ms ease',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
        }}
      >{label}</span>
    </div>
  );

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );


  const PencilIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3,6 5,6 21,6"></polyline>
      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );

  const startRename = (d: Doc) => {
    setRenamingId(d.id);
    setNewName(d.filename);
  };

  const saveRename = async (id: string) => {
    try {
      await fetchWithAuth(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ filename: newName }) });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, filename: newName } : d));
      setRenamingId(null);
      setNewName('');
    } catch (e) {
      console.error('Rename failed', e);
      alert('Failed to rename document');
    }
  };

  const deleteDoc = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await fetchWithAuth(`/documents/${id}`, { method: 'DELETE' });
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error('Delete failed', e);
      alert('Failed to delete document');
    }
  };

  return (
    <div className="dashboard-page">
      <LoggedInNavbar />

      {/* Content */}
      <div className="dashboard-content" style={{ maxWidth: 900 }}>
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Your Documents</h1>

        <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: '1.25rem', color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Uploaded Files</div>
            <div>
              <button
                className="button subtle"
                onClick={handleNewClick}
                title="Upload PDF"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f172a' }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20,
                  borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)'
                }}>+</span>
                New
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
            {docs.length === 0 ? (
              <p style={{ margin: 0, color: '#334155' }}>No documents yet. Upload to see them here.</p>
            ) : (
              <div>
                {docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 18 }}>📄</div>
                      {renamingId === d.id ? (
                        <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ fontSize: 14, padding: 6 }} />
                      ) : (
                        <div style={{ fontWeight: 600 }}>{d.filename}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {renamingId === d.id ? (
                        <>
                          <button className="button" onClick={() => saveRename(d.id)}>Save</button>
                          <button className="button subtle" onClick={() => { setRenamingId(null); setNewName(''); }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <TooltipButton ariaLabel="View document" label="View" onClick={() => openViewer(d.id)}><EyeIcon /></TooltipButton>
                          <TooltipButton ariaLabel="Download document" label="Download" onClick={() => downloadDoc(d.id, d.filename)}><DownloadIcon /></TooltipButton>
                          <TooltipButton ariaLabel="Rename document" label="Rename" onClick={() => startRename(d)}><PencilIcon /></TooltipButton>
                          <TooltipButton ariaLabel="Delete document" label="Delete" onClick={() => deleteDoc(d.id, d.filename)}><TrashIcon /></TooltipButton>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


