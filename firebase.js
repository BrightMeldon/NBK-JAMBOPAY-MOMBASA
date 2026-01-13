// Firebase Configuration
// Replace with your Firebase project configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDGwbkOgxLufSaYW0mRlUDybaeQkSkt5M",
  authDomain: "nbk-leave-rotation.firebaseapp.com",
  projectId: "nbk-leave-rotation",
  storageBucket: "nbk-leave-rotation.firebasestorage.app",
  messagingSenderId: "679202373368",
  appId: "1:679202373368:web:3d27d5f4ddfc94cf7a450d",
  measurementId: "G-EMMEP607C4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Firebase Collections
const STAFF_COLLECTION = "staff";
const NOTES_COLLECTION = "notes";
const SETTINGS_COLLECTION = "settings";
const USERS_COLLECTION = "users";

// Admin credentials (for initial setup)
const ADMIN_EMAIL = "admin@nbk.co.ke";
const ADMIN_PASSWORD = "Admin@NBK2024!";

// Initialize admin user if not exists
async function initializeAdminUser() {
    try {
        // Check if admin user exists
        const usersSnapshot = await db.collection(USERS_COLLECTION)
            .where("email", "==", ADMIN_EMAIL)
            .get();
        
        if (usersSnapshot.empty) {
            // Create admin user
            await db.collection(USERS_COLLECTION).add({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                role: "admin",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: null
            });
            console.log("Admin user initialized");
        }
    } catch (error) {
        console.error("Error initializing admin user:", error);
    }
}

// Call initialization
initializeAdminUser();

// Firebase utility functions
async function addStaffToFirebase(staffData) {
    try {
        const docRef = await db.collection(STAFF_COLLECTION).add({
            ...staffData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding staff:", error);
        throw error;
    }
}

async function updateStaffInFirebase(staffId, staffData) {
    try {
        await db.collection(STAFF_COLLECTION).doc(staffId).update({
            ...staffData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error updating staff:", error);
        throw error;
    }
}

async function deleteStaffFromFirebase(staffId) {
    try {
        await db.collection(STAFF_COLLECTION).doc(staffId).delete();
        return true;
    } catch (error) {
        console.error("Error deleting staff:", error);
        throw error;
    }
}

async function getAllStaffFromFirebase() {
    try {
        const snapshot = await db.collection(STAFF_COLLECTION)
            .orderBy("position", "asc")
            .get();
        
        const staff = [];
        snapshot.forEach(doc => {
            staff.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return staff;
    } catch (error) {
        console.error("Error fetching staff:", error);
        throw error;
    }
}

async function addNoteToFirebase(noteData) {
    try {
        const docRef = await db.collection(NOTES_COLLECTION).add({
            ...noteData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
}

async function getAllNotesFromFirebase() {
    try {
        const snapshot = await db.collection(NOTES_COLLECTION)
            .orderBy("createdAt", "desc")
            .get();
        
        const notes = [];
        snapshot.forEach(doc => {
            notes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return notes;
    } catch (error) {
        console.error("Error fetching notes:", error);
        throw error;
    }
}

async function getSettingsFromFirebase() {
    try {
        const doc = await db.collection(SETTINGS_COLLECTION).doc("system").get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
}

async function saveSettingsToFirebase(settings) {
    try {
        await db.collection(SETTINGS_COLLECTION).doc("system").set({
            ...settings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
    }
}

// Real-time listeners
function setupStaffListener(callback) {
    return db.collection(STAFF_COLLECTION)
        .orderBy("position", "asc")
        .onSnapshot(snapshot => {
            const staff = [];
            snapshot.forEach(doc => {
                staff.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(staff);
        }, error => {
            console.error("Staff listener error:", error);
        });
}

function setupNotesListener(callback) {
    return db.collection(NOTES_COLLECTION)
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {
            const notes = [];
            snapshot.forEach(doc => {
                notes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(notes);
        }, error => {
            console.error("Notes listener error:", error);
        });
}

// Authentication functions
async function authenticateUser(email, password) {
    try {
        // In a real app, you would use Firebase Auth
        // For simplicity, we're using Firestore for authentication in this example
        const usersSnapshot = await db.collection(USERS_COLLECTION)
            .where("email", "==", email)
            .where("password", "==", password)
            .get();
        
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            
            // Update last login
            await db.collection(USERS_COLLECTION).doc(userDoc.id).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                success: true,
                user: {
                    id: userDoc.id,
                    ...userData,
                    password: undefined // Don't return password
                }
            };
        }
        
        return {
            success: false,
            error: "Invalid email or password"
        };
    } catch (error) {
        console.error("Authentication error:", error);
        return {
            success: false,
            error: "Authentication failed. Please try again."
        };
    }
}

// Export Firebase functions
window.firebaseUtils = {
    addStaff: addStaffToFirebase,
    updateStaff: updateStaffInFirebase,
    deleteStaff: deleteStaffFromFirebase,
    getAllStaff: getAllStaffFromFirebase,
    addNote: addNoteToFirebase,
    getAllNotes: getAllNotesFromFirebase,
    getSettings: getSettingsFromFirebase,
    saveSettings: saveSettingsToFirebase,
    setupStaffListener,
    setupNotesListener,
    authenticateUser,
    db,
    auth
};