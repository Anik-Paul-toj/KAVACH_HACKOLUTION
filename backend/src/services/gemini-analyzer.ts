import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PrivacyAnalysisResult {
  summary: string;
  safety: 'SAFE' | 'RISKY' | 'UNSAFE';
  score: number;
  risks: string[];
  positiveFeatures: string[];
}

export class GeminiPrivacyAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzePrivacyPolicy(policyText: string, websiteUrl: string): Promise<PrivacyAnalysisResult> {
    try {
      // Limit policy text to avoid token limits
      const truncatedText = policyText.substring(0, 40000);
      const prompt = this.createAnalysisPrompt(truncatedText, websiteUrl);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseGeminiResponse(text);
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Quota exceeded
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('too many requests')) {
          return this.createQuotaFallback(websiteUrl);
        }
        
        // Content safety or other API errors
        if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
          return this.createSafetyFallback(websiteUrl);
        }
      }
      
      // Generic fallback
      return this.createGenericFallback(websiteUrl);
    }
  }

  private createQuotaFallback(websiteUrl: string): PrivacyAnalysisResult {
    return {
      summary: 'AI analysis temporarily unavailable due to quota limits. Please review the privacy policy manually for data collection and sharing practices.',
      safety: 'RISKY',
      score: 50,
      risks: ['AI analysis unavailable - manual review required'],
      positiveFeatures: []
    };
  }

  private createSafetyFallback(websiteUrl: string): PrivacyAnalysisResult {
    return {
      summary: 'Privacy policy content blocked by safety filters. Manual review recommended to assess data handling and user rights.',
      safety: 'RISKY',
      score: 45,
      risks: ['Content blocked by safety filters', 'Manual review required'],
      positiveFeatures: []
    };
  }

  private createGenericFallback(websiteUrl: string): PrivacyAnalysisResult {
    const domain = new URL(websiteUrl).hostname;
    return {
      summary: `Privacy policy analysis failed for ${domain}. Review manually for data collection, third-party sharing, user rights, and retention policies.`,
      safety: 'RISKY',
      score: 40,
      risks: ['Analysis failed - manual review required'],
      positiveFeatures: []
    };
  }

  private createAnalysisPrompt(policyText: string, websiteUrl: string): string {
    return `
You are a privacy expert analyzing a website's privacy policy. Analyze the following privacy policy and provide a comprehensive assessment.

Website URL: ${websiteUrl}

Privacy Policy Text:
${policyText.substring(0, 40000)}

Provide your analysis in exactly this format:
SAFETY: [SAFE/RISKY/UNSAFE]
SUMMARY: [exactly 30 words analyzing how this privacy policy affects user privacy and data rights]

Safety Guidelines:
- SAFE: Strong privacy protections, clear user rights, minimal data collection, no third-party sharing, GDPR compliant
- RISKY: Some concerning practices, moderate data sharing, unclear consent mechanisms, limited user control
- UNSAFE: Extensive data collection, broad third-party sharing, weak user rights, vague terms, poor data protection

Focus your 30-word summary on:
- Data collection scope and purposes
- Third-party sharing practices  
- User rights and control options
- Data retention and deletion policies
- Consent mechanisms

Example:
SAFETY: RISKY
SUMMARY: Policy allows extensive personal data collection with third-party sharing for advertising. Limited user deletion rights and unclear consent mechanisms reduce privacy protection significantly.

Respond in exactly this format, nothing else.
`;
  }

  private parseGeminiResponse(responseText: string): PrivacyAnalysisResult {
    try {
      // Clean the response text
      const cleanedText = responseText.trim();
      
      // Extract safety rating
      const safetyMatch = cleanedText.match(/SAFETY:\s*(SAFE|RISKY|UNSAFE)/i);
      const safety = safetyMatch ? safetyMatch[1].toUpperCase() as 'SAFE' | 'RISKY' | 'UNSAFE' : 'RISKY';
      
      // Extract summary
      const summaryMatch = cleanedText.match(/SUMMARY:\s*(.+)/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : cleanedText;
      
      // Calculate score based on safety and content analysis
      const score = this.calculatePrivacyScore(safety, summary, cleanedText);
      
      // Extract risks and positive features from content
      const { risks, positiveFeatures } = this.extractFeaturesFromContent(summary, cleanedText);
      
      return {
        summary: summary,
        safety: safety,
        score: score,
        risks: risks,
        positiveFeatures: positiveFeatures
      };
    } catch (error) {
      // Return production-ready fallback for parsing errors
      return {
        summary: 'Privacy policy analysis completed with limited accuracy. Manual review recommended for comprehensive assessment of data practices.',
        safety: 'RISKY',
        score: 50,
        risks: ['Limited analysis accuracy'],
        positiveFeatures: []
      };
    }
  }

  private calculatePrivacyScore(safety: 'SAFE' | 'RISKY' | 'UNSAFE', summary: string, fullText: string): number {
    let baseScore = 100;
    
    // Base score adjustment by safety level
    switch (safety) {
      case 'SAFE':
        baseScore = 85;
        break;
      case 'RISKY':
        baseScore = 55;
        break;
      case 'UNSAFE':
        baseScore = 25;
        break;
    }
    
    // Analyze content for specific risks and benefits
    const content = (summary + ' ' + fullText).toLowerCase();
    
    // Negative indicators (reduce score)
    const negativeIndicators = [
      'third.?party sharing', 'sells?.{0,10}data', 'unlimited.?retention',
      'no.?opt.?out', 'vague.?terms', 'extensive.?collection',
      'unclear.?consent', 'weak.?user.?rights', 'broad.?sharing'
    ];
    
    // Positive indicators (increase score)
    const positiveIndicators = [
      'gdpr.?compliant', 'user.?control', 'opt.?out', 'data.?deletion',
      'minimal.?collection', 'clear.?consent', 'transparent',
      'user.?rights', 'privacy.?by.?design'
    ];
    
    // Apply penalties for negative indicators
    negativeIndicators.forEach(indicator => {
      if (new RegExp(indicator, 'i').test(content)) {
        baseScore -= 8;
      }
    });
    
    // Apply bonuses for positive indicators
    positiveIndicators.forEach(indicator => {
      if (new RegExp(indicator, 'i').test(content)) {
        baseScore += 5;
      }
    });
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  private extractFeaturesFromContent(summary: string, fullText: string): { risks: string[], positiveFeatures: string[] } {
    const content = (summary + ' ' + fullText).toLowerCase();
    const risks: string[] = [];
    const positiveFeatures: string[] = [];
    
    // Risk detection patterns
    const riskPatterns = [
      { pattern: /third.?party.{0,20}shar/i, text: 'Data shared with third parties' },
      { pattern: /sell.{0,10}(personal.)?data/i, text: 'Personal data may be sold' },
      { pattern: /unlimited.?retention/i, text: 'Unlimited data retention' },
      { pattern: /no.?opt.?out/i, text: 'No opt-out options available' },
      { pattern: /vague.{0,10}terms/i, text: 'Vague or unclear terms' },
      { pattern: /extensive.?collection/i, text: 'Extensive data collection' },
      { pattern: /unclear.?consent/i, text: 'Unclear consent mechanisms' }
    ];
    
    // Positive feature detection patterns
    const positivePatterns = [
      { pattern: /gdpr.?compliant/i, text: 'GDPR compliant' },
      { pattern: /user.?control/i, text: 'Strong user control over data' },
      { pattern: /data.?deletion/i, text: 'Data deletion rights provided' },
      { pattern: /minimal.?collection/i, text: 'Minimal data collection practice' },
      { pattern: /transparent/i, text: 'Transparent privacy practices' },
      { pattern: /privacy.?by.?design/i, text: 'Privacy by design approach' }
    ];
    
    // Extract risks
    riskPatterns.forEach(({ pattern, text }) => {
      if (pattern.test(content) && risks.length < 5) {
        risks.push(text);
      }
    });
    
    // Extract positive features
    positivePatterns.forEach(({ pattern, text }) => {
      if (pattern.test(content) && positiveFeatures.length < 5) {
        positiveFeatures.push(text);
      }
    });
    
    return { risks, positiveFeatures };
  }
}
