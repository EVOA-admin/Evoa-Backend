import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestorAiLog } from './entities/investor-ai-log.entity';
import { Startup } from '../startups/entities/startup.entity';
import { RedisService } from '../config/redis.config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiAnalysisResponse {
    summary: string;
    market: string;
    risks: string[];
    questions_to_ask: string[];
}

@Injectable()
export class AiService {
    constructor(
        @InjectRepository(InvestorAiLog)
        private readonly aiLogRepository: Repository<InvestorAiLog>,
        @InjectRepository(Startup)
        private readonly startupRepository: Repository<Startup>,
        @Inject('REDIS_CLIENT')
        private readonly redisClient: any,
    ) {
        this.genAI = new GoogleGenerativeAI("AIzaSyBIp7j30P_JWR2nS8tsfclYgaZ38QVWC2k");
    }

    private redisService = new RedisService(this.redisClient);
    private genAI: GoogleGenerativeAI;

    /**
     * Ask Gemini a specific analytical question about a startup based on context
     */
    async analyzeStartup(startupId: string, investorId: string, question: string): Promise<{ answer: string }> {
        const startup = await this.startupRepository.findOne({
            where: { id: startupId },
            relations: ['founder'],
        });

        if (!startup) {
            throw new NotFoundException('Startup not found');
        }

        const prompt = `
            You are an expert startup investment analyst, embedded in an app called EVOA.
            An investor is asking you the following question about a startup named "${startup.name}".
            
            Here is the factual context available from their profile:
            - Name: ${startup.name}
            - Industry: ${startup.industry}
            - Stage: ${startup.stage}
            - Brief Description: ${startup.description}
            - Raising Amount: $${startup.raisingAmount}
            - Equity Offered: ${startup.equityPercentage}%
            - Current Revenue: $${startup.revenue}
            - Pitch Deck Link: ${startup.pitchDeckUrl || 'Not provided'}
            
            Investor's Question: "${question}"
            
            Rules for your response:
            1. Be crisp, concise, and structured. Use short paragraphs or bullet points if helpful.
            2. Do not include introductory fluff (like "Here is the summary...").
            3. Answer directly based ONLY on the provided context. If the context does not contain the necessary information (e.g. they ask about risks but the description is vague), deduce intelligently using your general industry knowledge, but clarify this is an assumption based on the industry.
            4. Keep the tone professional, analytical, and investor-focused.
        `;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Log the custom question interaction
            const log = this.aiLogRepository.create({
                startupId,
                investorId,
                actionType: 'prompt',
                metadata: { question, prompt },
                aiResponse: { custom_answer: responseText },
            });
            await this.aiLogRepository.save(log);

            return { answer: responseText };
        } catch (error) {
            console.error("Gemini API Error:", error);
            return { answer: "I apologize, but I am currently unable to analyze this startup's data. Please check back later." };
        }
    }

    /**
     * Get AI analysis for a startup
     * Caches results to avoid repeated LLM calls
     */
    async getInvestorAnalysis(startupId: string, investorId: string): Promise<AiAnalysisResponse> {
        // Check cache first
        const cacheKey = `ai:analysis:${startupId}`;
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            // Log the access
            await this.logAiAccess(startupId, investorId, JSON.parse(cached));
            return JSON.parse(cached);
        }

        // Get startup details
        const startup = await this.startupRepository.findOne({
            where: { id: startupId },
            relations: ['founder', 'reels'],
        });

        if (!startup) {
            throw new NotFoundException('Startup not found');
        }

        // Generate AI analysis
        const analysis = await this.generateAiAnalysis(startup);

        // Cache indefinitely (invalidate on startup update)
        await this.redisService.set(cacheKey, JSON.stringify(analysis));

        // Log the access
        await this.logAiAccess(startupId, investorId, analysis);

        return analysis;
    }

    /**
     * Generate AI analysis using LLM
     * This is a placeholder - integrate with OpenAI/Anthropic
     */
    private async generateAiAnalysis(startup: Startup): Promise<AiAnalysisResponse> {
        // TODO: Integrate with actual LLM API (OpenAI/Anthropic)
        // For now, return mock data

        const prompt = `
      Analyze this startup for an investor:
      Name: ${startup.name}
      Description: ${startup.description}
      Industry: ${startup.industry}
      Stage: ${startup.stage}
      Raising: $${startup.raisingAmount}
      Revenue: $${startup.revenue}
      
      Provide:
      1. Brief summary
      2. Market analysis
      3. Key risks
      4. Smart questions to ask the founder
    `;

        // Mock response - replace with actual LLM call
        const analysis: AiAnalysisResponse = {
            summary: `${startup.name} is a ${startup.stage} stage ${startup.industry} company raising $${startup.raisingAmount}. ${startup.description}`,
            market: `The ${startup.industry} market is experiencing significant growth. Key trends include digital transformation and increasing demand for innovative solutions.`,
            risks: [
                'Market competition is intense with several established players',
                'Customer acquisition costs may be higher than projected',
                'Regulatory challenges in the industry',
                'Dependency on key partnerships for growth',
            ],
            questions_to_ask: [
                'What is your customer acquisition cost and lifetime value?',
                'How do you differentiate from competitors?',
                'What are your key metrics and growth trajectory?',
                'What will you use this funding for specifically?',
                'What are the biggest risks you see in your business?',
            ],
        };

        /* 
        // Example OpenAI integration (uncomment when ready):
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });
        
        // Parse and structure the response
        const analysis = parseAiResponse(completion.choices[0].message.content);
        */

        return analysis;
    }

    /**
     * Log AI access for analytics
     */
    private async logAiAccess(startupId: string, investorId: string, response: AiAnalysisResponse) {
        const log = this.aiLogRepository.create({
            startupId,
            investorId,
            aiResponse: response,
        });
        await this.aiLogRepository.save(log);
    }

    /**
     * Invalidate AI cache for a startup (call when startup is updated)
     */
    async invalidateStartupCache(startupId: string) {
        const cacheKey = `ai:analysis:${startupId}`;
        await this.redisService.del(cacheKey);
    }
}
