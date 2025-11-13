/** Made by Nathan */
const functions = require('firebase-functions');
const { GoogleGenAI } = require('@google/genai');

// Load API key securely from environment variables
// IMPORTANT: You must run 'firebase functions:config:set gemini.key="YOUR_API_KEY"'
const geminiApiKey = functions.config().gemini.key;
if (!geminiApiKey) {
    throw new Error('Gemini API key not configured. Run: firebase functions:config:set gemini.key="..."');
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// --- Gemini Cloud Function ---
exports.callGemini = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check: Ensure the call is made by a logged-in user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The request must be authenticated.');
    }

    const prompt = data.prompt;
    const mode = data.mode || 'text'; // 'text' or 'json'

    if (!prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'The prompt is required.');
    }

    try {
        // Set configuration based on the requested mode
        const config = {
            temperature: 0.7,
            responseMimeType: mode === 'json' ? "application/json" : "text/plain",
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: config,
        });

        const text = response.text;
        
        // Return the response text securely
        return { text: text };

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to get response from AI.', error.message);
    }
});
