import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';
dotenv.config();

interface SpamAnalysisResult {
  isSpam: boolean;
  spamWords: string[];
  replacements: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
  rewrittenMessage: string;
  confidence: number;
}

interface MessageVariation {
  originalMessage: string;
  variation: string;
  variationIndex: number;
}

class AIService {
  private openai: OpenAI;
  private llm: ChatOpenAI;
  private spamDetectionPrompt!: PromptTemplate;
  private rewritingPrompt!: PromptTemplate;
  private variationPrompt!: PromptTemplate;
  private cache: Map<string, any> = new Map(); // Simple in-memory cache

  // WhatsApp Business Policy prohibited words and phrases
  private readonly SPAM_INDICATORS = [
    'urgent', 'limited time', 'act now', 'don\'t miss out', 'exclusive offer',
    'click here', 'buy now', 'free money', 'guaranteed', 'no obligation',
    'risk-free', 'instant approval', 'make money', 'earn cash', 'work from home',
    'lose weight', 'miracle cure', 'secret formula', 'hidden secret',
    'what are you waiting for', 'grab the offer', 'hurry up', 'last chance'
  ];

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 10 second timeout
      maxRetries: 2,
    });

    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo', // Faster model for better performance
      temperature: 0.3, // Lower temperature for more consistent results
      maxTokens: 500, // Limit response length for speed
      timeout: 8000, // 8 second timeout
    });

    this.initializePrompts();
  }

  private initializePrompts(): void {
    // Spam detection prompt
    this.spamDetectionPrompt = new PromptTemplate({
      template: `
You are an expert in WhatsApp Business Policy compliance. Analyze the following message for spam indicators and policy violations.

Message: "{message}"
Category: "{category}"

Your task:
1. Identify any words/phrases that might trigger WhatsApp's spam filters
2. Suggest professional replacements for problematic content
3. Rewrite the message to be compliant while maintaining the original intent

Spam indicators to watch for:
- Urgency tactics ("urgent", "limited time", "act now")
- Promotional language ("exclusive offer", "don't miss out")
- Call-to-action phrases ("click here", "buy now")
- False claims ("guaranteed", "risk-free")
- Misleading content

Respond in JSON format:
{{
  "isSpam": boolean,
  "spamWords": ["word1", "word2"],
  "replacements": [
    {{
      "original": "problematic word",
      "replacement": "professional alternative",
      "reason": "why this change is needed"
    }}
  ],
  "rewrittenMessage": "professional version of the message",
  "confidence": 0.85
}}

Make the rewritten message sound natural, professional, and human-like while preserving the core message and call-to-action.
`,
      inputVariables: ['message', 'category'],
    });

    // Message rewriting prompt
    this.rewritingPrompt = new PromptTemplate({
      template: `
Rewrite the following message to be professional, engaging, and compliant with WhatsApp Business Policy.

Original Message: "{originalMessage}"
Category: "{category}"
Detected Issues: "{issues}"

Requirements:
1. Maintain the original intent and call-to-action
2. Use professional, conversational tone
3. Avoid spammy language and urgency tactics
4. Make it sound like a genuine business message
5. Keep it under 200 words
6. Use proper grammar and punctuation

Output only the rewritten message, nothing else.
`,
      inputVariables: ['originalMessage', 'category', 'issues'],
    });

    // Message variation prompt
    this.variationPrompt = new PromptTemplate({
      template: `
Create a slight variation of this message for bulk messaging. The variation should be semantically equivalent but use different wording to avoid detection.

Original Message: "{message}"
Variation Number: {variationIndex}

Requirements:
1. Keep the same meaning and intent
2. Use different words and sentence structure
3. Maintain professional tone
4. Keep similar length
5. Preserve any important details (numbers, names, etc.)

Output only the variation, nothing else.
`,
      inputVariables: ['message', 'variationIndex'],
    });
  }

  async analyzeMessage(message: string, category: string, settings?: any): Promise<SpamAnalysisResult> {
    try {
      // Check cache first
      const cacheKey = `analysis_${Buffer.from(message).toString('base64')}_${category}`;
      if (this.cache.has(cacheKey)) {
        console.log('Using cached AI analysis result');
        return this.cache.get(cacheKey);
      }

      // First, do a quick local check for obvious spam indicators
      const localSpamWords = this.detectSpamWordsLocally(message);
      
      // Use OpenAI for comprehensive analysis
      const prompt = await this.spamDetectionPrompt.format({
        message,
        category,
      });

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      let analysis: SpamAnalysisResult;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        analysis = {
          isSpam: localSpamWords.length > 0,
          spamWords: localSpamWords,
          replacements: [],
          rewrittenMessage: message,
          confidence: 0.5,
        };
      }

      // Merge local detection with AI analysis
      analysis.spamWords = [...new Set([...analysis.spamWords, ...localSpamWords])];
      analysis.isSpam = analysis.spamWords.length > 0 || analysis.confidence > 0.7;

      // Cache the result
      this.cache.set(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error in AI analysis:', error);
      
      // Fallback to local detection
      const spamWords = this.detectSpamWordsLocally(message);
      return {
        isSpam: spamWords.length > 0,
        spamWords,
        replacements: [],
        rewrittenMessage: message,
        confidence: spamWords.length > 0 ? 0.8 : 0.2,
      };
    }
  }

  private detectSpamWordsLocally(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    return this.SPAM_INDICATORS.filter(indicator => 
      lowerMessage.includes(indicator.toLowerCase())
    );
  }

  async rewriteMessage(originalMessage: string, category: string, issues: string): Promise<string> {
    try {
      const prompt = await this.rewritingPrompt.format({
        originalMessage,
        category,
        issues,
      });

      const response = await this.llm.invoke(prompt);
      return response.content as string;
    } catch (error) {
      console.error('Error rewriting message:', error);
      return originalMessage; // Fallback to original
    }
  }

  async generateMessageVariations(message: string, count: number): Promise<MessageVariation[]> {
    const variations: MessageVariation[] = [];
    
    try {
      for (let i = 1; i <= count; i++) {
        const prompt = await this.variationPrompt.format({
          message,
          variationIndex: i,
        });

        const response = await this.llm.invoke(prompt);
        const variation = response.content as string;

        variations.push({
          originalMessage: message,
          variation: variation.trim(),
          variationIndex: i,
        });

        // Add small delay to avoid rate limiting
        if (i < count) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error generating variations:', error);
      // Fallback: return original message for all variations
      for (let i = 1; i <= count; i++) {
        variations.push({
          originalMessage: message,
          variation: message,
          variationIndex: i,
        });
      }
    }

    return variations;
  }

  async generateUniqueMessageForContact(
    baseMessage: string, 
    contactName: string, 
    variationIndex: number
  ): Promise<string> {
    try {
      const prompt = `Create a personalized version of this message for ${contactName}.

Base Message: "${baseMessage}"
Variation Style: ${variationIndex}

Requirements:
1. Include the contact's name naturally
2. Keep the same core message and call-to-action
3. Make it sound personal and genuine
4. Use professional, friendly tone
5. Keep under 200 words

Output only the personalized message.`;

      const response = await this.llm.invoke(prompt);
      return response.content as string;
    } catch (error) {
      console.error('Error generating personalized message:', error);
      // Fallback: simple personalization
      return `Hi ${contactName}, ${baseMessage}`;
    }
  }
}

export default new AIService();
