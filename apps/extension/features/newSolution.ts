import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import axios from "axios";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!);

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

async function leetcodeQuestionTag({ titleSlug }: { titleSlug: string }) {
  try {
    const url = `${leetcodeApiBase}/select?titleSlug=${titleSlug}`;
    const response = await axios.get(url);
    if (response.status !== 200) {
      throw new Error('Failed to fetch leetcode question');
    }
    const data = response.data;
    const questionTags = data.topicTags;
    return questionTags;
  } catch (error) {
    console.error('Error fetching LeetCode question info:', error);
    throw new Error('Failed to fetch LeetCode question information');
  }
}

const leetcodeQuestionTagFunctionDeclaration: FunctionDeclaration = {
  name: "leetcodeQuestionTag",
  description: "Fetch LeetCode question tags using the titleSlug.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      titleSlug: {
        type: SchemaType.STRING,
        description: "The titleSlug of the LeetCode problem.",
      },
    },
    required: ["titleSlug"],
  },
};

export const solutionModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
    You are an AI-powered solution generator. The user will provide a solution for a LeetCode problem.
    You will check if the solution aligns with one of the problem's tags by calling the 'leetcodeQuestionTag' function.
    If correct, suggest an alternate solution using a different tag from the fetched tags.
  `,
  generationConfig: {
    temperature: 0.1,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
  tools: [
    {
      functionDeclarations: [leetcodeQuestionTagFunctionDeclaration]
    }
  ],
});

export async function solution(query: string, titleSlug: string) {
  try {
    const chat = solutionModel.startChat();
    const prompt = query;
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls();

    const functions: Record<string, (args: any) => Promise<any>> = {
      leetcodeQuestionTag: leetcodeQuestionTag,
    };  

    if (!functionCalls) return response.text();

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        const apiResponse = await functions[call.name](call.args);
        return {
          functionResponse: {
            name: call.name,
            response: {
              content: apiResponse,
            },
          },
        };
      }),
    );

    const result2 = await chat.sendMessage(functionResponses);
    console.log(result2.response.text());
    return result2.response.text();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// solution(`Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

// You may assume that each input would have exactly one solution, and you may not use the same element twice.

// You can return the answer in any order.
//   class Solution:
//     def twoSum(self, nums: List[int], target: int) -> List[int]:
//         n = len(nums)
//         for i in range(n - 1):
//             for j in range(i + 1, n):
//                 if nums[i] + nums[j] == target:
//                     return [i, j]
//         return []  # No solution found`, "two-sum");