// Made by Nathan
// Firebase Configuration
const firebaseConfig = {
    // IMPORTANT: Replace these with your actual Firebase project credentials
    apiKey: "AIzaSyCAJ5kM37MKyq2UGUw1dHF8EEskdKWU5f4",
    authDomain: "studyhubon.firebaseapp.com",
    projectId: "studyhubon",
    storageBucket: "studyhubon.firebasestorage.app",
    messagingSenderId: "137164743903",
    appId: "1:137164743903:web:9ffa7d3f8e67d9b349f56a",
    measurementId: "G-6SPKY9LQ0S"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions(); // For calling Cloud Functions

// Global State
let currentUser = null;
let userData = {};
let lessonsArray = [];
let currentChatType = 'global';
let chatListener = null;
let flashcardsListener = null;

// --- Initialization and UI Setup ---

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    setupLessonInput('lesson-input', 'lessons-list', lessonsArray);
    setupLessonInput('setting-lesson-input', 'setting-lessons-list', lessonsArray);
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.getAttribute('data-tab'));
        });
    });
});

// --- Authentication and Flow Control ---

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        
        // Fetch user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            lessonsArray = userData.lessons || [];
            
            loadAppDashboard();
            document.getElementById('onboarding-modal').classList.add('hidden');
        } else {
            // New user, trigger onboarding
            document.getElementById('app-container').classList.add('hidden'); // Hide app if no profile
            document.getElementById('onboarding-modal').classList.remove('hidden');
        }
    } else {
        // User logged out
        currentUser = null;
        userData = {};
        lessonsArray = [];
        // Clear listeners
        if (chatListener) chatListener();
        if (flashcardsListener) flashcardsListener();
        
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('onboarding-modal').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        showLogin();
    }
});

function loadAppDashboard() {
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('dashboard-greeting').textContent = `👋 Welcome back, ${userData.name.split(' ')[0] || 'Learner'}!`;
    
    // Admin Panel Restriction
    const isAdmin = currentUser.email === 'declanthebest01@gmail.com';
    const adminNav = document.getElementById('admin-panel-nav');
    if (isAdmin) {
        adminNav.classList.remove('hidden');
    } else {
        adminNav.classList.add('hidden');
    }
    
    // Populate Settings data
    document.getElementById('setting-name').value = userData.name || '';
    document.getElementById('setting-email').value = currentUser.email;
    document.getElementById('setting-age').value = userData.age || '';
    document.getElementById('setting-year').value = userData.yearGroup || '';
    document.getElementById('setting-institution').value = userData.institution || '';
    displayLessons('setting-lessons-list', lessonsArray, 'setting-lesson-input'); // Re-render lessons

    switchTab('dashboard');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');

    // Load content specific to the tab
    if (tabId === 'chat') switchChat(currentChatType);
    if (tabId === 'flashcards') setupFlashcardsListener(); // Load flashcards with listener
    if (tabId === 'leaderboard') loadLeaderboard('global');
}

function showLogin() {
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

function togglePasswordVisibility(id, iconElement) {
    const passwordInput = document.getElementById(id);
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        iconElement.setAttribute('data-lucide', 'eye-off');
    } else {
        passwordInput.type = 'password';
        iconElement.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

async function signup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorElement = document.getElementById('signup-error');
    errorElement.classList.add('hidden');

    if (!email || password.length < 6) {
        errorElement.textContent = "Email required and password must be at least 6 characters.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        // OnAuthStateChanged handles the rest, triggering onboarding
    } catch (error) {
        errorElement.textContent = `Sign Up Error: ${error.message}`;
        errorElement.classList.remove('hidden');
    }
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    errorElement.classList.add('hidden');

    if (!email || !password) {
        errorElement.textContent = "Email and password are required.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorElement.textContent = `Login Error: ${error.message}`;
        errorElement.classList.remove('hidden');
    }
}

function logout() {
    auth.signOut();
}

// --- Onboarding & Settings ---

// Function to handle Enter key press for adding lessons
function setupLessonInput(inputID, listID, arrayRef) {
    const lessonInput = document.getElementById(inputID);
    lessonInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && lessonInput.value.trim()) {
            e.preventDefault();
            const lesson = lessonInput.value.trim();
            if (!arrayRef.includes(lesson)) {
                arrayRef.push(lesson);
                displayLessons(listID, arrayRef, inputID);
                lessonInput.value = '';
            }
        }
    });
}

// Function to dynamically display and manage lessons
function displayLessons(listID, arrayRef, inputID) {
    const listElement = document.getElementById(listID);
    listElement.innerHTML = '';
    arrayRef.forEach((lesson, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `${lesson} <span class="remove-lesson" data-index="${index}">x</span> Made by Nathan`;
        listElement.appendChild(item);
    });

    listElement.querySelectorAll('.remove-lesson').forEach(removeBtn => {
        removeBtn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            arrayRef.splice(index, 1);
            displayLessons(listID, arrayRef, inputID);
        });
    });
}

async function completeOnboarding() {
    const name = document.getElementById('onboard-name').value;
    const age = document.getElementById('onboard-age').value;
    const yearGroup = document.getElementById('onboard-year').value;
    const institution = document.getElementById('onboard-institution').value;
    const errorElement = document.getElementById('onboarding-error');
    errorElement.classList.add('hidden');

    if (!name || !age || !yearGroup || !institution) {
        errorElement.textContent = "Please fill in all required fields.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
        const profileData = {
            name,
            age: parseInt(age),
            yearGroup,
            institution,
            lessons: lessonsArray,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            score: 0 
        };

        await db.collection('users').doc(currentUser.uid).set(profileData);
        userData = profileData; // Update local state
        document.getElementById('onboarding-modal').classList.add('hidden');
        loadAppDashboard();
    } catch (error) {
        errorElement.textContent = `Onboarding Error: ${error.message}`;
        errorElement.classList.remove('hidden');
    }
}

async function updateUserProfile() {
    const name = document.getElementById('setting-name').value;
    const age = document.getElementById('setting-age').value;
    const yearGroup = document.getElementById('setting-year').value;
    const institution = document.getElementById('setting-institution').value;
    const messageElement = document.getElementById('settings-message');
    messageElement.textContent = '';

    try {
        const updatedData = {
            name,
            age: parseInt(age),
            yearGroup,
            institution,
            lessons: lessonsArray, // Updated lessonsArray from the settings input
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(currentUser.uid).update(updatedData);
        userData = {...userData, ...updatedData}; // Merge changes into local state
        messageElement.textContent = "Profile updated successfully!";
        messageElement.style.color = 'green';
        document.getElementById('dashboard-greeting').textContent = `👋 Welcome back, ${name.split(' ')[0]}!`;
    } catch (error) {
        messageElement.textContent = `Update Error: ${error.message}`;
        messageElement.style.color = 'red';
    }
}

function showResetPasswordModal() {
    document.getElementById('reset-email-display').textContent = currentUser.email;
    document.getElementById('reset-password-modal').classList.remove('hidden');
    document.getElementById('reset-password-message').textContent = '';
}

function hideResetPasswordModal() {
    document.getElementById('reset-password-modal').classList.add('hidden');
}

async function sendPasswordReset() {
    const messageElement = document.getElementById('reset-password-message');
    messageElement.textContent = 'Sending...';

    try {
        await auth.sendPasswordResetEmail(currentUser.email);
        messageElement.textContent = `Password reset link sent to ${currentUser.email}. Check your inbox!`;
        messageElement.style.color = 'green';
        setTimeout(hideResetPasswordModal, 3000);
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = 'red';
    }
}

// --- AI Help Functions (SECURELY implemented via Cloud Function) ---

const callGemini = functions.https.callable('callGemini');

async function sendAIQuery() {
    const promptInput = document.getElementById('ai-prompt');
    const messageText = promptInput.value.trim();
    if (!messageText) return;

    const messagesDiv = document.getElementById('ai-messages');
    
    // 1. Display User Message
    appendMessage(messagesDiv, messageText, 'user', userData.name.split(' ')[0] || 'You');
    promptInput.value = '';

    // 2. Display 'Thinking' message
    const thinkingMessage = appendMessage(messagesDiv, 'Thinking...', 'system');

    try {
        // CALL SECURE CLOUD FUNCTION
        const response = await callGemini({ prompt: messageText });
        const aiResponse = response.data.text || "I don't know, the AI service is currently unavailable.";
        
        // 3. Update 'Thinking' message
        thinkingMessage.innerHTML = aiResponse.replace(/\n/g, '<br>');
        thinkingMessage.classList.remove('system');
        thinkingMessage.classList.add('system');
        
    } catch (error) {
        thinkingMessage.textContent = `AI Error: ${error.message}. Please check Cloud Function logs.`;
        console.error("AI Error:", error);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Flashcard & Notes Functions (Working Firestore) ---

function showCreateFlashcardModal() {
    document.getElementById('create-flashcard-modal').classList.remove('hidden');
    document.getElementById('flashcard-front').value = '';
    document.getElementById('flashcard-back').value = '';
}

function hideCreateFlashcardModal() {
    document.getElementById('create-flashcard-modal').classList.add('hidden');
}

async function saveFlashcard() {
    const front = document.getElementById('flashcard-front').value.trim();
    const back = document.getElementById('flashcard-back').value.trim();

    if (front && back) {
        try {
            await db.collection('flashcards').add({
                userId: currentUser.uid,
                front: front,
                back: back,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            hideCreateFlashcardModal();
        } catch (error) {
            alert(`Failed to save item: ${error.message}`);
        }
    } else {
        alert('Please enter both a title/term and content/definition.');
    }
}

function setupFlashcardsListener() {
    const list = document.getElementById('flashcard-list');
    
    // Clear previous listener if any
    if (flashcardsListener) flashcardsListener();

    // Set up new real-time listener for the user's flashcards
    flashcardsListener = db.collection('flashcards')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            list.innerHTML = '';
            if (snapshot.empty) {
                list.innerHTML = '<p style="padding: 10px;">You have no saved flashcards or notes. Create one or generate with AI!</p>';
                return;
            }

            snapshot.forEach(doc => {
                const card = doc.data();
                const cardElement = document.createElement('div');
                cardElement.className = 'card-item';
                cardElement.innerHTML = `<h4>${card.front}</h4><p>${card.back.substring(0, 50)}...</p>`;
                cardElement.onclick = () => {
                    // Show full content/flip logic
                    alert(`CONTENT: ${card.back}\n\n[Click OK to dismiss]`);
                };
                list.appendChild(cardElement);
            });
        }, error => {
            console.error("Flashcard listener error:", error);
            list.innerHTML = '<p style="color: red;">Failed to load flashcards.</p>';
        });
}

async function generateAIFlashcards() {
    const topic = prompt("Enter a topic (e.g., 'The three laws of thermodynamics') for the AI to create flashcards:");
    if (!topic) return;

    alert(`Generating flashcards on "${topic}". Please wait...`);
    
    try {
        const response = await callGemini({ 
            prompt: `Generate 5 flashcards for ${topic}. Return them as a JSON array of objects, each with 'front' (term) and 'back' (definition) keys.`,
            mode: 'json'
        });

        const jsonString = response.data.text.trim();
        const newCards = JSON.parse(jsonString);

        if (Array.isArray(newCards)) {
            const batch = db.batch();
            newCards.forEach(card => {
                const newDocRef = db.collection('flashcards').doc();
                batch.set(newDocRef, {
                    userId: currentUser.uid,
                    front: card.front,
                    back: card.back,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
            alert("AI successfully generated and saved 5 flashcards!");
        } else {
            throw new Error("AI response was not a valid JSON array.");
        }
    } catch (error) {
        alert(`Failed to generate flashcards: ${error.message}. Check the console for details.`);
        console.error("AI Flashcard generation error:", error);
    }
}

// --- Quiz Functions (Stubs) ---
function generateQuizFromFlashcards() {
    alert('Quiz generation from saved items initiated. (Implementation pending: needs UI for quiz format/questions)');
}
function generateAIQuiz() {
    alert('AI Quiz generation initiated. (Implementation pending: would use callGemini with specific prompt for multiple-choice JSON)');
}


// --- Chat Functions (Working Real-time) ---

function appendMessage(chatContainer, text, type, senderName = 'System') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    // Check if the message is from the current user for alignment
    const isCurrentUser = type === 'user'; 

    if (type !== 'system') {
        messageElement.style.alignSelf = isCurrentUser ? 'flex-end' : 'flex-start';
        messageElement.innerHTML = `<strong>${senderName}:</strong> ${text}`;
    } else {
        messageElement.style.alignSelf = 'flex-start';
        messageElement.innerHTML = text;
    }
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement;
}

function switchChat(type) {
    currentChatType = type;
    document.getElementById('show-global-chat').classList.toggle('active-chat-btn', type === 'global');
    document.getElementById('show-year-chat').classList.toggle('active-chat-btn', type === 'year');
    
    // Setup the real-time listener
    setupChatListener(type);
}

function setupChatListener(type) {
    const chatWindow = document.getElementById('chat-window');
    
    // Clear previous listener
    if (chatListener) chatListener();
    chatWindow.innerHTML = '';
    appendMessage(chatWindow, `Connecting to the ${type} chat...`, 'system');

    let query = db.collection('chats').orderBy('timestamp', 'asc').limit(50);

    if (type === 'year') {
        const yearGroup = userData.yearGroup || 'Unknown';
        // Filter by the user's year group
        query = query.where('yearGroup', '==', yearGroup);
        appendMessage(chatWindow, `Filtering messages for ${yearGroup}.`, 'system');
    }

    // Set up new real-time listener
    chatListener = query.onSnapshot(snapshot => {
        // Clear window but keep the system messages
        const initialMessages = chatWindow.querySelectorAll('.message.system');
        chatWindow.innerHTML = '';
        initialMessages.forEach(msg => chatWindow.appendChild(msg));
        
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const message = change.doc.data();
                const isUser = message.senderId === currentUser.uid;
                
                appendMessage(
                    chatWindow, 
                    message.text, 
                    isUser ? 'user' : 'system', 
                    message.senderName
                );
            }
        });
    }, error => {
        console.error("Chat listener error:", error);
        appendMessage(chatWindow, 'Failed to load chat messages.', 'system');
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const messageText = input.value.trim();
    if (!messageText || !currentUser) return;
    
    input.value = ''; // Clear input immediately

    const yearGroup = userData.yearGroup || 'Unknown';
    const chatType = currentChatType;
    const userName = userData.name.split(' ')[0] || currentUser.email.split('@')[0];
    
    try {
        // Add message to Firestore
        await db.collection('chats').add({
            senderId: currentUser.uid,
            senderName: userName,
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            yearGroup: yearGroup, // Used for 'year' group filtering
            type: chatType // 'global' or 'year'
        });
        
    } catch (error) {
        console.error("Chat send error:", error);
        alert("Failed to send message.");
    }
}

// --- Leaderboard Functions (Working Firestore) ---

async function loadLeaderboard(type) {
    document.getElementById('show-global-ranking').classList.toggle('active-chat-btn', type === 'global');
    document.getElementById('show-year-ranking').classList.toggle('active-chat-btn', type === 'year');
    
    const tableBody = document.getElementById('leaderboard-body');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Loading Leaderboard...</td></tr>';

    let query = db.collection('users').orderBy('score', 'desc').limit(20);

    if (type === 'year') {
        const yearGroup = userData.yearGroup;
        if (yearGroup) {
            query = query.where('yearGroup', '==', yearGroup);
        }
    }

    try {
        const snapshot = await query.get();
        tableBody.innerHTML = '';
        
        let rank = 1;
        snapshot.forEach(doc => {
            const user = doc.data();
            const row = tableBody.insertRow();
            
            row.innerHTML = `
                <td style="padding: 10px;">${rank++}</td>
                <td>${user.name || 'Anonymous'}</td>
                <td>${user.yearGroup || 'N/A'}</td>
                <td>${user.score || 0}</td>
            `;
            // Highlight the current user
            if (doc.id === currentUser.uid) {
                row.style.fontWeight = 'bold';
                row.style.backgroundColor = 'var(--light-blue)';
            }
        });

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No users found for this category.</td></tr>';
        }

    } catch (error) {
        console.error("Leaderboard error:", error);
        tableBody.innerHTML = '<tr><td colspan="4" style="color: red; text-align: center; padding: 20px;">Failed to load leaderboard.</td></tr>';
    }
}
