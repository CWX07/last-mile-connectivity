// js/ai-insights.js (Updated for Google Gemini API)

// IMPORTANT: Replace with your actual Gemini API Key
const GEMINI_API_KEY = "AIzaSyDFU8g6Op1I4DdTsHYhF8fDgA3iUGgB9cM"; 

window.generateAIInsights = async function (path, startWalkDist, destWalkDist, fareBreakdown) {
    if (!path || path.length === 0) {
        return null;
    }

    // 1. Construct a detailed prompt for the AI
    const startStation = path[0].name;
    const endStation = path[path.length - 1].name;
    const lines = [...new Set(path.map(s => s.route_id))].join(", ");
    const totalFare = fareBreakdown ? `RM ${fareBreakdown.total.toFixed(2)}` : "N/A";

    const prompt = `
    You are a helpful local guide for Kuala Lumpur's public transport system.
    Based on the following journey details, provide 2-3 concise, helpful, and friendly travel tips in a single paragraph.
    Do not use emojis or a list format.

    Journey Details:
    - From: ${startStation}
    - To: ${endStation}
    - Lines: ${lines}
    - Total Fare: ${totalFare}
    - Start Walking Distance: ${(startWalkDist / 1000).toFixed(2)} km
    - End Walking Distance: ${(destWalkDist / 1000).toFixed(2)} km
    `;

    // 2. Call the Gemini API
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 150, // Keep the response short and concise
                    temperature: 0.7, // A bit of creativity
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[AI Insights] API Error:", errorData);
            throw new Error("AI service is currently unavailable.");
        }

        const data = await response.json();
        const aiTip = data.candidates[0].content.parts[0].text.trim();
        
        console.log("[AI Insights] Generated tip:", aiTip);
        return aiTip;

    } catch (error) {
        console.error("[AI Insights] Error generating AI insights:", error);
        // Return a fallback message if the AI fails
        return "Could not generate AI insights at this time. Please check your route details carefully.";
    }
};