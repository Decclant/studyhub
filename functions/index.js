// Made by Nathan
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');

admin.initializeApp();

const GEMINI_API_KEY = functions.config().gemini.key;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const model = 'gemini-2.5-flash';

exports.callGemini = functions.https.onCall(async (data, context) => {

    if (!data.prompt || typeof data.prompt !== 'string' || data.prompt.length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The prompt must be a non-empty string.'
        );
    }

    /*
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Authentication is required to call this function.'
        );
    }
    const userId = context.auth.uid;
    console.log(`User ${userId} is requesting AI help.`);
    */

    const userPrompt = data.prompt;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
                temperature: 0.3,
            },
        });

        return {
            responseText: response.text,
        };

    } catch (error) {
        console.error('Gemini API Error:', error);

        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while communicating with the AI service.',
            error.message
        );
    }
});