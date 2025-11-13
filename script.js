// Made by Nathan
// --- 1. FIREBASE INITIALIZATION & CONFIG ---

// 🚨🚨 IMPORTANT: REPLACE PLACEHOLDERS BELOW WITH YOUR ACTUAL FIREBASE CONFIG 🚨🚨
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
const functions = firebase.functions(); // Use firebase.functions('your-region') if needed

// Reference to the callable function
const callGemini = functions.httpsCallable('callGemini'); 

// --- 2. GLOBAL ELEMENTS ---
const authModal = document.getElementById('auth-modal');
const mainContent = document.getElementById('main-content');
const authButton = document.getElementById('auth-button');
const signOutButton = document.getElementById('sign-out-button');
const userDisplay = document.getElementById('user-display');
const appView = document.getElementById('app-view');

let currentUser = null; 

// --- 3. AUTHENTICATION HANDLERS ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authButton.style.display = 'none';
        signOutButton.style.display = 'inline';
        userDisplay.textContent = `Welcome, ${user.email}!`;
        mainContent.style.display = 'flex';
        // Ensure user document exists in Firestore (for user data like 'score', 'yearGroup')
        db.collection('users').doc(user.uid).set({
            email: user.email,
            score: 0,
            yearGroup: 'Year10' // Default year group
        }, { merge: true });
        loadView('dashboard');

    } else {
        currentUser = null;
        authButton.style.display = 'inline';
        signOutButton.style.display = 'none';
        userDisplay.textContent = 'Please sign in.';
        mainContent.style.display = 'none';
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
authButton.addEventListener('click', () => {
    authModal.style.display = 'block';
    document.getElementById('auth-message').textContent = '';
});
document.querySelector('.close-button').addEventListener('click', () => authModal.style.display = 'none');


// --- 4. VIEW RENDERING AND ROUTING ---
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', (e) => loadView(e.target.dataset.view));
});

function loadView(viewName) {
    appView.innerHTML = `<h2>Loading ${viewName}...</h2>`;
    
    switch (viewName) {
        case 'dashboard':
            appView.innerHTML = `
                <h2>Dashboard</h2>
                <p>Track your progress and access quick links.</p>
                <p>Your current score: <span id="user-score">0</span></p>
            `;
            // Fetch and display user score
            db.collection('users').doc(currentUser.uid).get().then(doc => {
                document.getElementById('user-score').textContent = doc.data().score;
            });
            break;

        case 'flashcards':
            appView.innerHTML = `
                <h2>Flashcards</h2>
                <div id="flashcard-list"></div>
                <button id="add-flashcard-button">Add New Card</button>
            `;
            // Placeholder: Implement flashcard fetching/display here
            break;

        case 'chat':
            appView.innerHTML = `
                <h2>Year Group Chat</h2>
                <div id="chat-messages" style="height:300px; overflow-y:scroll; border:1px solid #ccc;"></div>
                <input type="text" id="chat-input" placeholder="Type your message...">
                <button id="send-chat-button">Send</button>
            `;
            // Placeholder: Implement real-time chat logic here
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
                    list.innerHTML += `<li>#${index + 1}: ${data.email} - Score: ${data.score}</li>`;
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
        // Call the secure Cloud Function
        const result = await callGemini({ prompt: prompt });
        
        // Display the AI's response
        output.textContent = result.data.responseText;
        status.textContent = 'AI response received.';
        
        // Optional: Increment user score for using AI feature
        // db.collection('users').doc(currentUser.uid).update({ 
        //     score: firebase.firestore.FieldValue.increment(5) 
        // });

    } catch (error) {
        console.error("Cloud Function Error:", error);
        status.textContent = `Error: ${error.message}. Check Cloud Function logs.`;
        output.textContent = 'Could not get a response from the AI.';
    }
}
