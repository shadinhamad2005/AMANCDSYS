// ==============================================================
// FIREBASE REALTIME DATABASE & AUTHENTICATION SERVICE MODULE
// ==============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnsZJnWu5PvC5UDyGL7q2zO9HjePDt5wk",
    authDomain: "amancdsys.firebaseapp.com",
    projectId: "amancdsys",
    storageBucket: "amancdsys.firebasestorage.app",
    messagingSenderId: "335675080686",
    appId: "1:335675080686:web:f38787505d1873c3cf58ff",
    measurementId: "G-F4D55C3MFK"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export const firebaseAuth = { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut };
export const firebaseDb = { database, ref, set, onValue };

window.firebaseAuth = firebaseAuth;
window.firebaseDb = firebaseDb;

export function saveDataToFirebase() {
    if (!auth.currentUser) return;
    const payload = {
        amanCerts: window.amanCerts || [],
        cdCerts: window.cdCerts || [],
        historyData: window.historyData || {}
    };
    set(ref(database, 'appData'), payload).catch((err) => {
        console.error("Firebase save error:", err);
    });
}
window.saveDataToFirebase = saveDataToFirebase;

export function listenToFirebase() {
    const dataRef = ref(database, 'appData');
    onValue(dataRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
            window.amanCerts = (val.amanCerts || []).map(c => ({
                ...c,
                renewalHistory: c.renewalHistory || []
            }));
            window.cdCerts = val.cdCerts || [];
            window.historyData = val.historyData || {};
            
            window.projectsList = new Set(['Main Project']);
            [...window.cdCerts, ...window.amanCerts].forEach(item => {
                if (item.project) window.projectsList.add(item.project);
            });
            if (window.updateProjectDropdown) window.updateProjectDropdown();
            if (window.renderAll) window.renderAll();
        }
    }, (err) => {
        console.error("Firebase read error:", err);
    });
}
window.listenToFirebase = listenToFirebase;
