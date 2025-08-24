import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
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
  deleteDoc,
  where,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
    privateDocs: "My Private Files",
    addAnnouncement: "+ Add New",
    createPQR: "+ Create New",
    uploadDocument: "+ Upload New",
    uploadPrivateDoc: "+ Upload Private File",
    noAnnouncements: "No announcements yet.",
    noPqrs: "No PQRs submitted yet.",
    noDocuments: "No documents uploaded yet.",
    noPrivateDocs: "You have no private files.",
    posted: "Posted:",
    submitted: "Submitted:",
    uploaded: "Subido:",
    viewDocument: "View Document",
    openStatus: "Open",
    inProgressStatus: "In Progress",
    closedStatus: "Closed",
    modal: {
      createAnnouncement: "Create New Announcement",
      editAnnouncement: "Edit Announcement",
      createPQR: "Create New PQR",
      editPQR: "Edit PQR",
      uploadDocument: "Upload New Document",
      editDocument: "Edit Document",
      uploadPrivate: "Upload Private File",
      title: "Title",
      body: "Body",
      name: "Name",
      namePlaceholder: "e.g., John Doe",
      apartment: "Apartment No.",
      apartmentPlaceholder: "e.g., 101B",
      phone: "Phone Number",
      phonePlaceholder: "e.g., 555-123-4567",
      announcementPlaceholder: "e.g., Water shut-off notice",
      announcementBodyPlaceholder:
        "e.g., Please be advised that water will be turned off from...",
      publish: "Publish",
      update: "Update",
      pqrPlaceholder: "e.g., Noise complaint from unit 10B",
      pqrBodyPlaceholder:
        "e.g., The residents of unit 10B have been playing loud music...",
      submit: "Submit",
      documentName: "Document Name",
      documentNamePlaceholder: "e.g., 2024 Annual Budget",
      documentUrl: "Document URL",
      documentUrlPlaceholder: "e.g., https://example.com/budget.pdf",
      upload: "Upload",
      cancel: "Cancel",
      image: "Image (optional)",
      file: "File (optional)",
      selectResident: "Select Resident",
      folderPath: "Folder/File Directory (optional)",
      folderPathPlaceholder: "e.g., financials/2024_reports"
    },
    loading: "Loading...",
    login: {
      title: "Welcome",
      subtitle: "Please log in to continue.",
      registerTitle: "Register a New Account",
      registerSubtitle: "Please fill out your details to create an account.",
      emailLabel: "Email",
      passwordLabel: "Password",
      emailPlaceholder: "your-email@example.com",
      passwordPlaceholder: "Enter password",
      loginButton: "Log In",
      logoutButton: "Log Out",
      continueButton: "Continue as Standard User",
      registerButton: "Register Account",
      backToLogin: "Back to Login",
      invalidCredentials: "Invalid email or password. Please try again.",
      residentLogin: "Resident Login",
      managerLogin: "Manager Login",
      roleManager: "Manager",
      roleResident: "Resident",
      roleAnonymous: "Anonymous User"
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
    privateDocs: "Mis Archivos Privados",
    addAnnouncement: "+ Añadir Nuevo",
    createPQR: "+ Crear Nuevo",
    uploadDocument: "+ Subir Nuevo",
    uploadPrivateDoc: "+ Subir Archivo Privado",
    noAnnouncements: "Aún no hay anuncios.",
    noPqrs: "Aún no se han enviado PQRs.",
    noDocuments: "Aún no se han subido documentos.",
    noPrivateDocs: "No tiene archivos privados.",
    posted: "Publicado:",
    submitted: "Enviado:",
    uploaded: "Subido:",
    viewDocument: "Ver Documento",
    openStatus: "Abierto",
    inProgressStatus: "En Progreso",
    closedStatus: "Cerrado",
    modal: {
      createAnnouncement: "Crear Nuevo Anuncio",
      editAnnouncement: "Editar Anuncio",
      createPQR: "Crear Nuevo PQR",
      editPQR: "Editar PQR",
      uploadDocument: "Subir Nuevo Documento",
      editDocument: "Editar Documento",
      uploadPrivate: "Subir Archivo Privado",
      title: "Título",
      body: "Cuerpo",
      name: "Nombre",
      namePlaceholder: "ej., John Doe",
      apartment: "Número de apartamento",
      apartmentPlaceholder: "ej., 101B",
      phone: "Número de teléfono",
      phonePlaceholder: "ej., 555-123-4567",
      announcementPlaceholder: "ej., Aviso de corte de agua",
      announcementBodyPlaceholder:
        "ej., Por favor, tenga en cuenta que el agua se cortará desde...",
      publish: "Publicar",
      update: "Actualizar",
      pqrPlaceholder: "ej., Queja por ruido de la unidad 10B",
      pqrBodyPlaceholder:
        "ej., Los residentes de la unidad 10B han estado poniendo música alta...",
      submit: "Enviar",
      documentName: "Nombre del Documento",
      documentNamePlaceholder: "ej., Presupuesto Anual 2024",
      documentUrl: "URL del Documento",
      documentUrlPlaceholder: "ej., https://example.com/presupuesto.pdf",
      upload: "Subir",
      cancel: "Cancelar",
      image: "Imagen (opcional)",
      file: "Archivo (opcional)",
      selectResident: "Seleccionar Residente",
      folderPath: "Directorio de Carpeta/Archivo (opcional)",
      folderPathPlaceholder: "ej., finanzas/informes_2024"
    },
    loading: "Cargando...",
    login: {
      title: "Bienvenido",
      subtitle: "Por favor, inicie sesión para continuar.",
      registerTitle: "Registrar una nueva cuenta",
      registerSubtitle: "Por favor, complete sus datos para crear una cuenta.",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      emailPlaceholder: "su-correo@ejemplo.com",
      passwordPlaceholder: "Introducir la contraseña",
      loginButton: "Iniciar sesión",
      logoutButton: "Cerrar sesión",
      continueButton: "Continuar como usuario estándar",
      registerButton: "Registrar Cuenta",
      backToLogin: "Volver a Iniciar sesión",
      invalidCredentials:
        "Correo electrónico o contraseña incorrectos. Por favor, inténtelo de nuevo.",
      residentLogin: "Iniciar sesión como residente",
      managerLogin: "Iniciar sesión como administrador",
      roleManager: "Administrador",
      roleResident: "Residente",
      roleAnonymous: "Usuario anónimo"
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
        "Configure las variables REACT_APP_FIREBASE_* en Site settings → Build & deploy → Environment. Luego vuelva a desplegar.",
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
    storageBucket: 'portalmalaga25.appspot.com',
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
  const [userRole, setUserRole] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userApartment, setUserApartment] = useState(null);
  const [residents, setResidents] = useState([]);
  const [privateDocuments, setPrivateDocuments] = useState([]);
  const privateFilesRef = useRef(null);
  const privateFolderNameRef = useRef(null);
  const [selectedResidentUid, setSelectedResidentUid] = useState("");
  // CHANGED: Use a state variable for file selection in the modal
  const [selectedPrivateFiles, setSelectedPrivateFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [view, setView] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [pqrs, setPqrs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pqrFile, setPqrFile] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerApartment, setRegisterApartment] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const announcementTitleRef = useRef(null);
  const announcementBodyRef = useRef(null);
  const pqrNameRef = useRef(null);
  const pqrApartmentRef = useRef(null);
  const pqrTitleRef = useRef(null);
  const pqrBodyRef = useRef(null);
  const documentNameRef = useRef(null);
  const documentUrlRef = useRef(null);

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
              setUserIdentifier(user.uid);
              setIsLoggedIn(true);
              setUserEmail(user.email || null);
              
              if (user.isAnonymous) {
                setIsManager(false);
                setUserRole("anonymous");
                setUserApartment(null);
              } else {
                const userDocRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, user.uid);
                const snap = await getDoc(userDocRef);
                if (snap.exists()) {
                  const userData = snap.data();
                  const isManagerStatus = Boolean(userData?.isManager);
                  setIsManager(isManagerStatus);
                  setUserRole(isManagerStatus ? "manager" : "resident");
                  setUserApartment(userData.apartment || null);
                } else {
                  await setDoc(userDocRef, { 
                    isManager: false, 
                    email: user.email || null,
                    name: null,
                    apartment: null,
                    phone: null
                  });
                  setIsManager(false);
                  setUserRole("resident");
                  setUserApartment(null);
                }
              }

              setIsAuthReady(true);
              setLoading(false);
            } else {
              setUserIdentifier(null);
              setIsLoggedIn(false);
              setIsManager(false);
              setUserRole(null);
              setUserEmail(null);
              setUserApartment(null);
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

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const announcementsPath = `artifacts/${appId}/public/data/announcements`;
    const pqrsPath = `artifacts/${appId}/public/data/pqrs`;
    const documentsPath = `artifacts/${appId}/public/data/documents`;
    const usersPath = `artifacts/${appId}/public/data/users`;

    let unsubAnnouncements = () => {};
    let unsubPqrs = () => {};
    let unsubDocs = () => {};
    let unsubPrivateDocs = () => {};
    let unsubResidents = () => {};

    try {
      unsubAnnouncements = onSnapshot(
        query(collection(db, announcementsPath), orderBy("createdAt", "desc")),
        (snap) => {
          setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => console.error("Announcements listener error:", err)
      );

      if (isManager) {
        unsubPqrs = onSnapshot(
          query(collection(db, pqrsPath), orderBy("createdAt", "desc")),
          (snap) => setPqrs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => console.error("PQRs listener error:", err)
        );
      } else if (auth?.currentUser?.uid) {
        unsubPqrs = onSnapshot(
          query(collection(db, pqrsPath), where("authorId", "==", auth.currentUser.uid), orderBy("createdAt", "desc")),
          (snap) => setPqrs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => console.error("PQRs listener error:", err)
        );
      } else {
        setPqrs([]);
      }
      
      unsubDocs = onSnapshot(
        query(collection(db, documentsPath), orderBy("createdAt", "desc")),
        (snap) => setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error("Documents listener error:", err)
      );

      if (userRole === "resident" && auth?.currentUser?.uid) {
        const privateDocsPath = `${usersPath}/${auth.currentUser.uid}/privateDocuments`;
        unsubPrivateDocs = onSnapshot(
          query(collection(db, privateDocsPath), orderBy("createdAt", "desc")),
          (snap) => setPrivateDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => console.error("Private Documents listener error:", err)
        );
      } else {
        setPrivateDocuments([]);
      }

      if (isManager) {
        unsubResidents = onSnapshot(
          query(collection(db, usersPath), where("isManager", "==", false)),
          (snap) => {
            const residentsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setResidents(residentsList);
            if (residentsList.length > 0) {
              setSelectedResidentUid(residentsList[0].id);
            }
          },
          (err) => console.error("Residents list listener error:", err)
        );
      } else {
        setResidents([]);
      }

    } catch (err) {
      console.error("Error setting up Firestore listeners:", err);
    }

    return () => {
      unsubAnnouncements();
      unsubPqrs();
      unsubDocs();
      unsubPrivateDocs();
      unsubResidents();
    };
  }, [db, isAuthReady, appId, isLoggedIn, isManager, auth, userRole]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");
    if (!auth || !db) {
      setRegisterError("Authentication or database service is not ready.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const user = userCredential.user;
      
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
      await setDoc(userDocRef, {
        isManager: false,
        email: user.email,
        name: registerName,
        apartment: registerApartment,
        phone: registerPhone,
      });

      setShowRegisterForm(false);
      await signInWithEmailAndPassword(auth, registerEmail, registerPassword);
    } catch (err) {
      console.error("Registration failed:", err);
      setRegisterError(err.message);
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!db || !storage || !auth?.currentUser?.uid) return;
    const title = announcementTitleRef.current?.value?.trim();
    const body = announcementBodyRef.current?.value?.trim();
    if (!title || !body) return;

    setUploading(true);
    let imageUrls = [];

    try {
      for (const file of imageFiles) {
        const storagePath = `announcements/${auth.currentUser.uid}-${Date.now()}-${file.name}`;
        const imageRef = ref(storage, storagePath);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      const path = `artifacts/${appId}/public/data/announcements`;
      await addDoc(collection(db, path), {
        title,
        body,
        imageUrls: imageUrls,
        createdAt: serverTimestamp(),
        authorId: auth.currentUser.uid,
      });
      setShowModal(null);
      if (announcementTitleRef.current) announcementTitleRef.current.value = "";
      if (announcementBodyRef.current) announcementBodyRef.current.value = "";
      setImageFiles([]);
    } catch (err) {
      console.error("Error adding announcement:", err);
      setErrorMsg("Couldn't add announcement.");
    } finally {
      setUploading(false);
    }
  };
  
  const handleUploadPrivateFiles = async (e) => {
    e.preventDefault();
    
    // CHANGED: Use the state variable for validation
    const files = selectedPrivateFiles;

    if (!db || !storage || !selectedResidentUid || files.length === 0) {
      setErrorMsg("Please select a resident and at least one file.");
      return;
    }

    setUploading(true);
    const folderPath = privateFolderNameRef.current?.value?.trim() || "general";
    const privateDocsCollection = collection(db, `artifacts/${appId}/public/data/users/${selectedResidentUid}/privateDocuments`);
    
    try {
      for (const file of files) { // CHANGED: Use the state variable here too
        const fileRef = ref(storage, `private_files/${selectedResidentUid}/${folderPath}/${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);

        await addDoc(privateDocsCollection, {
          fileName: file.name,
          folder: folderPath,
          url: fileUrl,
          uploadedBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(null);
      setSelectedPrivateFiles([]); // CHANGED: Reset state on close
      if (privateFolderNameRef.current) privateFolderNameRef.current.value = "";
    } catch (err) {
      console.error("Error uploading private file:", err);
      setErrorMsg("Failed to upload private file.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!db || !editingItem || !editingCollection) return;
    
    let updatedData = {};
    let path;

    switch (editingCollection) {
      case 'announcements':
        path = `artifacts/${appId}/public/data/announcements`;
        updatedData = {
          title: announcementTitleRef.current?.value,
          body: announcementBodyRef.current?.value,
        };
        break;
      case 'pqrs':
        path = `artifacts/${appId}/public/data/pqrs`;
        updatedData = {
          name: pqrNameRef.current?.value,
          apartment: pqrApartmentRef.current?.value,
          title: pqrTitleRef.current?.value,
          body: pqrBodyRef.current?.value,
        };
        break;
      case 'documents':
        path = `artifacts/${appId}/public/data/documents`;
        updatedData = {
          name: documentNameRef.current?.value,
          url: documentUrlRef.current?.value,
        };
        break;
      default:
        return;
    }

    try {
      const docRef = doc(db, path, editingItem.id);
      await updateDoc(docRef, updatedData);
      setEditingItem(null);
      setEditingCollection(null);
      setShowModal(null);
    } catch (err) {
      console.error("Error updating document:", err);
      setErrorMsg("Couldn't update item.");
    }
  };

  const handleAddPQR = async (e) => {
    e.preventDefault();
    if (!db || !storage || !auth?.currentUser?.uid) return;

    const name = pqrNameRef.current?.value?.trim();
    const apartment = pqrApartmentRef.current?.value?.trim();
    const title = pqrTitleRef.current?.value?.trim();
    const body = pqrBodyRef.current?.value?.trim();
    if (!title || !body || !name || !apartment) return;

    setUploading(true);
    let fileUrl = null;

    try {
      if (pqrFile) {
        const storagePath = `pqrs/${auth.currentUser.uid}-${Date.now()}-${pqrFile.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, pqrFile);
        fileUrl = await getDownloadURL(fileRef);
      }

      const path = `artifacts/${appId}/public/data/pqrs`;
      await addDoc(collection(db, path), {
        name,
        apartment,
        title,
        body,
        fileUrl: fileUrl,
        status: "Open",
        createdAt: serverTimestamp(),
        authorId: auth.currentUser.uid,
      });
      setShowModal(null);
      if (pqrNameRef.current) pqrNameRef.current.value = "";
      if (pqrApartmentRef.current) pqrApartmentRef.current.value = "";
      if (pqrTitleRef.current) pqrTitleRef.current.value = "";
      if (pqrBodyRef.current) pqrBodyRef.current.value = "";
      setPqrFile(null);
    } catch (err) {
      console.error("Error adding PQR:", err);
      setErrorMsg("Couldn't add PQR.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!db || !auth?.currentUser?.uid) return;
    const name = documentNameRef.current?.value?.trim();
    const url = documentUrlRef.current?.value?.trim();
    if (!name || !url) return;

    try {
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
        authorId: auth.currentUser.uid,
      });
      setShowModal(null);
      if (documentNameRef.current) documentNameRef.current.value = "";
      if (documentUrlRef.current) documentUrlRef.current.value = "";
    } catch (err) {
      console.error("Error adding document:", err);
      setErrorMsg("Couldn't add document.");
    }
  };

  const handleDelete = async (collectionName, docId) => {
    if (!db) return;
    const isConfirmed = window.confirm("Are you sure you want to delete this item?");
    if (!isConfirmed) return;

    try {
      const path = `artifacts/${appId}/public/data/${collectionName}`;
      const docRef = doc(db, path, docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`Error deleting ${collectionName}:`, err);
      setErrorMsg(`Couldn't delete ${collectionName}.`);
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
      setView("announcements");
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
    if (showRegisterForm) {
      return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
            <h1 className="text-2xl font-bold mb-2">{t.login.registerTitle}</h1>
            <p className="text-gray-600 mb-6">{t.login.registerSubtitle}</p>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.name}</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.namePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.apartment}</label>
                <input
                  type="text"
                  value={registerApartment}
                  onChange={(e) => setRegisterApartment(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.apartmentPlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.phone}</label>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.phonePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.login.emailLabel}</label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.login.emailPlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.login.passwordLabel}</label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.login.passwordPlaceholder}
                  required
                />
              </div>
              {registerError && <p className="text-red-500 text-xs mt-2">{registerError}</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
              >
                {t.login.registerButton}
              </button>
            </form>
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-300" />
              <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
              <div className="flex-grow border-t border-gray-300" />
            </div>
            <button
              onClick={() => setShowRegisterForm(false)}
              className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
            >
              {t.login.backToLogin}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
          <div className="flex flex-col items-center mb-4">
            <h1 className="text-2xl font-bold mb-2">{t.login.title}</h1>
            <p className="text-gray-600 mb-6">{t.login.subtitle}</p>
          </div>

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
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-300" />
            <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
            <div className="flex-grow border-t border-gray-300" />
          </div>
          <button
            onClick={() => setShowRegisterForm(true)}
            className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
          >
            {t.login.registerButton}
          </button>
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
            {isLoggedIn && (
              <>
                {userEmail && <p className="font-mono text-xs break-all mt-1">{userEmail}</p>}
                {userApartment && userRole === "resident" && <p className="text-sm text-gray-600 mt-1">Apt: {userApartment}</p>}
                {userRole && (
                  <p className="font-semibold text-xs mt-1">
                    {userRole === "manager" ? t.login.roleManager : userRole === "resident" ? t.login.roleResident : t.login.roleAnonymous}
                  </p>
                )}
              </>
            )}
            <div className="flex justify-center sm:justify-end mt-2">
              <button
                onClick={toggleLanguage}
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-300 transition-colors"
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
          {isLoggedIn && userRole !== "anonymous" && (
            <>
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
              {isManager ? (
                <button
                  onClick={() => setView("private_docs_manager")}
                  className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
                    view === "private_docs_manager" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.privateDocs}
                </button>
              ) : (
                <button
                  onClick={() => setView("private_docs_resident")}
                  className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
                    view === "private_docs_resident" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.privateDocs}
                </button>
              )}
            </>
          )}
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
                    onClick={() => {
                      setEditingItem(null);
                      setShowModal("announcement");
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t.addAnnouncement}
                  </button>
                )}
              </div>
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {announcements.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4 col-span-full">{t.noAnnouncements}</li>
                ) : (
                  announcements.map((a) => (
                    <li key={a.id} className="bg-gray-50 rounded-2xl border border-gray-200 relative overflow-hidden flex flex-col h-full">
                      {isManager && (
                        <div className="absolute top-2 right-2 flex space-x-2 z-10">
                          <button
                            onClick={() => {
                              setEditingItem(a);
                              setEditingCollection('announcements');
                              setShowModal("announcement");
                            }}
                            className="bg-white p-2 rounded-full text-gray-400 hover:text-blue-600 shadow-md"
                            aria-label="Edit announcement"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete('announcements', a.id)} 
                            className="bg-white p-2 rounded-full text-gray-400 hover:text-red-600 shadow-md"
                            aria-label="Delete announcement"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      )}
                      {a.imageUrls && a.imageUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 p-2">
                          {a.imageUrls.map((url, index) => (
                            <div key={index} className="w-full h-24 overflow-hidden rounded-lg">
                              <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-xl font-semibold mb-2">{a.title}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap flex-1">{a.body}</p>
                        {a.createdAt && (
                          <p className="text-sm text-gray-400 mt-4">
                            {t.posted} {formatTimestamp(a.createdAt)}
                          </p>
                        )}
                      </div>
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
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowModal("pqr");
                    }}
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
                    <li key={p.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                      {(isManager || (auth?.currentUser?.uid === p.authorId)) && (
                        <div className="absolute top-2 right-2 flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingItem(p);
                              setEditingCollection('pqrs');
                              setShowModal("pqr");
                            }}
                            className="text-gray-400 hover:text-blue-600"
                            aria-label="Edit PQR"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          {isManager && (
                            <button 
                              onClick={() => handleDelete('pqrs', p.id)} 
                              className="text-gray-400 hover:text-red-600"
                              aria-label="Delete PQR"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
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
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted by: {p.name} ({p.apartment})
                      </p>
                      {p.createdAt && (
                        <p className="text-sm text-gray-400 mt-2">
                          {t.submitted} {formatTimestamp(p.createdAt)}
                        </p>
                      )}
                      {p.fileUrl && (
                        <a 
                          href={p.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mt-2 text-sm text-blue-600 hover:underline inline-block"
                        >
                          View Attachment
                        </a>
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
                    onClick={() => {
                      setEditingItem(null);
                      setShowModal("document");
                    }}
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
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center relative"
                    >
                      {isManager && (
                        <div className="absolute top-2 right-2 flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingItem(d);
                              setEditingCollection('documents');
                              setShowModal("document");
                            }}
                            className="text-gray-400 hover:text-blue-600"
                            aria-label="Edit document"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete('documents', d.id)}
                            className="text-gray-400 hover:text-red-600"
                            aria-label="Delete document"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      )}
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
          
          {/* Private Documents Section for Manager */}
          {view === "private_docs_manager" && isManager && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t.privateDocs}</h2>
                <button
                  onClick={() => setShowModal("upload_private_doc")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.uploadPrivateDoc}
                </button>
              </div>
              <p className="text-gray-500 italic">This is the manager's view of private file uploads.</p>
            </div>
          )}

          {/* Private Documents Section for Resident */}
          {view === "private_docs_resident" && userRole === "resident" && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-2xl font-bold mb-4">{t.privateDocs}</h2>
              <ul className="space-y-4">
                {privateDocuments.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">{t.noPrivateDocs}</li>
                ) : (
                  privateDocuments.map((doc) => (
                    <li
                      key={doc.id}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center relative"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{doc.fileName}</h3>
                        <p className="text-sm text-gray-500">
                          {t.modal.folderPath}: {doc.folder}
                        </p>
                        {doc.createdAt && (
                          <p className="text-sm text-gray-400 mt-1">
                            {t.uploaded} {formatTimestamp(doc.createdAt)}
                          </p>
                        )}
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 sm:mt-0 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold hover:bg-blue-200 transition-colors inline-block"
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
        {showModal === "announcement" && (
          <Modal
            title={editingItem ? t.modal.editAnnouncement : t.modal.createAnnouncement}
            onClose={() => { setShowModal(null); setEditingItem(null); setImageFiles([]); }}
          >
            <form onSubmit={editingItem ? handleUpdate : handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.title}</label>
                <input
                  type="text"
                  ref={announcementTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.announcementPlaceholder}
                  required
                  defaultValue={editingItem?.title || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.body}</label>
                <textarea
                  ref={announcementBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.announcementBodyPlaceholder}
                  required
                  defaultValue={editingItem?.body || ''}
                />
              </div>
              {isManager && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t.modal.image}</label>
                  <input
                    type="file"
                    multiple 
                    onChange={(e) => setImageFiles(Array.from(e.target.files))} 
                    className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(null); setEditingItem(null); setImageFiles([]); }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? t.loading : (editingItem ? t.modal.update : t.modal.publish)}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isLoggedIn && showModal === "pqr" && (
          <Modal
            title={editingItem ? t.modal.editPQR : t.modal.createPQR}
            onClose={() => { setShowModal(null); setEditingItem(null); setPqrFile(null); }}
          >
            <form onSubmit={editingItem ? handleUpdate : handleAddPQR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.name}</label>
                <input
                  type="text"
                  ref={pqrNameRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.namePlaceholder}
                  required
                  defaultValue={editingItem?.name || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.apartment}</label>
                <input
                  type="text"
                  ref={pqrApartmentRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.apartmentPlaceholder}
                  required
                  defaultValue={editingItem?.apartment || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.title}</label>
                <input
                  type="text"
                  ref={pqrTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.pqrPlaceholder}
                  required
                  defaultValue={editingItem?.title || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.body}</label>
                <textarea
                  ref={pqrBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.pqrBodyPlaceholder}
                  required
                  defaultValue={editingItem?.body || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.file}</label>
                <input
                  type="file"
                  onChange={(e) => setPqrFile(e.target.files[0])}
                  className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(null); setEditingItem(null); setPqrFile(null); }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? t.loading : (editingItem ? t.modal.update : t.modal.submit)}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isManager && showModal === "document" && (
          <Modal
            title={editingItem ? t.modal.editDocument : t.modal.uploadDocument}
            onClose={() => { setShowModal(null); setEditingItem(null); }}
          >
            <form onSubmit={editingItem ? handleUpdate : handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.documentName}</label>
                <input
                  type="text"
                  ref={documentNameRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.documentNamePlaceholder}
                  required
                  defaultValue={editingItem?.name || ''}
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
                  defaultValue={editingItem?.url || ''}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(null); setEditingItem(null); }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? t.modal.update : t.modal.upload}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isManager && showModal === "upload_private_doc" && (
          <Modal
            title={t.modal.uploadPrivate}
            onClose={() => { setShowModal(null); setSelectedPrivateFiles([]); }} // CHANGED: Reset state on close
          >
            <form onSubmit={handleUploadPrivateFiles} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.selectResident}</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedResidentUid}
                  onChange={(e) => setSelectedResidentUid(e.target.value)}
                  required
                >
                  {residents.length > 0 ? (
                    residents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.name} ({resident.apartment}) - {resident.email}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No residents available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.modal.folderPath}</label>
                <input
                  type="text"
                  ref={privateFolderNameRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.modal.folderPathPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  multiple
                  ref={privateFilesRef} // FIXED: Added the ref back to the input
                  className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                  onChange={(e) => setSelectedPrivateFiles(Array.from(e.target.files))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(null); setSelectedPrivateFiles([]); }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || !selectedPrivateFiles.length}
                >
                  {uploading ? t.loading : t.modal.upload}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
