import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { leetcodeQuestionTag } from "./tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { type AgentState } from "../script";
import type { RunnableConfig } from "@langchain/core/runnables";
import { llm } from "../llm";

const alternateSolutionAgent = createReactAgent({
  llm,
  tools: [leetcodeQuestionTag],
  messageModifier: new SystemMessage(
    "You are a provided with a problem's titleSlug and the user's code. Access the titleSlug and use the leetcodeQuestionTag tool which gives all the tags associated with the problem.  You will check if the solution aligns with one of the problem's tags by calling the 'leetcodeQuestionTag' function.If correct, suggest an alternate solution using a different tag from the fetched tags.",
  ),
});

export const alternateSolutionNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await alternateSolutionAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({
        content: lastMessage.content,
        name: "alternate_solution",
      }),
    ],
  };
};
