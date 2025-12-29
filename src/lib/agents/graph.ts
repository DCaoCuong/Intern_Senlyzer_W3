import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./state";
import { scribeNode, icdNode, expertNode } from "./nodes";

// Define the State Channel Reducers
const graphState = {
    transcript: {
        value: (x: string, y: string) => y ?? x,
        default: () => ""
    },
    soap: {
        value: (x: any, y: any) => y ? { ...x, ...y } : x,
        default: () => ({ subjective: "", objective: "", assessment: "", plan: "" }),
    },
    icdCodes: {
        value: (x: string[], y: string[]) => y ?? x,
        default: () => []
    },
    medicalAdvice: {
        value: (x: string, y: string) => y ?? x,
        default: () => ""
    },
    references: {
        value: (x: string[], y: string[]) => y ?? x,
        default: () => []
    },
};

// Create the Graph
const workflow = new StateGraph<AgentState>({
    channels: graphState
})
    .addNode("scribe", scribeNode)
    .addNode("icd", icdNode)
    .addNode("expert", expertNode);

// Define Flow
// START -> scribe
workflow.addEdge(START, "scribe");

// scribe -> icd & expert
workflow.addEdge("scribe", "icd");
workflow.addEdge("scribe", "expert");

// End
workflow.addEdge("icd", END);
workflow.addEdge("expert", END);

// Compile
export const medicalAgentGraph = workflow.compile();
