import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import LoggedInNavbar from '../components/LoggedInNavbar';
import AppointmentCard from '../components/AppointmentCard';
import AppointmentFormModal from '../components/AppointmentFormModal';
import { useAuth } from '../context/AuthContext';
import logo2 from '../assets/MediVise2.png';

type Appointment = any;

export default function Appointments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<"all"|"upcoming"|"past"|"scheduled"|"confirmed"|"completed">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const token = await user?.getIdToken();
      let qs = "";
      
      if (filter === "upcoming") {
        qs = "?upcoming_only=true";
      } else if (filter === "past") {
        // For past appointments, we'll filter on the frontend since the API doesn't have a past_only parameter
        qs = "";
      } else if (filter !== "all") {
        qs = `?status=${filter}`;
      }
      
      const url = `http://127.0.0.1:8000/api/appointments${qs}`;
      console.log('Fetching appointments from:', url);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch appointments: ${res.status}`);
      }
      
      let data = await res.json();
      
      // Filter past appointments on frontend if needed
      if (filter === "past") {
        const now = new Date();
        data = data.filter((appointment: Appointment) => new Date(appointment.scheduled_date) < now);
      }
      
      console.log('Fetched appointments:', data);
      setItems(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      alert('Failed to load appointments. Please refresh the page.');
    }
  };

  useEffect(() => { 
    if (user) {
      fetchData(); 
    }
    /* eslint-disable-next-line */ 
  }, [filter, user]);

  const addNew = () => { setEditing(undefined); setOpen(true); };
  const onEdit = (a: Appointment) => { setEditing(a); setOpen(true); };
  const onDelete = async (a: Appointment) => {
    if (!confirm(`Delete appointment "${a.title}"?`)) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/appointments/${a.id}`, { 
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
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment. Please try again.');
    }
  };

  const submit = async (payload: any) => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    try {
      setIsSubmitting(true);
      const token = await user?.getIdToken();
      console.log('Submitting appointment:', payload);
      
      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      };
      
      if (editing) {
        const response = await fetch(`http://127.0.0.1:8000/api/appointments/${editing.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Update failed: ${response.status}`);
        }
        console.log('Appointment updated successfully');
      } else {
        const response = await fetch(`http://127.0.0.1:8000/api/appointments`, {
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
        console.log('Appointment created successfully:', result);
      }
      
      // Refresh the data
      await fetchData();
      console.log('Data refreshed');
      
      // Close modal and reset editing state
      setOpen(false);
      setEditing(undefined);
    } catch (error) {
      console.error('Error submitting appointment:', error);
      alert('Failed to save appointment. Please try again.');
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
        <div className="appointments-header">
          <h1 className="dashboard-title">Appointments</h1>
          <button onClick={addNew} className="add-appointment-btn">
            <span className="add-btn-icon">+</span>
            Add appointment
          </button>
        </div>

        <div className="appointment-filters">
          {["all","upcoming","past","scheduled","confirmed","completed"].map(f => (
            <button key={f}
              onClick={()=>setFilter(f as any)}
              className={`filter-btn ${filter===f ? "active" : ""}`}>
              {f[0].toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div className="appointments-grid">
          {items.map(a => (
            <AppointmentCard key={a.id} appointment={a} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {items.length === 0 && (
            <div className="appointment-empty">
              <h3>No appointments found</h3>
              <p>Click "Add appointment" to schedule your first appointment.</p>
            </div>
          )}
        </div>

        <AppointmentFormModal 
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