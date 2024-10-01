import type { RunnableConfig } from "@langchain/core/runnables";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { END, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { getRelatedArticlesFromGFG,getRelatedArticlesFromWikipedia,getRelatedVideosFromYouTube, highlightText, fetchOfficialSolution, fetchSimilarProblems, leetcodeQuestionTag } from "./tools";
import { START, StateGraph } from "@langchain/langgraph";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });


const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // The agent node that last performed work
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
});

const members = ["webscraper", "hint_provider","challenger","socratic_solution","alternate_solution"] as const;

const systemPrompt =
  "You are a supervisor tasked with managing a conversation between the" +
  " following workers: {members}. Given the following user request," +
  " respond with the worker to act next. Each worker will perform a" +
  " task and respond with their results and status. When finished," +
  " respond with FINISH.";
const options = [END, ...members];

// Define the routing function
const routingTool = {
  name: "route",
  description: "Select the next role.",
  schema: z.object({
    next: z.enum([END, ...members]),
  }),
};

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    systemPrompt +
      "\nGiven the conversation above, who should act next?" +
      " Or should we FINISH? Select one of: {options}",
  ],
  new MessagesPlaceholder("messages"),
]);


const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
apiKey: process.env.EXTENSION_PUBLIC_OPENAI_API_KEY,
});
// You are a helpful Data Structures and Algorithms teacher. Your job is to recommend the user with links or references from either geeksforgeeks, wikipedia or youtube, and nowhere else. You always try to search for the relevant information, ignoring any previous memory. Do not recommend any information before searching it. Always output the response in markdown format.
const webscraperAgent = createReactAgent({
  llm,
  tools: [getRelatedArticlesFromGFG,getRelatedArticlesFromWikipedia,getRelatedVideosFromYouTube],
  messageModifier: new SystemMessage("You are a web researcher. You may use the geekforGeeks, Wikipedia, YouTube search engine to search the web for and provide user with relevant information along with the reference links.")
})

const webscraperNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await webscraperAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "webscraper" }),
    ],
  };
};

const hintProviderAgent = createReactAgent({
  llm,
  tools: [highlightText, fetchOfficialSolution],
  messageModifier: new SystemMessage("You are a hint provider. You are provided with the problem statement and the user's approach to the problem. You need to provide the user with a hint to help them solve the problem. You can use the highlightText tool to highlight the relevant part of the problem statement. Else you can use the fetchOfficialSolution tool to fetch the official solution of the problem and guide the user to the correct solution.")
})

const hintProviderNode = async (
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

const challengerAgent = createReactAgent({
  llm,
  tools: [fetchSimilarProblems],
  messageModifier: new SystemMessage("You are a provided with a problem's titleSlug. Incase you are not provided with the user's code and just the problem you can choose to either suggest new testcases or suggest similar problems to the user. In case of testcases, you don't just provide the test case to the user but do this while guiding them to think about the problem through the test case themselves. Do not give anything additional apart from the test case and the reasoning behind it. While in case of similar problems, you can use the leetcodeQuestionTag tool to find similar problems and suggest the user to solve them.")
})

const challengerNode = async (
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

const alternateSolutionAgent = createReactAgent({
  llm,
  tools: [leetcodeQuestionTag],
  messageModifier: new SystemMessage("You are a provided with a problem's titleSlug and the user's code. Access the titleSlug and use the leetcodeQuestionTag tool which gives all the tags associated with the problem.  You will check if the solution aligns with one of the problem's tags by calling the 'leetcodeQuestionTag' function.If correct, suggest an alternate solution using a different tag from the fetched tags.")
})

const alternateSolutionNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await alternateSolutionAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "alternate_solution" }), 
    ],
  };
};

const socraticSolutionAgent = createReactAgent({
  llm,
  tools: [],
  messageModifier: new SystemMessage(`You are an AI-powered teaching assistant who excels in teaching Data Structures and Algorithms, focusing on helping students learn using the Socratic method. Your role is to guide students by asking probing, thought-provoking questions, rather than directly providing answers. Lead the student to discover the solution through a series of carefully chosen questions. Help the student reflect on their approach, encouraging critical thinking and problem-solving skills.

Your domain is restricted to topics in Data Structures and Algorithms, particularly Sorting Algorithms, though you may generalize to broader algorithmic concepts when necessary. The assistant should provide concise, to-the-point responses. Avoid giving long or overly detailed explanations unless the student specifically requests more information or clarifications.

Hints should only be given if the student explicitly asks for help or if they begin to approach the problem incorrectly. If the student is on the right path, continue to guide them with questions that help them think critically about their approach and make discoveries independently.

For example, when a test case times out, don't immediately tell the student that it was due to large input size. Start by asking, 'What differences do you notice between the test case that timed out and the ones that passed?' Only if the student requests help or struggles to identify the issue should you offer a hint, guiding them toward the conclusion that larger input sizes are causing inefficiencies.

Your goal is not to solve the problem for the student but to help them understand it deeply. Provide questions and feedback that are short, clear, and focused, adjusting your approach based on the student's progress. Tailor your guidance to encourage independent learning and discovery.`)
})

const socraticSolutionNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await socraticSolutionAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "socratic_solution" }),  
    ],
  };
};

async function main() {
  const formattedPrompt = await prompt.partial({
    options: options.join(", "),
    members: members.join(", "),
  });

  const supervisorChain = formattedPrompt
    .pipe(
      llm.bindTools([routingTool], {
        tool_choice: "route",
      })
    )
    .pipe(new JsonOutputToolsParser<AIMessage>())
    .pipe((x: any) => x[0].args);

    const workflow = new StateGraph(AgentState)
    .addNode("webscraper", webscraperNode)
    .addNode("hint_provider", hintProviderNode)
    .addNode("challenger", challengerNode)
    .addNode("socratic_solution", socraticSolutionNode)
    .addNode("alternate_solution", alternateSolutionNode)
    .addNode("supervisor", supervisorChain);
    
    members.forEach((member) => {
      workflow.addEdge(member, "supervisor");
    });
    
    workflow.addConditionalEdges(
      "supervisor",
      (x: typeof AgentState.State) => x.next,
    );
    
    workflow.addEdge(START, "supervisor");
    
    const graph = workflow.compile();

    let streamResults = graph.stream(
      {
        messages: [
          new HumanMessage({
            content: "Two Sum Using hashmap with just providing the hints and not the solution",
          }),
        ],
      },
      { recursionLimit: 10 },
    );
    
    for await (const output of await streamResults) {
      if (!output?.__end__) {
        console.log(output);
        console.log("----");
      }
    }
}
main();