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
  
  // Estado para el formulario de mantenimiento
  const [maintenanceForm, setMaintenanceForm] = useState({
    name: '',
    apartment: '',
    issue: '',
  });

  // Estados de la aplicación
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  // Estado para el formulario de anuncios
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
  });

  // Estado para las instancias de Firebase
  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Mensaje modal
  const ModalMessage = ({ text }) => {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg z-50">
        {text}
      </div>
    );
  };

  // Efecto para la inicialización de Firebase y la autenticación
  useEffect(() => {
    try {
      // Usar variables globales proporcionadas por el entorno de Canvas
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
      
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      setDb(firestore);

      // Manejar la autenticación del usuario
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

      // Establecer el observador del estado de autenticación
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

  // Efecto para escuchar los cambios en los anuncios
  useEffect(() => {
    if (!db || !isAuthReady) return;
    
    // Obtener el ID de la aplicación y el ID del usuario para el path de la colección
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userId = getAuth().currentUser?.uid || crypto.randomUUID();
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
  }, [db, isAuthReady]);
  
  // Efecto para escuchar los cambios en los residentes
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
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
  }, [db, isAuthReady]);

  // Efecto para escuchar los cambios en los eventos del calendario
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
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
  }, [db, isAuthReady]);

  // Maneja los cambios de entrada del formulario de mantenimiento
  const handleMaintenanceFormChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceForm({ ...maintenanceForm, [name]: value });
  };

  // Maneja el envío del formulario de mantenimiento
  const handleMaintenanceFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const maintenancePath = `/artifacts/${appId}/public/data/maintenance_requests`;

    try {
      await addDoc(collection(db, maintenancePath), {
        ...maintenanceForm,
        submittedAt: new Date().toISOString(),
      });
      setMessage('¡Solicitud de mantenimiento enviada con éxito!');
      setMaintenanceForm({ name: '', apartment: '', issue: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      setMessage("Error al enviar la solicitud.");
    }
  };

  // Maneja los cambios de entrada del formulario de anuncios
  const handleAnnouncementFormChange = (e) => {
    const { name, value } = e.target;
    setAnnouncementForm({ ...announcementForm, [name]: value });
  };

  // Maneja el envío del formulario de anuncios
  const handleAnnouncementFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const announcementsPath = `/artifacts/${appId}/public/data/announcements`;

    try {
      await addDoc(collection(db, announcementsPath), {
        title: announcementForm.title,
        content: announcementForm.content,
        date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
      });
      setMessage('¡Anuncio publicado con éxito!');
      setAnnouncementForm({ title: '', content: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error adding announcement:", error);
      setMessage("Error al publicar el anuncio.");
    }
  };

  // Componente para el encabezado
  const Header = ({ title }) => (
    <header className="flex items-center justify-center p-4 bg-gray-900 text-white rounded-b-xl shadow-lg sticky top-0 z-50">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </header>
  );

  // Componente para la barra de navegación
  const Navbar = ({ currentPage, setCurrentPage }) => (
    <nav className="flex justify-around items-center p-2 bg-gray-900 text-gray-400 rounded-t-xl shadow-inner fixed bottom-0 left-0 right-0 z-50">
      <NavItem icon={<Home />} label="Inicio" onClick={() => setCurrentPage('dashboard')} active={currentPage === 'dashboard'} />
      <NavItem icon={<Bell />} label="Anuncios" onClick={() => setCurrentPage('announcements')} active={currentPage === 'announcements'} />
      <NavItem icon={<Wrench />} label="Mantenimiento" onClick={() => setCurrentPage('maintenance')} active={currentPage === 'maintenance'} />
      <NavItem icon={<Users />} label="Directorio" onClick={() => setCurrentPage('directory')} active={currentPage === 'directory'} />
      <NavItem icon={<CalendarDays />} label="Calendario" onClick={() => setCurrentPage('calendar')} active={currentPage === 'calendar'} />
    </nav>
  );

  // Un solo elemento de navegación con un ícono y una etiqueta
  const NavItem = ({ icon, label, onClick, active }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
        active ? 'text-blue-400' : 'hover:text-blue-300'
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );

  // Componentes para cada página
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
          {announcements.slice(0, 2).map(announcement => (
            <li key={announcement.id} className="text-sm text-gray-600 border-b pb-2 last:border-b-0">
              <span className="font-medium text-gray-800">{announcement.title}</span> - {announcement.content.substring(0, 50)}...
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  // Un componente de tarjeta para el panel de control
  const DashboardCard = ({ icon, title, onClick }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-lg border border-gray-200"
    >
      <div className="text-blue-500 mb-2">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </button>
  );

  const Announcements = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Anuncios</h2>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Añadir Nuevo Anuncio</h3>
        <form onSubmit={handleAnnouncementFormSubmit} className="space-y-4">
          <div>
            <label htmlFor="announcementTitle" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              id="announcementTitle"
              name="title"
              value={announcementForm.title}
              onChange={handleAnnouncementFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label htmlFor="announcementContent" className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <textarea
              id="announcementContent"
              name="content"
              value={announcementForm.content}
              onChange={handleAnnouncementFormChange}
              rows="4"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200"
          >
            Publicar Anuncio
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {announcements.sort((a,b) => b.date.localeCompare(a.date)).map(announcement => (
          <div key={announcement.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{announcement.title}</h3>
            <p className="text-xs text-gray-500 mb-2">{new Date(announcement.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{announcement.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const Maintenance = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Solicitud de Mantenimiento</h2>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <form onSubmit={handleMaintenanceFormSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={maintenanceForm.name}
              onChange={handleMaintenanceFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-1">Número de Apartamento</label>
            <input
              type="text"
              id="apartment"
              name="apartment"
              value={maintenanceForm.apartment}
              onChange={handleMaintenanceFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label htmlFor="issue" className="block text-sm font-medium text-gray-700 mb-1">Describa el Problema</label>
            <textarea
              id="issue"
              name="issue"
              value={maintenanceForm.issue}
              onChange={handleMaintenanceFormChange}
              rows="4"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200"
          >
            Enviar Solicitud
          </button>
        </form>
      </div>
    </div>
  );

  const Directory = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Directorio de Residentes</h2>
      <p className="text-sm text-gray-500 mb-4">
        (Nota: Esta es una lista estática para un prototipo. En una aplicación real, los residentes tendrían que optar por ser incluidos en la lista.)
      </p>
      <div className="space-y-4">
        {residents.map(resident => (
          <div key={resident.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-1">
              <Building size={20} className="mr-2 text-gray-500" />
              {resident.name} <span className="text-sm font-normal text-gray-500 ml-2">({resident.apartment})</span>
            </h3>
            <div className="text-gray-600 text-sm space-y-1 mt-2">
              <p className="flex items-center"><Mail size={16} className="mr-2 text-gray-400" /> {resident.email}</p>
              <p className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {resident.phone}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Calendar = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendario Comunitario</h2>
      <div className="space-y-4">
        {calendarEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
          <div key={event.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{event.title}</h3>
            <p className="text-sm text-gray-500 flex items-center mb-2">
              <CalendarDays size={16} className="mr-2 text-gray-400" />
              {new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}, {event.time}
            </p>
            <p className="text-sm text-gray-600 flex items-center">
              <MapPin size={16} className="mr-2 text-gray-400" />
              {event.location}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Renderiza la página actual según el estado
  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-gray-700">Cargando...</span>
        </div>
      );
    }
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'announcements':
        return <Announcements />;
      case 'maintenance':
        return <Maintenance />;
      case 'directory':
        return <Directory />;
      case 'calendar':
        return <Calendar />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-800 pb-16">
      {message && <ModalMessage text={message} />}
      <Header title="Portal de Residentes" />
      <div className="p-4 max-w-4xl mx-auto">
        {renderPage()}
      </div>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default App;
