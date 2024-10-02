import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { type AgentState } from "../script";
import { type RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import { fetchOfficialSolution, highlightText } from "./tools";
import { llm } from "../llm";

const hintProviderAgent = createReactAgent({
  llm,
  tools: [highlightText, fetchOfficialSolution],
  messageModifier: new SystemMessage(
    "You are a hint provider. You are provided with the problem statement and the user's approach to the problem. You need to provide the user with a hint to help them solve the problem. You can use the highlightText tool to highlight the relevant part of the problem statement. Else you can use the fetchOfficialSolution tool to fetch the official solution of the problem and guide the user to the correct solution.",
  ),
});

export const hintProviderNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await hintProviderAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "hint_provider" }),
    ],
  };
};

// const nodeFn3 = async (
//   _state: typeof AgentState.State,
//   config?: RunnableConfig,
// ) => {
//   // If you need to nest deeper, remember to pass `_config` when invoking
//   const nestedFn = RunnableLambda.from(
//     async (input: string, _config?: RunnableConfig) => {
//       return new HumanMessage(`Hello from ${input}!`);
//     },
//   ).withConfig({ runName: "nested" });
//   const responseMessage = await nestedFn.invoke("a nested function", config);
//   return { messages: [responseMessage] };
// };
