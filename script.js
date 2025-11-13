// Made by Nathan
// --- 1. FIREBASE INITIALIZATION & CONFIG ---

// Project-specific configuration for studyhubon
const firebaseConfig = {
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
const functions = firebase.functions(); 
const callGemini = functions.httpsCallable('callGemini'); 

// --- 2. GLOBAL ELEMENTS & STATE ---
const authModal = document.getElementById('auth-modal');
const mainContent = document.getElementById('main-content');
const authButton = document.getElementById('auth-button');
const signOutButton = document.getElementById('sign-out-button');
const userDisplay = document.getElementById('user-display');
const appView = document.getElementById('app-view');
const adminNavButton = document.getElementById('admin-nav-button');

let currentUser = null; 
let isAdmin = false; 
const ADMIN_EMAIL = 'declanthebest01@gmail.com'; // Admin lock

let chatUnsubscribe = null; // Used to manage the chat listener

// --- 3. AUTHENTICATION HANDLERS ---
auth.onAuthStateChanged(user => {
    // Clean up chat listener when logging out
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    
    if (user) {
        currentUser = user;
        authButton.style.display = 'none';
        signOutButton.style.display = 'inline';
        
        // Dynamic Admin Check
        isAdmin = (user.email === ADMIN_EMAIL);
        const userRole = isAdmin ? 'admin' : 'user';

        // 1. Set/Update user profile in Firestore
        db.collection('users').doc(user.uid).set({
            email: user.email,
            score: 0,
            yearGroup: 'Year10',
            role: userRole // Set role based on email check
        }, { merge: true }).then(() => {
            
            // 2. Update UI
            userDisplay.textContent = `Welcome, ${user.email}!`;
            adminNavButton.style.display = isAdmin ? 'block' : 'none';
            
            // FIX: Ensure main content is set to flex for visibility
            mainContent.style.display = 'flex'; 
            
            loadView('dashboard');
        });

    } else {
        currentUser = null;
        isAdmin = false;
        authButton.style.display = 'inline';
        signOutButton.style.display = 'none';
        userDisplay.textContent = 'Please sign in.';
        
        // FIX: Ensure main content is correctly hidden on logout
        mainContent.style.display = 'none'; 
        
        adminNavButton.style.display = 'none';
        appView.innerHTML = `<h2>Please sign in to access StudyHub features.</h2>`;
    }
});

document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => authModal.style.display = 'none')
        .catch(error => document.getElementById('auth-message').textContent = error.message);
});

document.getElementById('register-button').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => authModal.style.display = 'none')
        .catch(error => document.getElementById('auth-message').textContent = error.message);
});

signOutButton.addEventListener('click', () => auth.signOut());
document.querySelector('.close-button').addEventListener('click', () => authModal.style.display = 'none');
authButton.addEventListener('click', () => {
    authModal.style.display = 'block';
    document.getElementById('auth-message').textContent = '';
});

// --- 4. VIEW RENDERING AND ROUTING ---
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', (e) => loadView(e.target.dataset.view));
});

function loadView(viewName) {
    // Clean up chat listener before loading new view
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }

    // Update active state on sidebar buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active-view');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active-view');
        }
    });

    if (viewName === 'admin-panel' && !isAdmin) {
        appView.innerHTML = `<h2>Access Denied</h2><p>You do not have administrative privileges.</p>`;
        return; 
    }
    
    appView.innerHTML = `<h2>Loading ${viewName}...</h2>`;
    
    switch (viewName) {
        case 'dashboard':
            appView.innerHTML = `
                <h2>Dashboard</h2>
                <p>Track your progress and access quick links.</p>
                <p>Your current score: <span id="user-score">Loading...</span></p>
                <div style="margin-top: 2rem;">
                    <h3>Quick Actions</h3>
                    <button onclick="loadView('ai-help')">Get AI Help</button>
                    <button onclick="loadView('flashcards')">Start Studying</button>
                </div>
            `;
            if (currentUser) {
                db.collection('users').doc(currentUser.uid).get()
                    .then(doc => {
                        const score = doc.exists ? doc.data().score : 0;
                        document.getElementById('user-score').textContent = score;
                    });
            }
            break;

        case 'flashcards':
            appView.innerHTML = `
                <h2>Flashcards</h2>
                <p>Functionality for managing flashcards will be implemented here.</p>
                <div id="flashcard-list"></div>
                <button id="add-flashcard-button">Add New Card</button>
            `;
            break;

        case 'chat':
            // FULLY IMPLEMENTED CHAT VIEW
            appView.innerHTML = `
                <h2>Year Group Chat</h2>
                <div id="chat-messages" style="height:350px; overflow-y:scroll; border:1px solid #cbd5e1; border-radius: 0.5rem; background-color: #f8fafc; padding: 1rem; margin-bottom: 1rem;"></div>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="chat-input" placeholder="Type your message..." style="flex-grow: 1; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-size: 1rem;">
                    <button id="send-chat-button" style="width: 100px; padding: 0.75rem 0;">Send</button>
                </div>
            `;
            setupChat();
            break;

        case 'leaderboard':
            appView.innerHTML = `
                <h2>Leaderboard</h2>
                <ol id="leaderboard-list"></ol>
            `;
            db.collection('users').orderBy('score', 'desc').limit(10).get().then(snapshot => {
                const list = document.getElementById('leaderboard-list');
                list.innerHTML = '';
                snapshot.forEach((doc, index) => {
                    const data = doc.data();
                    const emailParts = data.email.split('@');
                    list.innerHTML += `<li>#${index + 1}: ${emailParts[0]} - Score: ${data.score}</li>`;
                });
            });
            break;

        case 'ai-help':
            appView.innerHTML = `
                <h2>AI Study Helper (Gemini)</h2>
                <textarea id="ai-prompt-input" placeholder="Ask the AI a study question..."></textarea>
                <button id="ai-submit-button">Ask AI</button>
                <p id="ai-response-status"></p>
                <div id="ai-response-output" style="white-space: pre-wrap; margin-top: 15px; border: 1px solid #eee; padding: 10px;"></div>
            `;
            document.getElementById('ai-submit-button').addEventListener('click', handleAiSubmit);
            break;

        case 'admin-panel':
            appView.innerHTML = `
                <h2>Admin Panel: User Management</h2>
                <p>Manually update user scores.</p>
                <ul id="admin-panel-users">Loading Users...</ul>
            `;
            loadAdminPanelUsers();
            break;
    }
}

// --- 5. GEMINI AI CALLER ---
async function handleAiSubmit() {
    if (!currentUser) return;

    const promptInput = document.getElementById('ai-prompt-input');
    const status = document.getElementById('ai-response-status');
    const output = document.getElementById('ai-response-output');
    const prompt = promptInput.value.trim();

    if (!prompt) {
        status.textContent = 'Please enter a question.';
        return;
    }

    status.textContent = 'Sending request to AI...';
    output.textContent = ''; 

    try {
        const result = await callGemini({ prompt: prompt });
        
        output.textContent = result.data.responseText;
        status.textContent = 'AI response received.';
        
    } catch (error) {
        console.error("Cloud Function Error:", error);
        status.textContent = `Error: ${error.message}. Check logs.`;
        output.textContent = 'Could not get a response from the AI.';
    }
}

// --- 6. ADMIN FUNCTIONS ---
function loadAdminPanelUsers() {
    const userList = document.getElementById('admin-panel-users');
    userList.innerHTML = 'Fetching all users...';
    
    db.collection('users').orderBy('email').get().then(snapshot => {
        userList.innerHTML = '';
        snapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${userData.email} (Score: ${userData.score})</span>
                <div>
                    <input type="number" value="${userData.score}" id="score-input-${userId}" class="admin-score-input">
                    <button class="admin-update-button" onclick="updateUserScore('${userId}')">Update</button>
                </div>
            `;
            userList.appendChild(li);
        });
    });
}

function updateUserScore(userId) {
    const scoreInput = document.getElementById(`score-input-${userId}`);
    const newScore = parseInt(scoreInput.value);

    if (isNaN(newScore) || newScore < 0) {
        alert("Please enter a valid, non-negative score.");
        return;
    }

    db.collection('users').doc(userId).update({
        score: newScore
    })
    .then(() => {
        alert(`Score for user ${userId} updated to ${newScore}.`);
        loadAdminPanelUsers(); 
    })
    .catch(error => {
        console.error("Error updating score:", error);
        alert("Failed to update score.");
    });
}

// --- 7. CHAT FUNCTIONS ---

function setupChat() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-chat-button');
    const messagesDiv = document.getElementById('chat-messages');

    // 1. Send Message Handler
    const sendMessage = () => {
        const messageText = chatInput.value.trim();
        if (messageText && currentUser) {
            db.collection('chat').add({
                text: messageText,
                sender: currentUser.email.split('@')[0], // Use username part of email
                timestamp: firebase.firestore.FieldValue.serverTimestamp() 
            }).then(() => {
                chatInput.value = ''; // Clear input
            }).catch(error => {
                console.error("Error sending message:", error);
            });
        }
    };

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 2. Real-time Listener (onSnapshot)
    chatUnsubscribe = db.collection('chat')
        .orderBy('timestamp', 'asc') 
        .limit(50) 
        .onSnapshot(snapshot => {
            messagesDiv.innerHTML = ''; 
            snapshot.forEach(doc => {
                const msg = doc.data();
                const senderName = msg.sender || 'Anonymous';
                
                // Format timestamp
                const date = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const messageElement = document.createElement('p');
                messageElement.innerHTML = `
                    <span style="font-weight: bold; color: ${senderName === 'declanthebest01' ? '#4f46e5' : '#14b8a6'};">${senderName}</span> 
                    <span style="font-size: 0.75em; color: #94a3b8;">(${timeStr})</span>: 
                    ${msg.text}
                `;
                messagesDiv.appendChild(messageElement);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, error => {
            console.error("Error setting up chat listener:", error);
            messagesDiv.innerHTML = '<p style="color:red;">Failed to load messages.</p>';
        });
}
