import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, serverTimestamp, orderBy } from 'firebase/firestore';

// Main App component
const App = () => {
  // State for Firebase services and user data
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // State for the UI
  const [view, setView] = useState('announcements'); // 'announcements', 'pqrs', 'documents'
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [pqrs, setPqrs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(null); // 'announcement', 'pqr', 'document'

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
      try {
        // Retrieve Firebase config and app ID from the environment variables
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
          console.error("Firebase config is missing.");
          setLoading(false);
          return;
        }

        // Initialize Firebase services
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setFirebaseApp(app);
        setAuth(authInstance);
        setDb(dbInstance);

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
            setLoading(false);
          } else {
            // Sign in with the custom token if available, otherwise anonymously
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          }
        });

        // Cleanup the listener on component unmount
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

    // Use a unique path for the app's public data
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const announcementsPath = `artifacts/${appId}/public/data/announcements`;
    const pqrsPath = `artifacts/${appId}/public/data/pqrs`;
    const documentsPath = `artifacts/${appId}/public/data/documents`;

    try {
      // Listener for Announcements
      const announcementsQuery = query(collection(db, announcementsPath), orderBy('createdAt', 'desc'));
      const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(data);
      }, (error) => {
        console.error("Error fetching announcements:", error);
      });

      // Listener for PQRs
      const pqrsQuery = query(collection(db, pqrsPath), orderBy('createdAt', 'desc'));
      const unsubscribePqrs = onSnapshot(pqrsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPqrs(data);
      }, (error) => {
        console.error("Error fetching PQRs:", error);
      });

      // Listener for Documents
      const documentsQuery = query(collection(db, documentsPath), orderBy('createdAt', 'desc'));
      const unsubscribeDocuments = onSnapshot(documentsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocuments(data);
      }, (error) => {
        console.error("Error fetching documents:", error);
      });

      // Cleanup listeners on unmount
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
        <div className="text-gray-500 text-lg">Loading...</div>
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
            <h1 className="text-3xl font-extrabold text-blue-600">Building Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Lightweight app for building management</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-600">Logged in as:</p>
            <p className="font-mono text-xs break-all mt-1">{userId}</p>
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
            Announcements
          </button>
          <button
            onClick={() => setView('pqrs')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === 'pqrs' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            PQRs
          </button>
          <button
            onClick={() => setView('documents')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold transition-colors duration-200 ${
              view === 'documents' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Documents
          </button>
        </nav>

        {/* Content Area */}
        <main className="space-y-6">
          {/* Announcements Tab */}
          {view === 'announcements' && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Announcements</h2>
                <button
                  onClick={() => setShowModal('announcement')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Add New
                </button>
              </div>
              <ul className="space-y-4">
                {announcements.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">No announcements yet.</li>
                ) : (
                  announcements.map((announcement) => (
                    <li key={announcement.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xl font-semibold">{announcement.title}</h3>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{announcement.body}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Posted: {announcement.createdAt?.toDate().toLocaleDateString('en-US', {
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
                <h2 className="text-2xl font-bold">PQRs</h2>
                <button
                  onClick={() => setShowModal('pqr')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Create New
                </button>
              </div>
              <ul className="space-y-4">
                {pqrs.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">No PQRs submitted yet.</li>
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
                          {pqr.status}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{pqr.body}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Submitted: {pqr.createdAt?.toDate().toLocaleDateString('en-US', {
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
                <h2 className="text-2xl font-bold">Documents</h2>
                <button
                  onClick={() => setShowModal('document')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Upload New
                </button>
              </div>
              <ul className="space-y-4">
                {documents.length === 0 ? (
                  <li className="text-gray-500 italic text-center py-4">No documents uploaded yet.</li>
                ) : (
                  documents.map((doc) => (
                    <li key={doc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Uploaded: {doc.createdAt?.toDate().toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-2 sm:mt-0 bg-gray-200 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition-colors inline-block">
                        View Document
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </main>

        {/* Modals for creating new items */}
        {showModal === 'announcement' && (
          <Modal title="Create New Announcement" onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  ref={announcementTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Water shut-off notice"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea
                  ref={announcementBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Please be advised that water will be turned off from..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  Publish
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showModal === 'pqr' && (
          <Modal title="Create New PQR" onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddPQR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  ref={pqrTitleRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Noise complaint from unit 10B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  ref={pqrBodyRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., The residents of unit 10B have been playing loud music..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showModal === 'document' && (
          <Modal title="Upload New Document" onClose={() => setShowModal(null)}>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Name</label>
                <input
                  type="text"
                  ref={documentNameRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2024 Annual Budget"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Document URL</label>
                <input
                  type="url"
                  ref={documentUrlRef}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., https://example.com/budget.pdf"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  Upload
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
