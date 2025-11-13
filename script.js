/* Made by Nathan */
// --- Configuration and Initialization ---

// Firebase Config provided by the user
const firebaseConfig = {
    apiKey: "AIzaSyCAJ5kM37MKyq2UGUw1dHF8EEskdKWU5f4",
    authDomain: "studyhubon.firebaseapp.com",
    projectId: "studyhubon",
    storageBucket: "studyhubon.firebasestorage.app",
    messagingSenderId: "137164743903",
    appId: "1:137164743903:web:9ffa7d3f8e67d9b349f56a",
    measurementId: "G-6SPKY9LQ0S"
};

// Gemini API Key provided by the user
const GEMINI_API_KEY = "AIzaSyAsXY-tMiXaC2CX3VlWJa8NtOWb6pp4cFc";

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// AI Initialization (using a simple fetch wrapper for the API)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;

// Global state
let currentUserData = {};
let currentLessons = [];

// --- Authentication and Onboarding Functions ---

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling; // The eye icon is the next sibling
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons(); // Re-render the icon
}

async function signupUser() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        // 1. Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Initial user data for Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            onboarded: false,
            name: '',
            age: null,
            yearGroup: '',
            institution: '',
            lessons: []
        });

        alert("Sign Up successful! Please complete the onboarding process.");
    } catch (error) {
        alert("Sign Up Failed: " + error.message);
    }
}

async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
}

function logoutUser() {
    auth.signOut();
}

// Handle the user's authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('auth-screen').classList.add('hidden');
        await loadUserData(user.uid);

        // Check for Admin status and conditionally show the Admin Panel link
        const adminPanelLink = document.querySelector('.nav-item[data-view="admin-panel"]');
        if (user.email === 'declanthebest01@gmail.com') {
            if (!adminPanelLink) {
                 // Dynamically create the admin link if it doesn't exist (for future implementation)
                 const sidebar = document.getElementById('sidebar');
                 const adminLink = document.createElement('a');
                 adminLink.href = '#';
                 adminLink.className = 'nav-item';
                 adminLink.setAttribute('data-view', 'admin-panel');
                 adminLink.innerHTML = '<i data-lucide="lock"></i> Admin Panel';
                 // Find the credits tab or settings tab to insert before
                 const creditsLink = document.querySelector('.nav-item[data-view="credits"]');
                 sidebar.insertBefore(adminLink, creditsLink);
                 lucide.createIcons();
            }
        } else {
            if (adminPanelLink) {
                adminPanelLink.remove(); // Remove if user is not admin
            }
        }


        if (currentUserData.onboarded) {
            document.getElementById('onboarding').classList.add('hidden');
            document.getElementById('app-dashboard').classList.remove('hidden');
            // Initial view is AI Helper
            switchView('ai-helper'); 
        } else {
            document.getElementById('app-dashboard').classList.remove('hidden');
            document.getElementById('onboarding').classList.remove('hidden');
        }
    } else {
        document.getElementById('app-dashboard').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        showLogin();
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            currentLessons = currentUserData.lessons || [];
        } else {
            console.error("No user data found in Firestore.");
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Onboarding logic
document.getElementById('onboard-lessons-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addLesson(this.value.trim(), 'onboard-lessons-list');
        this.value = '';
    }
});

function addLesson(lesson, listId) {
    if (lesson && !currentLessons.includes(lesson)) {
        currentLessons.push(lesson);
        renderLessonsList(listId);
    }
}

function removeLesson(lesson, listId) {
    currentLessons = currentLessons.filter(l => l !== lesson);
    renderLessonsList(listId);
}

function renderLessonsList(listId) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = '';
    currentLessons.forEach(lesson => {
        const item = document.createElement('span');
        item.className = 'list-item';
        item.textContent = lesson;
        const removeIcon = document.createElement('span');
        removeIcon.className = 'list-item-remove';
        removeIcon.innerHTML = '&times;';
        // Determine the correct list ID for removal handler
        const isSettings = listId === 'setting-lessons-list';
        const targetListId = isSettings ? 'setting-lessons-list' : 'onboard-lessons-list'; 
        removeIcon.onclick = () => removeLesson(lesson, targetListId);
        item.appendChild(removeIcon);
        listElement.appendChild(item);
    });
}

async function completeOnboarding() {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('onboard-name').value;
    const age = parseInt(document.getElementById('onboard-age').value);
    const yearGroup = document.getElementById('onboard-year-group').value;
    const institution = document.getElementById('onboard-institution').value;

    if (!name || !age || !yearGroup || !institution || currentLessons.length === 0) {
        alert("Please fill in all onboarding fields and add at least one lesson.");
        return;
    }

    try {
        await db.collection('users').doc(user.uid).update({
            onboarded: true,
            name,
            age,
            yearGroup,
            institution,
            lessons: currentLessons
        });
        
        currentUserData = { ...currentUserData, onboarded: true, name, age, yearGroup, institution, lessons: currentLessons };
        alert("Onboarding complete! Welcome to StudyHub.");
        document.getElementById('onboarding').classList.add('hidden');
        switchView('ai-helper');
    } catch (error) {
        alert("Failed to complete onboarding: " + error.message);
    }
}


// --- Sidebar and View Management ---

function switchView(viewId) {
    // Hide all content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.add('hidden');
    });
    // Show the requested view
    document.getElementById(viewId).classList.remove('hidden');

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active'); // Use optional chaining for safety

    // Special initialization for specific views
    if (viewId === 'settings') {
        loadSettings();
    } else if (viewId === 'notes-flashcards') {
        loadUserContent();
    } else if (viewId === 'admin-panel') {
        // Placeholder for Admin Panel functionality
        if (auth.currentUser.email !== 'declanthebest01@gmail.com') {
            alert('Access Denied: You are not authorized to view the Admin Panel.');
            switchView('ai-helper'); // Redirect
            return;
        }
        // TODO: Load Admin Panel content
    }
}

// Attach event listeners to sidebar items (needs to be dynamic due to admin panel visibility)
// Re-attaching listeners on DOM change or a simple delegation setup is better.
document.getElementById('sidebar').addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
        e.preventDefault();
        const viewId = navItem.getAttribute('data-view');
        // Prevent logout link from trying to switch view
        if (viewId) {
             switchView(viewId);
        }
    }
});


// --- 1. AI Study Helper Functionality ---

async function sendAIChat() {
    const inputElement = document.getElementById('ai-user-input');
    const chatBox = document.getElementById('ai-chat-box');
    const userPrompt = inputElement.value.trim();

    if (!userPrompt) return;

    // Display user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'user-message';
    userMessageDiv.textContent = userPrompt;
    chatBox.appendChild(userMessageDiv);

    // Clear input and show a placeholder AI message
    inputElement.value = '';
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'ai-message';
    aiMessageDiv.innerHTML = '<span class="loading">... Thinking ...</span>';
    chatBox.appendChild(aiMessageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Construct the context for the AI
    const context = `You are a helpful study assistant named StudyHub AI, designed to help students, especially those in Cambridge curriculum. The user's profile is: Name: ${currentUserData.name || 'Student'}, Year Group: ${currentUserData.yearGroup || 'N/A'}, Lessons: ${currentUserData.lessons ? currentUserData.lessons.join(', ') : 'None'}. Provide concise, accurate, and encouraging study help.`;

    const payload = {
        contents: [
            { role: "user", parts: [{ text: context + "\n\nUser Question: " + userPrompt }] }
        ]
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm experiencing a high volume of requests. Please try again in a moment.";

        // Update the placeholder message with the actual response
        aiMessageDiv.innerHTML = aiResponseText.replace(/\n/g, '<br>'); // Basic formatting for newlines
        
    } catch (error) {
        console.error("AI Chat Error:", error);
        aiMessageDiv.textContent = "Sorry, I couldn't connect to the AI service. " + error.message;
    } finally {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}


// --- 2. Notes & Flashcards Functionality ---

function showCreateNote() {
    document.getElementById('note-card-editor').classList.remove('hidden');
    document.getElementById('flashcard-editor').classList.add('hidden');
    document.querySelector('#note-card-editor h3').textContent = 'Create Note';
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
}

function showCreateFlashcard() {
    document.getElementById('note-card-editor').classList.add('hidden');
    document.getElementById('flashcard-editor').classList.remove('hidden');
    document.getElementById('card-front').value = '';
    document.getElementById('card-back').value = '';
}

async function saveNote() {
    const user = auth.currentUser;
    if (!user) return;
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title || !content) {
        alert("Please enter a title and content for your note.");
        return;
    }

    try {
        await db.collection('content').add({
            uid: user.uid,
            type: 'note',
            title: title,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Note saved successfully!');
        document.getElementById('note-card-editor').classList.add('hidden');
        loadUserContent(); // Refresh list
    } catch (error) {
        console.error("Error saving note:", error);
        alert('Failed to save note.');
    }
}

async function saveFlashcard() {
    const user = auth.currentUser;
    if (!user) return;
    const front = document.getElementById('card-front').value.trim();
    const back = document.getElementById('card-back').value.trim();

    if (!front || !back) {
        alert("Please enter a question/term for the front and an answer/definition for the back.");
        return;
    }

    try {
        await db.collection('content').add({
            uid: user.uid,
            type: 'flashcard',
            front: front,
            back: back,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Flashcard saved successfully!');
        document.getElementById('flashcard-editor').classList.add('hidden');
        loadUserContent(); // Refresh list
    } catch (error) {
        console.error("Error saving flashcard:", error);
        alert('Failed to save flashcard.');
    }
}

async function loadUserContent() {
    const user = auth.currentUser;
    if (!user) return;

    const listElement = document.getElementById('user-content-list');
    listElement.innerHTML = '<div>Loading content...</div>';

    try {
        const snapshot = await db.collection('content')
                                 .where('uid', '==', user.uid)
                                 .orderBy('createdAt', 'desc')
                                 .get();

        listElement.innerHTML = '';
        if (snapshot.empty) {
            listElement.innerHTML = '<div>You have no saved notes or flashcards. Start creating!</div>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'content-item';
            
            if (data.type === 'note') {
                item.innerHTML = `
                    <h4>📝 ${data.title}</h4>
                    <p>Note created on: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                `;
                item.onclick = () => alert(`Note: ${data.title}\n\nContent:\n${data.content}`);
            } else if (data.type === 'flashcard') {
                item.innerHTML = `
                    <h4>🃏 ${data.front}</h4>
                    <p>Click to see answer...</p>
                `;
                // Simple flip logic
                item.onclick = () => {
                    if (item.classList.contains('card-flip')) {
                        item.innerHTML = `<h4>🃏 ${data.front}</h4><p>Click to see answer...</p>`;
                        item.classList.remove('card-flip');
                    } else {
                        item.innerHTML = `<h4>💡 ${data.back}</h4><p>Click to see question...</p>`;
                        item.classList.add('card-flip');
                    }
                };
            }
            listElement.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading content:", error);
        listElement.innerHTML = '<div>Failed to load your content.</div>';
    }
}


function createFlashcardsFromNote() {
    alert("AI Flashcard generation is currently handled via the AI Helper chat. Please copy your note content, go to the AI Helper, and ask it to 'generate 5 flashcards from the following text'.");
}


// --- 3. Settings Functionality ---

document.getElementById('setting-lessons-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addLesson(this.value.trim(), 'setting-lessons-list');
        this.value = '';
    }
});

function loadSettings() {
    // Populate the form with current user data
    document.getElementById('setting-name').value = currentUserData.name || '';
    document.getElementById('setting-age').value = currentUserData.age || '';
    document.getElementById('setting-year-group').value = currentUserData.yearGroup || '';
    document.getElementById('setting-institution').value = currentUserData.institution || '';
    
    // Set up the lessons list. Re-fetch currentLessons from global state.
    currentLessons = [...(currentUserData.lessons || [])]; 
    renderLessonsList('setting-lessons-list');
}

async function saveSettings() {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('setting-name').value;
    const age = parseInt(document.getElementById('setting-age').value);
    const yearGroup = document.getElementById('setting-year-group').value;
    const institution = document.getElementById('setting-institution').value;
    
    try {
        await db.collection('users').doc(user.uid).update({
            name,
            age,
            yearGroup,
            institution,
            lessons: currentLessons
        });
        
        // Update global state
        currentUserData = { ...currentUserData, name, age, yearGroup, institution, lessons: currentLessons };
        alert("Settings saved successfully!");

    } catch (error) {
        alert("Failed to save settings: " + error.message);
    }
}

async function resetPassword() {
    const newPassword = document.getElementById('setting-new-password').value;
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to reset your password.");
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    try {
        await user.updatePassword(newPassword);
        alert("Password reset successfully!");
        document.getElementById('setting-new-password').value = ''; // Clear the field
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
             alert("Error: For security, please log out and log in again immediately before attempting to change your password.");
        } else {
            alert("Password reset failed: " + error.message);
        }
    }
}