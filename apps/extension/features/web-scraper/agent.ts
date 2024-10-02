import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  getRelatedArticlesFromGFG,
  getRelatedArticlesFromWikipedia,
  getRelatedVideosFromYouTube,
} from "./tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { type AgentState } from "../script";
import { llm } from "../llm";

const webscraperAgent = createReactAgent({
  llm,
  tools: [
    getRelatedArticlesFromGFG,
    getRelatedArticlesFromWikipedia,
    getRelatedVideosFromYouTube,
  ],
  messageModifier: new SystemMessage(
    "You are a web researcher. You may use the geekforGeeks, Wikipedia, YouTube search engine to search the web for and provide user with relevant information along with the reference links.",
  ),
});

export const webscraperNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await webscraperAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "web_scraper" }),
    ],
  };
};
