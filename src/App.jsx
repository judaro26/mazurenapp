import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  addDoc,
  onSnapshot,
  collection,
  query,
  serverTimestamp,
  orderBy,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
// NEW: Import Firebase Storage functions
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// NEW: Import getFunctions and httpsCallable
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * ----------------------------------------------
 * Translations
 * ----------------------------------------------
 */
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
      announcementBodyPlaceholder:
        "e.g., Please be advised that water will be turned off from...",
      publish: "Publish",
      createPQR: "Create New PQR",
      pqrPlaceholder: "e.g., Noise complaint from unit 10B",
      pqrBodyPlaceholder:
        "e.g., The residents of unit 10B have been playing loud music...",
      submit: "Submit",
      uploadDocument: "Upload New Document",
      documentName: "Document Name",
      documentNamePlaceholder: "e.g., 2024 Annual Budget",
      documentUrl: "Document URL",
      documentUrlPlaceholder: "e.g., https://example.com/budget.pdf",
      upload: "Upload",
      cancel: "Cancel",
      image: "Image (optional)",
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
      managerLogin: "Manager Login",
    },
    configMissing: {
      title: "Missing Firebase configuration",
      desc:
        "We couldn't find Firebase config. Provide it via a global __firebase_config object, or REACT_APP_* env vars at build time.",
      how: "How to fix",
      opt1Title: "Option A: Inject __firebase_config",
      opt1Desc:
        "Add a <script> before your bundle that sets window.__firebase_config = {...}.",
      opt2Title: "Option B: Netlify env vars",
      opt2Desc:
        "Set REACT_APP_FIREBASE_* variables in Site settings → Build & deploy → Environment. Then redeploy.",
      required: "Required keys: apiKey, authDomain, projectId, appId",
    },
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
      announcementBodyPlaceholder:
        "ej., Por favor, tenga en cuenta que el agua se cortará desde...",
      publish: "Publicar",
      createPQR: "Crear Nuevo PQR",
      pqrPlaceholder: "ej., Queja por ruido de la unidad 10B",
      pqrBodyPlaceholder:
        "ej., Los residentes de la unidad 10B han estado poniendo música alta...",
      submit: "Enviar",
      uploadDocument: "Subir Nuevo Documento",
      documentName: "Nombre del Documento",
      documentNamePlaceholder: "ej., Presupuesto Anual 2024",
      documentUrl: "URL del Documento",
      documentUrlPlaceholder: "ej., https://example.com/presupuesto.pdf",
      upload: "Subir",
      cancel: "Cancelar",
      image: "Imagen (opcional)",
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
      invalidCredentials:
        "Correo electrónico o contraseña incorrectos. Por favor, inténtelo de nuevo.",
      residentLogin: "Iniciar sesión como residente",
      managerLogin: "Iniciar sesión como administrador",
    },
    configMissing: {
      title: "Falta la configuración de Firebase",
      desc:
        "No encontramos la configuración de Firebase. Proporciónela mediante __firebase_config o variables REACT_APP_* al compilar.",
      how: "Cómo solucionarlo",
      opt1Title: "Opción A: Inyectar __firebase_config",
      opt1Desc:
        "Agregue un <script> antes de su bundle que defina window.__firebase_config = {...}.",
      opt2Title: "Opción B: Variables de entorno en Netlify",
      opt2Desc:
        "Configure las variables REACT_APP_FIREBASE_* en Configuración del sitio → Build & deploy → Environment. Luego vuelva a desplegar.",
      required: "Claves requeridas: apiKey, authDomain, projectId, appId",
    },
  },
};

/**
 * ----------------------------------------------
 * Helpers
 * ----------------------------------------------
 */
function safeJsonParse(value) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

function loadFirebaseConfig() {
  // 1) Prefer a global window.__firebase_config (can be a JSON string or object)
  const globalCfg = typeof window !== "undefined" ? safeJsonParse(window.__firebase_config) : null;
  if (globalCfg && typeof globalCfg === "object") return globalCfg;

  // 2) Fall back to build-time env vars (Vite): import.meta.env
  const cfg = {
    apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_FIREBASE_APP_ID,
  };
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  const hasRequired = required.every((k) => cfg[k]);
  return hasRequired ? cfg : null;
}

function formatTimestamp(ts) {
  // Firestore Timestamp or Date or null
  try {
    const date = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
    if (!date) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * ----------------------------------------------
 * Main App
 * ----------------------------------------------
 */
export default function App() {
  // Language
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const t = translations[language] || translations.en;
  const toggleLanguage = () => {
    const next = language === "en" ? "es" : "en";
    setLanguage(next);
    localStorage.setItem("language", next);
  };

  // Firebase singleton init (memoized)
  const firebaseConfig = useMemo(loadFirebaseConfig, []);
  const [configError, setConfigError] = useState(!firebaseConfig);

  const appId = useMemo(() => {
    const candidate =
      (typeof window !== "undefined" && window.__app_id) ||
      import.meta.env.VITE_APP_APP_ID ||
      "default-app-id";
    return String(candidate);
  }, []);

  const [app, setApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [storage, setStorage] = useState(null);

  const [userIdentifier, setUserIdentifier] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // UI State
  const [view, setView] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [pqrs, setPqrs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(null);

  // NEW: Add state for image upload
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Login form
  const [loginMode, setLoginMode] = useState("resident");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Refs
  const announcementTitleRef = useRef(null);
  const announcementBodyRef = useRef(null);
  const pqrTitleRef = useRef(null);
  const pqrBodyRef = useRef(null);
  const documentNameRef = useRef(null);
  const documentUrlRef = useRef(null);

  /**
   * Init Firebase (once)
   */
  useEffect(() => {
    (async () => {
      try {
        if (!firebaseConfig) {
          setConfigError(true);
          setLoading(false);
          return;
        }
        const appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const authInstance = getAuth(appInstance);
        const dbInstance = getFirestore(appInstance);
        const storageInstance = getStorage(appInstance);
        setApp(appInstance);
        setAuth(authInstance);
        setDb(dbInstance);
        setStorage(storageInstance);
        
        const unsub = onAuthStateChanged(authInstance, async (user) => {
          try {
            if (user) {
              const idTokenResult = await user.getIdTokenResult(true);
              const isManagerClaim = idTokenResult.claims.isManager || false;

              setIsManager(isManagerClaim);
              setUserIdentifier(user.email || user.uid);
              setIsLoggedIn(true);

              const userDocRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, user.uid);
              const snap = await getDoc(userDocRef);
              if (!snap.exists()) {
                await setDoc(userDocRef, { isManager: false, email: user.email || "anonymous" });
              }

              setIsAuthReady(true);
              setLoading(false);
            } else {
              setUserIdentifier(null);
              setIsLoggedIn(false);
              setIsManager(false);
              setIsAuthReady(true);
              setLoading(false);
            }
          } catch (err) {
            console.error("Auth state change error:", err);
            setErrorMsg("Failed to load user profile.");
            setLoading(false);
          }
        });

        return () => unsub();
      } catch (err) {
        console.error("Error initializing Firebase:", err);
        setErrorMsg("Failed to initialize Firebase.");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Live queries
   */
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const announcementsPath = `artifacts/${appId}/public/data/announcements`;
    const pqrsPath = `artifacts/${appId}/public/data/pqrs`;
    const documentsPath = `artifacts/${appId}/public/data/documents`;

    let unsubAnnouncements = () => {};
    let unsubPqrs = () => {};
    let unsubDocs = () => {};
    try {
      unsubAnnouncements = onSnapshot(
        query(collection(db, announcementsPath), orderBy("createdAt", "desc")),
        (snap) => {
          setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => console.error("Announcements listener error:", err)
      );

      unsubPqrs = onSnapshot(
        query(collection(db, pqrsPath), orderBy("createdAt", "desc")),
        (snap) => setPqrs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error("PQRs listener error:", err)
      );

      unsubDocs = onSnapshot(
        query(collection(db, documentsPath), orderBy("createdAt", "desc")),
        (snap) => setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error("Documents listener error:", err)
      );
    } catch (err) {
      console.error("Error setting up Firestore listeners:", err);
    }

    return () => {
      unsubAnnouncements();
      unsubPqrs();
      unsubDocs();
    };
  }, [db, isAuthReady, appId]);

  /**
   * Actions
   */
  // NEW: Updated handleAddAnnouncement to handle image uploads
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!db || !storage) return;
    const title = announcementTitleRef.current?.value?.trim();
    const body = announcementBodyRef.current?.value?.trim();
    if (!title || !body) return;

    setUploading(true);
    let imageUrl = null;

    try {
      // If an image file is selected, upload it to Firebase Storage
      if (imageFile) {
        const storagePath = `announcements/${userIdentifier}-${Date.now()}-${imageFile.name}`;
        const imageRef = ref(storage, storagePath);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const path = `artifacts/${appId}/public/data/announcements`;
      await addDoc(collection(db, path), {
        title,
        body,
        // NEW: Conditionally add imageUrl
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        authorId: userIdentifier,
      });
      setShowModal(null);
      if (announcementTitleRef.current) announcementTitleRef.current.value = "";
      if (announcementBodyRef.current) announcementBodyRef.current.value = "";
      setImageFile(null);
    } catch (err) {
      console.error("Error adding announcement:", err);
      setErrorMsg("Couldn't add announcement.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddPQR = async (e) => {
    e.preventDefault();
    if (!db) return;
    const title = pqrTitleRef.current?.value?.trim();
    const body = pqrBodyRef.current?.value?.trim();
    if (!title || !body) return;

    try {
      const path = `artifacts/${appId}/public/data/pqrs`;
      await addDoc(collection(db, path), {
        title,
        body,
        status: "Open",
        createdAt: serverTimestamp(),
        authorId: userIdentifier,
      });
      setShowModal(null);
      if (pqrTitleRef.current) pqrTitleRef.current.value = "";
      if (pqrBodyRef.current) pqrBodyRef.current.value = "";
    } catch (err) {
      console.error("Error adding PQR:", err);
      setErrorMsg("Couldn't add PQR.");
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!db) return;
    const name = documentNameRef.current?.value?.trim();
    const url = documentUrlRef.current?.value?.trim();
    if (!name || !url) return;

    // Basic URL validation
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      setErrorMsg("Please provide a valid URL.");
      return;
    }

    try {
      const path = `artifacts/${appId}/public/data/documents`;
      await addDoc(collection(db, path), {
        name,
        url,
        createdAt: serverTimestamp(),
        authorId: userIdentifier,
      });
      setShowModal(null);
      if (documentNameRef.current) documentNameRef.current.value = "";
      if (documentUrlRef.current) documentUrlRef.current.value = "";
    } catch (err) {
      console.error("Error adding document:", err);
      setErrorMsg("Couldn't add document.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!auth) {
      setLoginError("Authentication service is not ready.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError(t.login.invalidCredentials);
    }
  };

  const handleStandardLogin = async () => {
    setLoginError("");
    if (!auth) {
      setLoginError("Authentication service is not ready.");
      return;
    }
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous login failed:", err);
      setLoginError("Anonymous login failed.");
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const updatePqrStatus = async (pqrId, nextStatus) => {
    if (!db) return;
    try {
      const pqrDoc = doc(db, `artifacts/${appId}/public/data/pqrs`, pqrId);
      await updateDoc(pqrDoc, { status: nextStatus });
    } catch (err) {
      console.error("Failed to update PQR status:", err);
      setErrorMsg("Couldn't update status.");
    }
  };
  
  // NEW: Temporary function to set manager role
  const setManagerRole = async () => {
    const functions = getFunctions(app);
    const setRole = httpsCallable(functions, 'setManagerRole');
    try {
      const result = await setRole({ email: 'your-manager-email@example.com', isManager: true });
      console.log("Successfully set manager role:", result.data.result);
      window.location.reload();
    } catch (error) {
      console.error("Error setting manager role:", error.message);
    }
  };

  /**
   * Modal
   */
  const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  /**
   * Early error: missing config
   */
  if (configError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-xl bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-bold mb-2">{t.configMissing.title}</h2>
          <p className="text-gray-600 mb-4">{t.configMissing.desc}</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <span className="font-semibold">{t.configMissing.opt1Title}:</span> {t.configMissing.opt1Desc}
            </li>
            <li>
              <span className="font-semibold">{t.configMissing.opt2Title}:</span> {t.configMissing.opt2Desc}
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">{t.configMissing.required}</p>
        </div>
      </div>
    );
  }

  /**
   * Global loading
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-pulse text-gray-500 text-lg">{t.loading}</div>
      </div>
    );
  }

  /**
   * Not logged in → Auth screens
   */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
          <div className="flex flex-col items-center mb-4">
            <h1 className="text-2xl font-bold mb-2">{t.login.title}</h1>
            <p className="text-gray-600 mb-6">{t.login.subtitle}</p>
          </div>

          <div className="flex justify-center mb-6" role="tablist" aria-label="Login mode">
            <button
              onClick={() => {
                setLoginMode("resident");
                setLoginError("");
                setEmail("");
                setPassword("");
              }}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                loginMode === "resident" ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-600"
              }`}
              role="tab"
              aria-selected={loginMode === "resident"}
            >
              Resident
            </button>
            <button
              onClick={() => {
                setLoginMode("manager");
                setLoginError("");
                setEmail("");
                setPassword("");
              }}
              className={`ml-2 px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                loginMode === "manager" ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-600"
              }`}
              role="tab"
              aria-selected={loginMode === "manager"}
            >
              Manager
            </button>
          </div>

          {loginMode === "manager" && (
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
                  autoComplete="username"
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
                  autoComplete="current-password"
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

          {loginMode === "resident" && (
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
                    autoComplete="username"
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
                    autoComplete="current-password"
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
                <div className="flex-grow border-t border-gray-300" />
                <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
                <div className="flex-grow border-t border-gray-300" />
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

  /**
   * Main UI
   */
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-2xl shadow-sm">
          <div className="flex-1 text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold text-blue-600">{t.appTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">{t.appSubtitle}</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-600">{t.loggedInAs}</p>
            <p className="font-mono text-xs break-all mt-1">{userIdentifier}</p>
            <div className="flex justify-center sm:justify-end mt-2">
              {/* NEW: Temporary button for manager role setting */}
              <button
                onClick={setManagerRole}
                className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                Set Manager
              </button>
              <button
                onClick={toggleLanguage}
                className="ml-2 bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-300 transition-colors"
              >
                {language === "en" ? "Español" : "English"}
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

        {/* Nav */}
        <nav className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 p-2 bg-white rounded-full shadow-sm">
          <button
            onClick={() => setView("announcements")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === "announcements" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.announcements}
          </button>
          <button
            onClick={() => setView("pqrs")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === "pqrs" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.pqrs}
          </button>
          <button
            onClick={() => setView("documents")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === "documents" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.documents}
          </button>
        </nav>

        {/* Content */}
        <main className="space-y-6">
          {/* Announcements */}
          {view === "announcements" && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.announcements}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal("announcement")}
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
                  announcements.map((a) => (
                    <li key={a.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xl font-semibold">{a.title}</h3>
                      {/* NEW: Conditionally display image */}
                      {a.imageUrl && (
                        <div className="mt-4 overflow-hidden rounded-lg">
                          <img src={a.imageUrl} alt={a.title} className="w-full object-cover" />
                        </div>
                      )}
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{a.body}</p>
                      {a.createdAt && (
                        <p className="text-sm text-gray-400 mt-2">
                          {t.posted} {formatTimestamp(a.createdAt)}
                        </p>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* PQRs */}
          {view === "pqrs" && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.pqrs}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal("pqr")}
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
                  pqrs.map((p) => (
                    <li key={p.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="text-xl font-semibold">{p.title}</h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full ${
                              p.status === "Open"
                                ? "bg-red-200 text-red-800"
                                : p.status === "In Progress"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-green-200 text-green-800"
                            }`}
                          >
                            {p.status === "Open"
                              ? t.openStatus
                              : p.status === "In Progress"
                              ? t.inProgressStatus
                              : t.closedStatus}
                          </span>
                          {isManager && (
                            <select
                              className="border border-gray-300 rounded-full text-xs px-2 py-1"
                              value={p.status}
                              onChange={(e) => updatePqrStatus(p.id, e.target.value)}
                            >
                              <option value="Open">{t.openStatus}</option>
                              <option value="In Progress">{t.inProgressStatus}</option>
                              <option value="Closed">{t.closedStatus}</option>
                            </select>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{p.body}</p>
                      {p.createdAt && (
                        <p className="text-sm text-gray-400 mt-2">
                          {t.submitted} {formatTimestamp(p.createdAt)}
                        </p>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Documents */}
          {view === "documents" && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.documents}</h2>
                {isManager && (
                  <button
                    onClick={() => setShowModal("document")}
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
                  documents.map((d) => (
                    <li
                      key={d.id}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center"
                    >
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{d.name}</h3>
                        {d.createdAt && (
                          <p className="text-sm text-gray-400 mt-1">
                            {t.uploaded} {formatTimestamp(d.createdAt)}
                          </p>
                        )}
                      </div>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 sm:mt-0 bg-gray-200 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition-colors inline-block"
                      >
                        {t.viewDocument}
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </main>

        {/* Global errors */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errorMsg}</div>
        )}

        {/* Modals */}
        {isManager && showModal === "announcement" && (
          <Modal title={t.modal.createAnnouncement} onClose={() => { setShowModal(null); setImageFile(null); }}>
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
                />
              </div>
              {/* NEW: Add image file input */}
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.image}</label>
                <input
                  type="file"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(null); setImageFile(null); }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? t.loading : t.modal.publish}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isManager && showModal === "pqr" && (
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
                />
              </div>
              <div className="flex justify-end gap-2">
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

        {isManager && showModal === "document" && (
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
              <div className="flex justify-end gap-2">
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
}
