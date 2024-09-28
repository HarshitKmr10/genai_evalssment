import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HighlightTextArgs {
  text: string;
  keywords: string[];
}

function highlightText({ text, keywords }: HighlightTextArgs): string {
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    text = text.replace(regex, match => `\x1b[33m${match}\x1b[0m`);
  });

  return text;
}

const highlightTextFunctionDeclaration: FunctionDeclaration = {
  name: "highlightText",
  description: "Highlight specific keywords in a given text.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: {
        type: SchemaType.STRING,
        description: "The input text to highlight within."
      },
      keywords: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING
        },
        description: "List of keywords to highlight."
      }
    },
    required: ["text", "keywords"]
  }
};

async function main() {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [
      {
        functionDeclarations: [highlightTextFunctionDeclaration]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }
  });

  try {
    const chat = model.startChat();
    const prompt = `You are implementing a program to use as your calendar. We can add a new event if adding the event will not cause a double booking.

    A double booking happens when two events have some non-empty intersection (i.e., some moment is common to both events.).

    The event can be represented as a pair of integers start and end that represents a booking on the half-open interval [start, end), the range of real numbers x such that start <= x < end.

    Implement the MyCalendar class:

    MyCalendar() Initializes the calendar object.
    boolean book(int start, int end) Returns true if the event can be added to the calendar successfully without causing a double booking. Otherwise, return false and do not add the event to the calendar.
    
    Highlight the important terms in this problem statement.`;

    const result = await chat.sendMessage(prompt);
    const functionCalls = result.response.functionCalls();

    const functions: Record<string, (args: any) => any> = {
      highlightText: highlightText
    };

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = await Promise.all(functionCalls.map(async (call) => {
        const apiResponse = await functions[call.name](call.args);
        console.log("Highlighted Text:", apiResponse);
        return {
          functionResponse: {
            name: call.name,
            response: {
              content: apiResponse
            }
          }
        };
      }));

      const result2 = await chat.sendMessage(functionResponses);
      console.log(result2.response.text());
    }
  } catch (error) {
    console.error('Error handling query:', error);
  }
}

main();
