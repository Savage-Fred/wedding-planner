import { AnalysisResult, Urgency, Sentiment, Category, GuestStatus } from '../types';
// UNCOMMENT THE FOLLOWING LINES TO USE THE REAL GEMINI API
// import { GoogleGenAI, Type } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// const analysisSchema = {
//   type: Type.OBJECT,
//   properties: {
//     summary: { type: Type.STRING, description: "A concise summary of the message." },
//     urgency: { type: Type.STRING, enum: ['urgent', 'high', 'medium', 'low'], description: "The urgency of the message." },
//     sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'], description: "The sentiment of the message." },
//     category: { type: Type.STRING, enum: ['Vendor', 'Guest RSVP', 'Venue', 'Logistics', 'Personal', 'Other'], description: "The primary category of the message." },
//     tasks: { 
//         type: Type.ARRAY, 
//         items: { 
//             type: Type.OBJECT,
//             properties: {
//                 description: { type: Type.STRING },
//                 dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format, if mentioned." }
//             },
//             required: ['description']
//         }, 
//         description: "A list of actionable tasks from the message." 
//     },
//     guestUpdate: {
//       type: Type.OBJECT,
//       nullable: true,
//       properties: {
//         name: { type: Type.STRING, description: "Full name of the guest." },
//         status: { type: Type.STRING, enum: ['Attending', 'Declined', 'Pending'], description: "RSVP status." },
//         partySize: { type: Type.INTEGER, description: "Number of people in their party." }
//       }
//     }
//   },
//   required: ['summary', 'urgency', 'sentiment', 'category', 'tasks']
// };

// export const analyzeCommunication = async (content: string): Promise<AnalysisResult> => {
//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: `Analyze the following wedding-related message and provide a structured JSON output. Message: "${content}"`,
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: analysisSchema,
//       },
//     });

//     const resultText = response.text.trim();
//     const result = JSON.parse(resultText);
//     return result as AnalysisResult;
//   } catch (error) {
//     console.error("Error analyzing communication with Gemini:", error);
//     // Fallback to a mock error response
//     return {
//       summary: "AI analysis failed. Please review the message manually.",
//       urgency: 'medium',
//       sentiment: 'neutral',
//       category: 'Other',
//       tasks: [],
//       guestUpdate: null,
//     };
//   }
// };


// MOCKED IMPLEMENTATION for demonstration
const mockAnalyses: AnalysisResult[] = [
  {
    summary: "The caterer confirmed the final menu choices and provided an updated invoice. They need payment by the 15th of next month.",
    urgency: 'high' as Urgency,
    sentiment: 'neutral' as Sentiment,
    category: 'Vendor' as Category,
    tasks: [{ description: "Pay the final catering invoice.", dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }],
    guestUpdate: null,
  },
  {
    summary: "Aunt Carol is so excited to come! She's asking if she can bring her friend, Linda, as her plus-one.",
    urgency: 'medium' as Urgency,
    sentiment: 'positive' as Sentiment,
    category: 'Guest RSVP' as Category,
    tasks: [{ description: "Decide if Aunt Carol can bring a plus-one." }, { description: "Update Aunt Carol's guest entry if approved." }],
    guestUpdate: { name: "Carol Smith", status: 'Attending' as GuestStatus, partySize: 1 },
  },
  {
    summary: "The DJ sent over a preliminary playlist for the reception. They want us to review it and let them know of any changes.",
    urgency: 'medium' as Urgency,
    sentiment: 'neutral' as Sentiment,
    category: 'Vendor' as Category,
    tasks: [{ description: "Review DJ's preliminary playlist." }, { description: "Send feedback to DJ." }],
    guestUpdate: null,
  },
  {
    summary: "Your cousin Mike just RSVP'd for himself and his wife. Unfortunately, they won't be able to make it due to a prior commitment.",
    urgency: 'low' as Urgency,
    sentiment: 'neutral' as Sentiment,
    category: 'Guest RSVP' as Category,
    tasks: [],
    guestUpdate: { name: "Mike Johnson", status: 'Declined' as GuestStatus, partySize: 2 },
  }
];

export const analyzeCommunication = async (content: string): Promise<AnalysisResult> => {
    console.log("Mock analyzing message:", content);
    return new Promise(resolve => {
        setTimeout(() => {
            const randomAnalysis = mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];
            resolve(randomAnalysis);
        }, 1500);
    });
};
