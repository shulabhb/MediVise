import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import { useAuth } from '../context/AuthContext';

export default function PdfViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fileUrl, setFileUrl] = useState<string>('');
  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    (async () => {
      if (!id) return;
      const token = await user?.getIdToken();
      try {
        const res = await fetch(`${BASE_URL}/documents/${id}/file`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Viewer fetch failed', e);
        setFileUrl('');
      }
    })();
  }, [id, user]);

  return (
    <div className="dashboard-page">
      <LoggedInNavbar />
      <div className="dashboard-content" style={{ maxWidth: 1200 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 className="dashboard-title">Document Viewer</h1>
          <button
            className="button subtle"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            title="Back"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>←</span>
            Back
          </button>
        </div>
        {fileUrl ? (
          <iframe title="PDF" src={fileUrl} style={{ width: '100%', height: '80vh', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }} />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  );
}


