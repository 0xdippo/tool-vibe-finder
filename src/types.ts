export type DomainMode = "shows" | "recipes" | "stories";

export type IntentType =
  | "preference_input"
  | "show_recommendation"
  | "recipe_recommendation"
  | "ingredient_recipe"
  | "story_generation"
  | "feedback_positive"
  | "feedback_negative"
  | "feedback_refinement"
  | "reset_profile"
  | "unsupported";

export type FeedbackMode = "free_text" | "chips" | "both";

export type WizardStepId =
  | "feature_shows"
  | "feature_recipes"
  | "feature_stories"
  | "tmdb_enabled"
  | "tmdb_token"
  | "tmdb_language"
  | "watchmode_enabled"
  | "watchmode_key"
  | "recipe_web_search"
  | "recipe_sites"
  | "story_length"
  | "story_tone"
  | "feedback_mode";

export interface FeatureToggles {
  shows: boolean;
  recipes: boolean;
  stories: boolean;
}

export interface EnabledProviders {
  tmdb: boolean;
  watchmode: boolean;
  webSearch: boolean;
}

export interface ProviderSettings {
  tmdb: {
    enabled: boolean;
    token?: string;
    metadataLanguage: string;
    lastValidatedAt?: string;
  };
  watchmode: {
    enabled: boolean;
    apiKey?: string;
    lastValidatedAt?: string;
  };
  recipes: {
    webSearch: boolean;
    preferredSites: string[];
  };
}

export interface GlobalPreferences {
  language_preference: string;
  enabled_features: FeatureToggles;
  enabled_providers: EnabledProviders;
  feedback_mode: FeedbackMode;
  hard_memory: string[];
  soft_memory: string[];
  providers: ProviderSettings;
}

export interface DomainProfile {
  likes: string[];
  dislikes: string[];
  soft_signals: string[];
  recent_feedback: string[];
}

export interface ShowProfile extends DomainProfile {
  metadata_language: string;
}

export interface StoryProfile extends DomainProfile {
  tone: string[];
  target_words: number;
}

export interface RecipeProfile extends DomainProfile {
  ingredient_bans: string[];
  dietary_constraints: string[];
  preferred_sites: string[];
}

export interface FeedbackEntry {
  createdAt: string;
  mode: DomainMode | "system";
  feedback: string;
  sentiment: "positive" | "negative" | "refine";
}

export interface WizardHistoryEntry {
  stepId: WizardStepId;
  value: string | boolean | string[];
  skipped?: boolean;
  at: string;
}

export interface WizardState {
  completed: boolean;
  history: WizardHistoryEntry[];
}

export interface SessionContext {
  last_mode?: DomainMode;
  last_query?: string;
  last_recommendations?: string[];
}

export interface VibeProfile {
  global_preferences: GlobalPreferences;
  shows: ShowProfile;
  stories: StoryProfile;
  recipes: RecipeProfile;
  feedback_history: FeedbackEntry[];
  wizard: WizardState;
  session_context: SessionContext;
}

export interface WizardOption {
  label: string;
  value: string;
}

export interface WizardStep {
  id: WizardStepId;
  title: string;
  question: string;
  kind: "boolean" | "text" | "choice" | "list";
  options?: WizardOption[];
  placeholder?: string;
  helperText?: string;
  allowSkip: boolean;
  progress: number;
}

export interface WizardAnswerInput {
  stepId: WizardStepId;
  value?: string | boolean | string[];
  skipped?: boolean;
}

export interface ProviderValidationResult {
  valid: boolean;
  message: string;
}

export interface AppConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  port: number;
  ui: {
    path: string;
    entry: string;
  };
  storage: {
    profile: string;
    recommendations: string;
    stories: string;
    feedback: string;
  };
  features: DomainMode[];
  providers: {
    shows: string[];
    recipes: string[];
  };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface ShowCandidate {
  id: string;
  title: string;
  description: string;
  genres: string[];
  year?: number;
  language?: string;
  source: "tmdb" | "watchmode" | "web";
  url?: string;
  availability?: string[];
  score?: number;
  reason?: string;
}

export interface RecipeCandidate {
  id: string;
  title: string;
  description: string;
  source: "web" | "generated";
  url?: string;
  site?: string;
  ingredientsHint: string[];
  score?: number;
  reason?: string;
}

export interface ResultCard {
  title: string;
  subtitle: string;
  url?: string;
  caption?: string;
}

export interface ChatResponse {
  mode: DomainMode | "system";
  reply: string;
  chips: string[];
  cards: ResultCard[];
  memoryNote?: string;
  rateLimited?: boolean;
}

export interface ClassifiedIntent {
  intent: IntentType;
  mode?: DomainMode;
  confidence: number;
  query: string;
  extractedItems: string[];
  reasons: string[];
}

export interface LlmConfig {
  provider: "openai" | "ollama";
  model: string;
  baseUrl: string;
  apiKey?: string;
  source: string;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmTextOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TasteUpdate {
  memoryNote?: string;
  mode?: DomainMode;
}
