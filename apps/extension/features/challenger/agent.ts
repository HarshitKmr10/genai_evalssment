import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { fetchSimilarProblems } from "./tools";
import { type AgentState } from "../script";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { llm } from "../llm";

const challengerAgent = createReactAgent({
  llm,
  tools: [fetchSimilarProblems],
  messageModifier: new SystemMessage(
    "You are a provided with a problem's titleSlug. Incase you are not provided with the user's code and just the problem you can choose to either suggest new testcases or suggest similar problems to the user. In case of testcases, you don't just provide the test case to the user but do this while guiding them to think about the problem through the test case themselves. Do not give anything additional apart from the test case and the reasoning behind it. While in case of similar problems, you can use the leetcodeQuestionTag tool to find similar problems and suggest the user to solve them.",
  ),
});

export const challengerNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await challengerAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "challenger" }),
    ],
  };
};
