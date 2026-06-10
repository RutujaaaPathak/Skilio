import { createContext, useContext, useState, useCallback } from 'react';
import { adminService } from '../services/adminService.js';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getDashboard(); setDashboard(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async (range) => {
    setLoading(true); setError(null);
    try { const d = await adminService.getAnalytics(range); setAnalytics(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getBatches(); setBatches(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const addBatch = useCallback(async (data) => {
    setLoading(true); setError(null);
    try { const d = await adminService.createBatch(data); setBatches(prev => [...prev, d]); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getDepartments(); setDepartments(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getInstitutions(); setInstitutions(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getStudents(); setStudents(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getSubscriptions(); setSubscriptions(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getTeachers(); setTeachers(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const fetchPolicies = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await adminService.getPolicies(); setPolicies(d); return d; }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  return (
    <AdminContext.Provider value={{
      dashboard, analytics, batches, departments, institutions,
      students, subscriptions, teachers, policies,
      loading, error,
      fetchDashboard, fetchAnalytics, fetchBatches, addBatch,
      fetchDepartments, fetchInstitutions, fetchStudents,
      fetchSubscriptions, fetchTeachers, fetchPolicies,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
