import { tool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

export const leetcodeQuestionTag = tool(
  async (input) => {
    try {
      const url = `${leetcodeApiBase}/select?titleSlug=${input.titleSlug}`;
      const response = await axios.get(url);

      if (response.status !== 200) {
        throw new Error("Failed to fetch LeetCode question");
      }

      const data = response.data;
      const questionTags = data.topicTags;

      return JSON.stringify(questionTags);
    } catch (error) {
      console.error("Error fetching LeetCode question info:", error);
      throw new Error("Failed to fetch LeetCode question information");
    }
  },
  {
    name: "leetcode_question_tag",
    description:
      "Fetch the tags associated with a LeetCode question based on its title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  },
);
