import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, serverTimestamp, orderBy, getDoc, setDoc } from 'firebase/firestore';

// Language content object
const translations = {
  en: {
    appTitle: "Building Manager",
    appSubtitle: "Lightweight app for building management",
    loggedInAs: "Logged in as:",
    announcements: "Announcements",
    pqrs: "PQRs",
    documents: "Documents",
    addAnnouncement: "+ Add New",
    createPQR: "+ Create New",
    uploadDocument: "+ Upload New",
    noAnnouncements: "No announcements yet.",
    noPqrs: "No PQRs submitted yet.",
    noDocuments: "No documents uploaded yet.",
    posted: "Posted:",
    submitted: "Submitted:",
    uploaded: "Uploaded:",
    viewDocument: "View Document",
    openStatus: "Open",
    inProgressStatus: "In Progress",
    closedStatus: "Closed",
    modal: {
      createAnnouncement: "Create New Announcement",
      title: "Title",
      body: "Body",
      announcementPlaceholder: "e.g., Water shut-off notice",
      announcementBodyPlaceholder: "e.g., Please be advised that water will be turned off from...",
      publish: "Publish",
      createPQR: "Create New PQR",
      pqrPlaceholder: "e.g., Noise complaint from unit 10B",
      pqrBodyPlaceholder: "e.g., The residents of unit 10B have been playing loud music...",
      submit: "Submit",
      uploadDocument: "Upload New Document",
      documentName: "Document Name",
      documentNamePlaceholder: "e.g., 2024 Annual Budget",
      documentUrl: "Document URL",
      documentUrlPlaceholder: "e.g., https://example.com/budget.pdf",
      upload: "Upload",
      cancel: "Cancel",
    },
    loading: "Loading...",
    login: {
      title: "Welcome",
      subtitle: "Please log in to continue.",
      emailLabel: "Email",
      passwordLabel: "Password",
      emailPlaceholder: "your-email@example.com",
      passwordPlaceholder: "Enter password",
      loginButton: "Log In",
      logoutButton: "Log Out",
      continueButton: "Continue as Standard User",
      invalidCredentials: "Invalid email or password. Please try again.",
      residentLogin: "Resident Login",
      managerLogin: "Manager Login"
    }
  },
  es: {
    appTitle: "Administrador de Edificio",
    appSubtitle: "Aplicación ligera para la gestión de edificios",
    loggedInAs: "Conectado como:",
    announcements: "Anuncios",
    pqrs: "PQRs",
    documents: "Documentos",
    addAnnouncement: "+ Añadir Nuevo",
    createPQR: "+ Crear Nuevo",
    uploadDocument: "+ Subir Nuevo",
    noAnnouncements: "Aún no hay anuncios.",
    noPqrs: "Aún no se han enviado PQRs.",
    noDocuments: "Aún no se han subido documentos.",
    posted: "Publicado:",
    submitted: "Enviado:",
    uploaded: "Subido:",
    viewDocument: "Ver Documento",
    openStatus: "Abierto",
    inProgressStatus: "En Progreso",
    closedStatus: "Cerrado",
    modal: {
      createAnnouncement: "Crear Nuevo Anuncio",
      title: "Título",
      body: "Cuerpo",
      announcementPlaceholder: "ej., Aviso de corte de agua",
      announcementBodyPlaceholder: "ej., Por favor, tenga en cuenta que el agua se cortará desde...",
      publish: "Publicar",
      createPQR: "Crear Nuevo PQR",
      pqrPlaceholder: "ej., Queja por ruido de la unidad 10B",
      pqrBodyPlaceholder: "ej., Los residentes de la unidad 10B han estado poniendo música alta...",
      submit: "Enviar",
      uploadDocument: "Subir Nuevo Documento",
      documentName: "Nombre del Documento",
      documentNamePlaceholder: "ej., Presupuesto Anual 2024",
      documentUrl: "URL del Documento",
      documentUrlPlaceholder: "ej., https://example.com/presupuesto.pdf",
      upload: "Subir",
      cancel: "Cancelar",
    },
    loading: "Cargando...",
    login: {
      title: "Bienvenido",
      subtitle: "Por favor, inicie sesión para continuar.",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      emailPlaceholder: "su-correo@ejemplo.com",
      passwordPlaceholder: "Introducir la contraseña",
      loginButton: "Iniciar sesión",
      logoutButton: "Cerrar sesión",
      continueButton: "Continuar como usuario estándar",
      invalidCredentials: "Correo electrónico o contraseña incorrectos. Por favor, inténtelo de nuevo.",
      residentLogin: "Iniciar sesión como residente",
      managerLogin: "Iniciar sesión como administrador"
    }
  }
};

// Main App component
const App = () => {
  // State for Firebase services and user data
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState('resident');

  // State for the UI
  const [view, setView] = useState('announcements');
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [pqrs, setPqrs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(null);
  const [language, setLanguage] = useState('en');
  const t = translations[language];

  // Refs for forms to clear inputs
  const announcementTitleRef = useRef(null);
  const announcementBodyRef = useRef(null);
  const pqrTitleRef = useRef(null);
  const pqrBodyRef = useRef(null);
  const documentNameRef = useRef(null);
  const documentUrlRef = useRef(null);

  // Initialize Firebase and set up authentication on component mount
  useEffect(() => {
    const initializeFirebase = async () => {
      let firebaseConfig = null;
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        if (typeof __firebase_config !== 'undefined' && __firebase_config) {
          firebaseConfig = JSON.parse(__firebase_config);
        }

        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
          console.error("Firebase config is missing.");
          setLoading(false);
          return;
        }

        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setFirebaseApp(app);
        setAuth(authInstance);
        setDb(dbInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setUserId(user.uid);
            setIsLoggedIn(true);

            // Fetch user role from Firestore
            const userDocRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              setIsManager(userDocSnap.data().isManager || false);
            } else {
              // Create user document if it doesn't exist (for standard users)
              await setDoc(userDocRef, { isManager: false, email: user.email });
              setIsManager(false);
            }
            
            setIsAuthReady(true);
            setLoading(false);
          } else {
            setUserId(null);
            setIsLoggedIn(false);
            setIsManager(false);
            setIsAuthReady(true);
            setLoading(false);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  // Set up Firestore listeners for real-time updates
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const announcementsPath = `artifacts/${appId}/public/data/announcements`;
    const pqrsPath = `artifacts/${appId}/public/data/pqrs`;
    const documentsPath = `artifacts/${appId}/public/data/documents`;

    try {
      const announcementsQuery = query(collection(db, announcementsPath), orderBy('createdAt', 'desc'));
      const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(data);
      }, (error) => {
        console.error("Error fetching announcements:", error);
      });

      const pqrsQuery = query(collection(db, pqrsPath), orderBy('createdAt', 'desc'));
      const unsubscribePqrs = onSnapshot(pqrsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPqrs(data);
      }, (error) => {
        console.error("Error fetching PQRs:", error);
      });

      const documentsQuery = query(collection(db, documentsPath), orderBy('createdAt', 'desc'));
      const unsubscribeDocuments = onSnapshot(documentsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocuments(data);
      }, (error) => {
        console.error("Error fetching documents:", error);
      });

      return () => {
        unsubscribeAnnouncements();
        unsubscribePqrs();
        unsubscribeDocuments();
      };
    } catch (error) {
      console.error("Error setting up Firestore listeners:", error);
    }
  }, [db, isAuthReady]);

  // Handle adding a new announcement
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!db) return;
    const title = announcementTitleRef.current.value;
    const body = announcementBodyRef.current.value;

    if (title.trim() === '' || body.trim() === '') return;

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const path = `artifacts/${appId}/public/data/announcements`;
      await addDoc(collection(db, path), {
        title,
        body,
        createdAt: serverTimestamp(),
        authorId: userId,
      });
      setShowModal(null);
      announcementTitleRef.current.value = '';
      announcementBodyRef.current.value = '';
    } catch (error) {
      console.error("Error adding announcement:", error);
    }
  };

  // Handle adding a new PQR
  const handleAddPQR = async (e) => {
    e.preventDefault();
    if (!db) return;
    const title = pqrTitleRef.current.value;
    const body = pqrBodyRef.current.value;

    if (title.trim() === '' || body.trim() === '') return;

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const path = `artifacts/${appId}/public/data/pqrs`;
      await addDoc(collection(db, path), {
        title,
        body,
        status: 'Open', // Initial status
        createdAt: serverTimestamp(),
        authorId: userId,
      });
      setShowModal(null);
      pqrTitleRef.current.value = '';
      pqrBodyRef.current.value = '';
    } catch (error) {
      console.error("Error adding PQR:", error);
    }
  };

  // Handle adding a new document
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!db) return;
    const name = documentNameRef.current.value;
    const url = documentUrlRef.current.value;

    if (name.trim() === '' || url.trim() === '') return;

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const path = `artifacts/${appId}/public/data/documents`;
      await addDoc(collection(db, path), {
        name,
        url,
        createdAt: serverTimestamp(),
        authorId: userId,
      });
      setShowModal(null);
      documentNameRef.current.value = '';
      documentUrlRef.current.value = '';
    } catch (error) {
      console.error("Error adding document:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!auth) {
      setLoginError("Authentication service is not ready.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(t.login.invalidCredentials);
    }
  };

  const handleStandardLogin = async () => {
    if (!auth) {
      setLoginError("Authentication service is not ready.");
      return;
    }
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous login failed:", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Modal component for forms
  const Modal = ({ children, title, onClose }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-500 text-lg">{t.loading}</div>
      </div>
    );
  }

  // Render Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
          <div className="flex flex-col items-center mb-4">
            <h1 className="text-2xl font-bold mb-2">{t.login.title}</h1>
            <p className="text-gray-600 mb-6">{t.login.subtitle}</p>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={() => setLoginMode('resident')}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                loginMode === 'resident' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-600'
              }`}
            >
              Resident
            </button>
            <button
              onClick={() => setLoginMode('manager')}
              className={`ml-2 px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                loginMode === 'manager' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-600'
              }`}
            >
              Manager
            </button>
          </div>

          {loginMode === 'manager' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.login.emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.login.emailPlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.login.passwordLabel}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.login.passwordPlaceholder}
                  required
                />
                {loginError && <p className="text-red-500 text-xs mt-2">{loginError}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-purple-700 transition-colors"
              >
                {t.login.loginButton}
              </button>
            </form>
          )}

          {loginMode === 'resident' && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.login.emailLabel}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t.login.emailPlaceholder}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.login.passwordLabel}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t.login.passwordPlaceholder}
                    required
                  />
                  {loginError && <p className="text-red-500 text-xs mt-2">{loginError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t.login.loginButton}
                </button>
              </form>
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              <button
                onClick={handleStandardLogin}
                className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
              >
                {t.login.continueButton}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }


  // Main UI rendering
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header and User Info */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-2xl shadow-sm">
          <div className="flex-1 text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold text-blue-600">{t.appTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">{t.appSubtitle}</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-600">{t.loggedInAs}</p>
            <p className="font-mono text-xs break-all mt-1">{userId}</p>
            <div className="flex justify-center sm:justify-end mt-2">
              <button
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-300 transition-colors"
              >
                {language === 'en' ? 'Español' : 'English'}
              </button>
              <button
                onClick={handleLogout}
                className="ml-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                {t.login.logoutButton}
              </button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 p-2 bg-white rounded-full shadow-sm">
          <button
            onClick={() => setView('announcements')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === 'announcements' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.announcements}
          </button>
          <button
            onClick={() => setView('pqrs')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === 'pqrs' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.pqrs}
          </button>
          <button
            onClick={() => setView('documents')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === 'documents' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.documents}
          </button>
        </nav>

        {/* Content Area */}
        <main className="space-y-6">
          {/* Announcements Tab */}
          {view === 'announcements' && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.announcements}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal('announcement')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t.addAnnouncement}
                  </button>
                )}
              </div>
              <ul className="space-y-4">
                {announcements.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">{t.noAnnouncements}</li>
                ) : (
                  announcements.map((announcement) => (
                    <li key={announcement.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xl font-semibold">{announcement.title}</h3>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{announcement.body}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {t.posted} {announcement.createdAt?.toDate().toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* PQRs Tab */}
          {view === 'pqrs' && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.pqrs}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal('pqr')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t.createPQR}
                  </button>
                )}
              </div>
              <ul className="space-y-4">
                {pqrs.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">{t.noPqrs}</li>
                ) : (
                  pqrs.map((pqr) => (
                    <li key={pqr.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">{pqr.title}</h3>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          pqr.status === 'Open' ? 'bg-red-200 text-red-800' :
                          pqr.status === 'In Progress' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {pqr.status === 'Open' ? t.openStatus : pqr.status === 'In Progress' ? t.inProgressStatus : t.closedStatus}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{pqr.body}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {t.submitted} {pqr.createdAt?.toDate().toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Documents Tab */}
          {view === 'documents' && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.documents}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal('document')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t.uploadDocument}
                  </button>
                )}
              </div>
              <ul className="space-y-4">
                {documents.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">{t.noDocuments}</li>
                ) : (
                  documents.map((doc) => (
                    <li key={doc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {t.uploaded} {doc.createdAt?.toDate().toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-2 sm:mt-0 bg-gray-200 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition-colors inline-block">
                        {t.viewDocument}
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </main>

        {/* Modals for creating new items */}
        {isManager && showModal === 'announcement' && (
          <Modal title={t.modal.createAnnouncement} onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.title}</label>
                <input
                  type="text"
                  ref={announcementTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.announcementPlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.body}</label>
                <textarea
                  ref={announcementBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.announcementBodyPlaceholder}
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.modal.publish}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isManager && showModal === 'pqr' && (
          <Modal title={t.modal.createPQR} onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddPQR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.title}</label>
                <input
                  type="text"
                  ref={pqrTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.pqrPlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.body}</label>
                <textarea
                  ref={pqrBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.pqrBodyPlaceholder}
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.modal.submit}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isManager && showModal === 'document' && (
          <Modal title={t.modal.uploadDocument} onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.documentName}</label>
                <input
                  type="text"
                  ref={documentNameRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.documentNamePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.documentUrl}</label>
                <input
                  type="url"
                  ref={documentUrlRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.documentUrlPlaceholder}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.modal.upload}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default App;
