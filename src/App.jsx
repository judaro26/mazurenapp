// App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc } from 'firebase/firestore';
import { Home, Bell, Wrench, Users, CalendarDays, Building, Mail, Phone, MapPin } from 'lucide-react';

const App = () => {
  // Estados para los datos de la base de datos
  const [announcements, setAnnouncements] = useState([]);
  const [residents, setResidents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Estado para formularios
  const [maintenanceForm, setMaintenanceForm] = useState({ name: '', apartment: '', issue: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  // Estados de la aplicación
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Modal
  const ModalMessage = ({ text }) => (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg z-50">
      {text}
    </div>
  );

  // Inicializar Firebase y autenticación
  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      setDb(firestore);

      const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN;

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
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(crypto.randomUUID());
        }
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

  // Helper para obtener el appId desde env
  const getAppId = () => process.env.REACT_APP_ID || 'default-app-id';

  // Escuchar cambios en colecciones
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const announcementsPath = `/artifacts/${getAppId()}/public/data/announcements`;
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
  }, [db, isAuthReady]);

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const residentsPath = `/artifacts/${getAppId()}/public/data/residents`;
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
  }, [db, isAuthReady]);

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const calendarPath = `/artifacts/${getAppId()}/public/data/calendar`;
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
  }, [db, isAuthReady]);

  // Formularios
  const handleMaintenanceFormChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceForm({ ...maintenanceForm, [name]: value });
  };
  const handleMaintenanceFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;

    const maintenancePath = `/artifacts/${getAppId()}/public/data/maintenance_requests`;
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

    const announcementsPath = `/artifacts/${getAppId()}/public/data/announcements`;
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

  // Renderizado de páginas
  const Header = ({ title }) => (
    <header className="flex items-center justify-center p-4 bg-gray-900 text-white rounded-b-xl shadow-lg sticky top-0 z-50">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </header>
  );

  const Navbar = ({ currentPage, setCurrentPage }) => (
    <nav className="flex justify-around items-center p-2 bg-gray-900 text-gray-400 rounded-t-xl shadow-inner fixed bottom-0 left-0 right-0 z-50">
      <NavItem icon={<Home />} label="Inicio" onClick={() => setCurrentPage('dashboard')} active={currentPage === 'dashboard'} />
      <NavItem icon={<Bell />} label="Anuncios" onClick={() => setCurrentPage('announcements')} active={currentPage === 'announcements'} />
      <NavItem icon={<Wrench />} label="Mantenimiento" onClick={() => setCurrentPage('maintenance')} active={currentPage === 'maintenance'} />
      <NavItem icon={<Users />} label="Directorio" onClick={() => setCurrentPage('directory')} active={currentPage === 'directory'} />
      <NavItem icon={<CalendarDays />} label="Calendario" onClick={() => setCurrentPage('calendar')} active={currentPage === 'calendar'} />
    </nav>
  );

  const NavItem = ({ icon, label, onClick, active }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${active ? 'text-blue-400' : 'hover:text-blue-300'}`}
    >
      <div className="text-2xl">{icon}</div>
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );

  // Páginas
  const Dashboard = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">¡Bienvenido a casa!</h2>
      <p className="text-sm text-gray-500 mb-4">
        Tu ID de usuario: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md text-xs">{userId}</span>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard icon={<Bell size={48} />} title="Anuncios" onClick={() => setCurrentPage('announcements')} />
        <DashboardCard icon={<Wrench size={48} />} title="Mantenimiento" onClick={() => setCurrentPage('maintenance')} />
        <DashboardCard icon={<Users size={48} />} title="Directorio" onClick={() => setCurrentPage('directory')} />
        <DashboardCard icon={<CalendarDays size={48} />} title="Calendario" onClick={() => setCurrentPage('calendar')} />
      </div>
      <section className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Avisos Importantes</h3>
        <ul className="space-y-2">
          {announcements.slice(0, 2).map(a => (
            <li key={a.id} className="text-sm text-gray-600 border-b pb-2 last:border-b-0">
              <span className="font-medium text-gray-800">{a.title}</span> - {a.content.substring(0, 50)}...
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  const DashboardCard = ({ icon, title, onClick }) => (
    <button onClick={onClick} className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-col items-center hover:shadow-lg transition">
      {icon}
      <span className="mt-2 text-sm font-medium text-gray-700">{title}</span>
    </button>
  );

  // TODO: Agregar las páginas de Mantenimiento, Anuncios, Directorio y Calendario de manera similar

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {message && <ModalMessage text={message} />}
      <Header title="Portal de Residentes" />
      <main className="p-4">
        {loading ? <p className="text-center text-gray-400">Cargando...</p> : <Dashboard />}
      </main>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default App;
