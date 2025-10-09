import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import MedicationCard from '../components/MedicationCard';
import MedicationFormModal from '../components/MedicationFormModal';
import { useAuth } from '../context/AuthContext';
import logo2 from '../assets/MediVise2.png';

type Med = any;

export default function Medications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Med[]>([]);
  const [filter, setFilter] = useState<"all"|"active"|"inactive">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Med | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const token = await user?.getIdToken();
      const qs = filter === "all" ? "" : `?is_active=${filter === "active" ? "true":"false"}`;
      const url = `http://127.0.0.1:8000/api/medications${qs}`;
      console.log('Fetching medications from:', url);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch medications: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Fetched medications:', data);
      setItems(data);
    } catch (error) {
      console.error('Error fetching medications:', error);
      alert('Failed to load medications. Please refresh the page.');
    }
  };

  useEffect(() => { 
    if (user) {
      fetchData(); 
    }
    /* eslint-disable-next-line */ 
  }, [filter, user]);

  const addNew = () => { setEditing(undefined); setOpen(true); };
  const onEdit = (m: Med) => { setEditing(m); setOpen(true); };
  const onDelete = async (m: Med) => {
    if (!confirm(`Delete ${m.name}?`)) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/medications/${m.id}`, { 
        method: "DELETE",
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    }
  };

  const submit = async (payload: any) => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    try {
      setIsSubmitting(true);
      const token = await user?.getIdToken();
      console.log('Submitting medication:', payload);
      
      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      };
      
      if (editing) {
        const response = await fetch(`http://127.0.0.1:8000/api/medications/${editing.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Update failed: ${response.status}`);
        }
        console.log('Medication updated successfully');
      } else {
        const response = await fetch(`http://127.0.0.1:8000/api/medications`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          throw new Error(`Create failed: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        const result = await response.json();
        console.log('Medication created successfully:', result);
      }
      
      // Refresh the data
      await fetchData();
      console.log('Data refreshed');
      
      // Close modal and reset editing state
      setOpen(false);
      setEditing(undefined);
    } catch (error) {
      console.error('Error submitting medication:', error);
      alert('Failed to save medication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <Link to="/about">
        <img src={logo2} alt="MediVise" className="nav-logo-small" />
      </Link>
      <LoggedInNavbar />

      <div className="dashboard-content" style={{ maxWidth: 1200 }}>
        <div className="medications-header">
          <h1 className="dashboard-title">Medications</h1>
          <button onClick={addNew} className="add-medication-btn">
            <span className="add-btn-icon">+</span>
            Add medication
          </button>
        </div>

        <div className="medication-filters">
          {["all","active","inactive"].map(f => (
            <button key={f}
              onClick={()=>setFilter(f as any)}
              className={`filter-btn ${filter===f ? "active" : ""}`}>
              {f[0].toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div className="medications-grid">
          {items.map(m => (
            <MedicationCard key={m.id} medication={m} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {items.length === 0 && (
            <div className="medication-empty">
              <h3>No medications found</h3>
              <p>Click "Add medication" to create your first medication entry.</p>
            </div>
          )}
        </div>

        <MedicationFormModal 
          open={open} 
          onClose={()=>{
            setOpen(false);
            setEditing(undefined);
          }} 
          initial={editing} 
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}


