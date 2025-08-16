// App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc } from 'firebase/firestore';
import { Home, Bell, Wrench, Users, CalendarDays, Building, Mail, Phone, MapPin } from 'lucide-react';

const App = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [residents, setResidents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [maintenanceForm, setMaintenanceForm] = useState({ name: '', apartment: '', issue: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const ModalMessage = ({ text }) => (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg z-50">
      {text}
    </div>
  );

  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}');
      const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN;
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      setDb(firestore);

      const handleAuth = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
        }
      };

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) setUserId(user.uid);
        else setUserId(crypto.randomUUID());
        setIsAuthReady(true);
      });

      handleAuth();
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setMessage("Error al inicializar la aplicación. Verifique la configuración de Firebase.");
      setLoading(false);
    }
  }, []);

  // Use REACT_APP_ID instead of __app_id
  const appId = process.env.REACT_APP_ID || 'default-app-id';

  useEffect(() => {
    if (!db || !isAuthReady) return;
    const announcementsPath = `/artifacts/${appId}/public/data/announcements`;

    try {
      const q = query(collection(db, announcementsPath));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setMessage("Error al cargar los anuncios.");
      setLoading(false);
    }
  }, [db, isAuthReady, appId]);

  useEffect(() => {
    if (!db || !isAuthReady) return;
    const residentsPath = `/artifacts/${appId}/public/data/residents`;

    try {
      const q = query(collection(db, residentsPath));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setResidents(data);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching residents:", error);
      setMessage("Error al cargar el directorio.");
    }
  }, [db, isAuthReady, appId]);

  useEffect(() => {
    if (!db || !isAuthReady) return;
    const calendarPath = `/artifacts/${appId}/public/data/calendar`;

    try {
      const q = query(collection(db, calendarPath));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCalendarEvents(data);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      setMessage("Error al cargar el calendario.");
    }
  }, [db, isAuthReady, appId]);

  const handleMaintenanceFormChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceForm({ ...maintenanceForm, [name]: value });
  };

  const handleMaintenanceFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;
    const maintenancePath = `/artifacts/${appId}/public/data/maintenance_requests`;

    try {
      await addDoc(collection(db, maintenancePath), { ...maintenanceForm, submittedAt: new Date().toISOString() });
      setMessage('¡Solicitud de mantenimiento enviada con éxito!');
      setMaintenanceForm({ name: '', apartment: '', issue: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      setMessage("Error al enviar la solicitud.");
    }
  };

  const handleAnnouncementFormChange = (e) => {
    const { name, value } = e.target;
    setAnnouncementForm({ ...announcementForm, [name]: value });
  };

  const handleAnnouncementFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;
    const announcementsPath = `/artifacts/${appId}/public/data/announcements`;

    try {
      await addDoc(collection(db, announcementsPath), {
        title: announcementForm.title,
        content: announcementForm.content,
        date: new Date().toISOString().split('T')[0],
      });
      setMessage('¡Anuncio publicado con éxito!');
      setAnnouncementForm({ title: '', content: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error adding announcement:", error);
      setMessage("Error al publicar el anuncio.");
    }
  };

  // Render page components (Dashboard, Announcements, Maintenance, Directory, Calendar)
  // ... keep your components unchanged from your previous App.jsx

  const renderPage = () => {
    if (loading) return <div className="flex justify-center items-center h-screen text-gray-700">Cargando...</div>;
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'announcements': return <Announcements />;
      case 'maintenance': return <Maintenance />;
      case 'directory': return <Directory />;
      case 'calendar': return <Calendar />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-800 pb-16">
      {message && <ModalMessage text={message} />}
      <Header title="Portal de Residentes" />
      <div className="p-4 max-w-4xl mx-auto">{renderPage()}</div>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default App;
