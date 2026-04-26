/**
 * Curated catalog of AI models exposed in the model-picker menu.
 *
 * Order = order shown to the user.
 *
 * IDs below are verified against Puter's live catalog
 * (GET https://api.puter.com/puterai/chat/models/details). Each entry is
 * either the model's canonical id or one of its aliases — both are accepted
 * by `puter.ai.chat({ model: ... })`. The full list of real IDs can also
 * be fetched at runtime via `puter.ai.listModels()`.
 */
export const MODELS = [
  { id: "gpt-5-nano",                     label: "GPT-5 nano (быстро)" },
  { id: "gpt-5",                          label: "GPT-5 (качество)" },
  { id: "claude-sonnet-4-5",              label: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5",               label: "Claude Haiku" },
  { id: "gemini-2.5-pro",                 label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash",               label: "Gemini 2.5 Flash" },
  { id: "grok-4",                         label: "Grok 4" },
  { id: "deepseek-chat",                  label: "DeepSeek V3.1" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "mistral-large-latest",           label: "Mistral Large" },
];

export function findModel(id) {
  return MODELS.find((m) => m.id === id);
}

export function isValidModelId(id) {
  return findModel(id) !== undefined;
}
