import LoggedInNavbar from '../components/LoggedInNavbar';

export default function Documents() {
  return (
    <div className="dashboard-page">
      <LoggedInNavbar />

      {/* Content */}
      <div className="dashboard-content" style={{ maxWidth: 900 }}>
        <h1 className="dashboard-title" style={{ textAlign: 'center' }}>Your Documents</h1>

        <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: '1.25rem', color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Uploaded Files</div>
            <button className="button subtle" style={{ background: '#0a0a0a', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>Upload</button>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
            <p style={{ margin: 0, color: '#334155' }}>No documents yet. Upload to see them here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


