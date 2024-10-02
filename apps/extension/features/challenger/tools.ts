import { tool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

export const fetchSimilarProblems = tool(
  async (input) => {
    try {
      const url = `${leetcodeApiBase}/select?titleSlug=${input.titleSlug}`;
      const response = await axios.get(url);

      if (response.status !== 200) {
        throw new Error("Failed to fetch LeetCode question");
      }

      const data = response.data;
      const similarQuestions = JSON.parse(data.similarQuestions || "[]");
      const similarQuestionsWithUrls = similarQuestions.map(
        (question: any) => ({
          ...question,
          url: `https://leetcode.com/problems/${question.titleSlug}`,
        }),
      );

      console.log(similarQuestionsWithUrls);

      return {
        ...data,
        similarQuestions: similarQuestionsWithUrls,
      };
    } catch (error) {
      console.error("Error fetching LeetCode question info:", error);
      throw new Error("Failed to fetch LeetCode question information");
    }
  },
  {
    name: "fetch_similar_problems",
    description: "Fetch similar LeetCode problems based on a title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  },
);
