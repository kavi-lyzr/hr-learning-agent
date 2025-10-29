/**
 * Agent Configuration for Lyzr L&D Platform
 *
 * This file defines the configuration for all AI agents used in the platform.
 * Agents are versioned and automatically updated when version numbers change.
 */

export const LATEST_TUTOR_AGENT_VERSION = '1.0.1';
export const LATEST_QUIZ_GENERATOR_AGENT_VERSION = '1.0.2'; // Updated to fix correctAnswerIndex
export const LATEST_CONTENT_GENERATOR_AGENT_VERSION = '1.0.1';
export const LATEST_TOOL_VERSION = '1.0.0'; // Version for tutor tools (change to recreate all tools)

/**
 * Lyzr Tutor Agent (Employee-facing)
 *
 * Conversational learning assistant that helps employees with course content.
 * Instructions are passed at inference time via system_prompt_variables.
 */
export const TUTOR_AGENT_CONFIG = {
    agentType: 'tutor',
    name: "Lyzr Learning Tutor",
    description: "An intelligent AI tutor that helps employees learn course content, answer questions, and provide personalized guidance.",
    agent_role: "You are an Expert Learning & Development Tutor. Your mission is to help employees understand course content and achieve their learning goals.",
    agent_instructions: "{{ prompt }}",
    agent_goal: "To provide helpful, accurate, and context-aware assistance to employees as they progress through their learning journey.",
    features: [
        {
            type: "MEMORY",
            config: {
                max_messages_context_count: 10
            },
            priority: 0
        }
    ],
    model: 'gpt-4.1',
    provider_id: 'OpenAI',
    llm_credential_id: 'lyzr_openai',
    temperature: 0.7,
    top_p: 0.9,
    response_format: { "type": "text" },
    managed_agents: []
};

/**
 * Quiz Generator Agent (Admin-facing)
 *
 * Generates assessment questions from lesson content.
 * Instructions are passed at inference time via system_prompt_variables.
 */
export const QUIZ_GENERATOR_AGENT_CONFIG = {
    agentType: 'quiz_generator',
    name: "Quiz Generator Agent",
    description: "An AI agent that generates high-quality assessment questions from lesson content, including multiple-choice questions and explanations.",
    agent_role: "You are an Expert Assessment Designer. Your specialty is creating effective, fair, and comprehensive quiz questions that accurately test learner comprehension.",
    agent_instructions: "{{ prompt }}\n\nIMPORTANT: You MUST use the field name 'correctAnswerIndex' (not 'correctAnswer') in your JSON response.",
    agent_goal: "To generate well-structured quiz questions that effectively assess learner understanding of the lesson content.",
    features: [
        {
            type: "MEMORY",
            config: {
                max_messages_context_count: 5
            },
            priority: 0
        }
    ],
    model: 'gpt-4.1',
    provider_id: 'OpenAI',
    llm_credential_id: 'lyzr_openai',
    temperature: 0.5,
    top_p: 0.9,
    response_format: {
        type: "json_schema",
        json_schema: {
            name: "quiz_generation",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        description: "Array of generated quiz questions",
                        items: {
                            type: "object",
                            properties: {
                                questionText: {
                                    type: "string",
                                    description: "The question text"
                                },
                                options: {
                                    type: "array",
                                    items: { type: "string" },
                                    minItems: 4,
                                    maxItems: 4,
                                    description: "Exactly 4 answer options"
                                },
                                correctAnswerIndex: {
                                    type: "integer",
                                    minimum: 0,
                                    maximum: 3,
                                    description: "Index of the correct answer (0-3)"
                                },
                                explanation: {
                                    type: "string",
                                    description: "Explanation of why the correct answer is right"
                                }
                            },
                            required: ["questionText", "options", "correctAnswerIndex", "explanation"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["questions"],
                additionalProperties: false
            }
        }
    },
    managed_agents: []
};

/**
 * Content Generator Agent (Admin-facing)
 *
 * Generates course articles from topics and learning objectives.
 * Instructions are passed at inference time via system_prompt_variables.
 */
export const CONTENT_GENERATOR_AGENT_CONFIG = {
    agentType: 'content_generator',
    name: "Content Generator Agent",
    description: "An AI agent that creates high-quality educational articles for course lessons based on specified topics and learning objectives.",
    agent_role: "You are an Expert Instructional Designer and Content Writer. Your specialty is creating clear, engaging, and pedagogically sound educational content.",
    agent_instructions: "{{ prompt }}",
    agent_goal: "To generate well-structured, informative, and engaging educational articles that effectively teach the specified topic.",
    features: [
        {
            type: "MEMORY",
            config: {
                max_messages_context_count: 5
            },
            priority: 0
        }
    ],
    model: 'gpt-4.1',
    provider_id: 'OpenAI',
    llm_credential_id: 'lyzr_openai',
    temperature: 0.7,
    top_p: 0.9,
    response_format: { "type": "text" },
    managed_agents: []
};
