import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InvestorAiLog } from './entities/investor-ai-log.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { RedisService } from '../config/redis.config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiAnalysisResponse {
    summary: string;
    market: string;
    risks: string[];
    questions_to_ask: string[];
}

export interface AiAskResponse {
    answer: string;
    source: 'Startup Data' | 'Platform Analytics' | 'Not Available';
    canAskFounder: boolean;
}

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private redisService: RedisService;

    constructor(
        @InjectRepository(InvestorAiLog)
        private readonly aiLogRepository: Repository<InvestorAiLog>,
        @InjectRepository(Startup)
        private readonly startupRepository: Repository<Startup>,
        @InjectRepository(Reel)
        private readonly reelRepository: Repository<Reel>,
        @Inject('REDIS_CLIENT')
        private readonly redisClient: any,
        private readonly configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey || apiKey === 'your-new-gemini-api-key-here') {
            throw new Error(
                '[AiService] GEMINI_API_KEY is not set in .env. ' +
                'Get a new key from https://aistudio.google.com/app/apikey and add it to .env as GEMINI_API_KEY=...'
            );
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.redisService = new RedisService(this.redisClient);
    }

    // ─── Build full startup context ────────────────────────────────────────────
    async getStartupContext(startupId: string) {
        const startup = await this.startupRepository.findOne({
            where: { id: startupId },
            relations: ['founder'],
        });
        if (!startup) throw new NotFoundException('Startup not found');

        // Platform analytics — sum across all reels for this startup
        const reels = await this.reelRepository.find({ where: { startupId } });
        const analytics = reels.reduce(
            (acc, r) => ({
                totalViews: acc.totalViews + (r.viewCount || 0),
                totalLikes: acc.totalLikes + (r.likeCount || 0),
                totalComments: acc.totalComments + (r.commentCount || 0),
                totalShares: acc.totalShares + (r.shareCount || 0),
                reelCount: acc.reelCount + 1,
            }),
            { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, reelCount: 0 },
        );

        return { startup, analytics };
    }

    // ─── Format helpers ────────────────────────────────────────────────────────
    private fmt(val: any, fallback = 'Not provided'): string {
        if (val === null || val === undefined || val === '' || val === 0) return fallback;
        if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : fallback;
        return String(val);
    }

    private fmtMoney(val: any): string {
        if (!val) return 'Not provided';
        const num = parseFloat(String(val));
        if (isNaN(num)) return 'Not provided';
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
        return `₹${num.toLocaleString()}`;
    }

    // ─── Main Q&A endpoint ────────────────────────────────────────────────────
    async analyzeStartup(startupId: string, investorId: string, question: string): Promise<AiAskResponse> {
        const { startup, analytics } = await this.getStartupContext(startupId);

        // Build structured context block
        const s = startup;
        const foundersText = Array.isArray(s.founders) && s.founders.length > 0
            ? s.founders.map(f => `${f.name} (${f.role})`).join(', ')
            : 'Not provided';
        const teamText = Array.isArray(s.teamMembers) && s.teamMembers.length > 0
            ? s.teamMembers.map(m => `${m.name} – ${m.role}`).join(', ')
            : 'Not provided';
        const locationText = s.location
            ? [s.location.city, s.location.state, s.location.country].filter(Boolean).join(', ')
            : 'Not provided';
        const socialText = s.socialLinks
            ? Object.entries(s.socialLinks).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | ')
            : 'Not provided';

        const startupContext = `
STARTUP PROFILE (Verified Founder-Submitted Data):
- Name: ${this.fmt(s.name)}
- Tagline: ${this.fmt(s.tagline)}
- Description / Problem+Solution: ${this.fmt(s.description)}
- Industry: ${this.fmt(s.industry)}
- Industries/Sectors: ${this.fmt(s.industries)}
- Stage: ${this.fmt(s.stage)}
- Category Tags: ${this.fmt(s.categoryTags)}
- Geography / Location: ${locationText}
- Website: ${this.fmt(s.website)}

TEAM:
- Founders: ${foundersText}
- Team Members: ${teamText}

FINANCIALS & DEAL:
- Raising Amount: ${this.fmtMoney(s.raisingAmount)}
- Equity Offered: ${s.equityPercentage ? `${s.equityPercentage}%` : 'Not provided'}
- Current Revenue: ${this.fmtMoney(s.revenue)}

DOCUMENTS:
- Pitch Deck: ${s.pitchDeckUrl ? 'Available (uploaded by founder)' : 'Not provided'}
- Entity/Verification Type: ${s.verification?.entityType || 'Not provided'}

SOCIAL PRESENCE:
${socialText}

PLATFORM ANALYTICS (Evoa Engagement Data):
- Total Pitch Views: ${analytics.totalViews.toLocaleString()}
- Total Likes/Supports: ${analytics.totalLikes.toLocaleString()}
- Total Comments: ${analytics.totalComments.toLocaleString()}
- Total Shares: ${analytics.totalShares.toLocaleString()}
- Number of Pitch Reels: ${analytics.reelCount}
`;

        const systemPrompt = `
You are an expert startup investment analyst embedded in the EVOA platform. An investor is asking you a question about a specific startup. You must:

1. Answer ONLY from the data provided below. Do NOT invent or assume any metrics, numbers, or claims not present.
2. If the required information is absent from the data, respond: "This information has not been provided by the founder yet." Do NOT guess or extrapolate.
3. Structure your response as:
   a) Direct Answer (1-3 sentences)
   b) Supporting Context (brief bullet points if helpful)
   c) Source: one of — Startup Data | Platform Analytics | Not Available
4. Keep the tone professional, concise, and investor-focused.
5. When citing numbers from Platform Analytics, note they reflect in-app engagement on EVOA.
6. If the answer is "Not Available", set canAskFounder to true in your reasoning.

--- STARTUP DATA ---
${startupContext}
--- END DATA ---

INVESTOR QUESTION: "${question}"

Respond in this JSON format ONLY (no markdown fences):
{
  "answer": "<your answer>",
  "source": "<Startup Data | Platform Analytics | Not Available>",
  "canAskFounder": <true|false>
}
`;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(systemPrompt);
            const raw = result.response.text().trim();

            // Parse JSON from Gemini response (strip any accidental markdown fences)
            const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            let parsed: AiAskResponse;
            try {
                parsed = JSON.parse(jsonStr);
            } catch {
                // Fallback: return raw text with best-guess source
                parsed = {
                    answer: raw,
                    source: 'Startup Data',
                    canAskFounder: false,
                };
            }

            // Ensure valid source value
            const validSources = ['Startup Data', 'Platform Analytics', 'Not Available'];
            if (!validSources.includes(parsed.source)) {
                parsed.source = 'Startup Data';
            }

            // Log the interaction
            await this.aiLogRepository.save(
                this.aiLogRepository.create({
                    startupId,
                    investorId,
                    actionType: 'ask',
                    metadata: { question },
                    aiResponse: parsed,
                }),
            ).catch(() => { /* non-blocking */ });

            return parsed;
        } catch (err) {
            console.error('[AiService] Gemini error:', err?.message || err);
            return {
                answer: 'I was unable to retrieve an answer at this time. Please try again in a moment.',
                source: 'Not Available',
                canAskFounder: true,
            };
        }
    }

    // ─── Cached investor analysis summary (legacy) ─────────────────────────────
    async getInvestorAnalysis(startupId: string, investorId: string): Promise<AiAnalysisResponse> {
        const cacheKey = `ai:analysis:${startupId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            await this.logAiAccess(startupId, investorId, JSON.parse(cached));
            return JSON.parse(cached);
        }

        const { startup } = await this.getStartupContext(startupId);
        const analysis = await this.generateAiAnalysis(startup);
        await this.redisService.set(cacheKey, JSON.stringify(analysis));
        await this.logAiAccess(startupId, investorId, analysis);
        return analysis;
    }

    private async generateAiAnalysis(startup: Startup): Promise<AiAnalysisResponse> {
        const prompt = `
Analyze this startup for an investor. Be concise and professional.
Name: ${startup.name}
Description: ${startup.description}
Industry: ${startup.industry || startup.industries?.join(', ')}
Stage: ${startup.stage}
Raising: ${this.fmtMoney(startup.raisingAmount)}
Revenue: ${this.fmtMoney(startup.revenue)}

Return ONLY a JSON object with keys: summary, market, risks (array of strings), questions_to_ask (array of strings).
No markdown fences.
`;
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            const raw = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            return JSON.parse(raw);
        } catch {
            return {
                summary: `${startup.name} is a ${startup.stage} stage ${startup.industry} company raising ${this.fmtMoney(startup.raisingAmount)}.`,
                market: `The ${startup.industry} market is experiencing significant growth.`,
                risks: ['Market competition', 'Customer acquisition costs', 'Regulatory challenges'],
                questions_to_ask: ['What is your CAC and LTV?', 'How do you differentiate?', 'What is your growth trajectory?'],
            };
        }
    }

    private async logAiAccess(startupId: string, investorId: string, response: AiAnalysisResponse) {
        await this.aiLogRepository.save(
            this.aiLogRepository.create({ startupId, investorId, aiResponse: response }),
        ).catch(() => { });
    }

    async invalidateStartupCache(startupId: string) {
        await this.redisService.del(`ai:analysis:${startupId}`);
    }
}
