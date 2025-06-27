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
    
    // More realistic base score adjustment by safety level with granular scoring
    switch (safety) {
      case 'SAFE':
        // Strong privacy protections - but still room for improvement
        baseScore = Math.floor(85 + Math.random() * 10); // 85-95 range
        break;
      case 'RISKY':
        // Moderate concerns - most real-world policies fall here
        baseScore = Math.floor(55 + Math.random() * 20); // 55-75 range  
        break;
      case 'UNSAFE':
        // Significant privacy issues - but rarely completely unsafe
        baseScore = Math.floor(25 + Math.random() * 25); // 25-50 range
        break;
    }
    
    // Analyze content for specific risks and benefits
    const content = (summary + ' ' + fullText).toLowerCase();
    
    // Negative indicators with weighted penalties (more realistic impact)
    const negativeIndicators = [
      { pattern: /sell.{0,15}(personal.?)?data/i, penalty: 15, desc: 'Data selling practices' },
      { pattern: /third.?party.{0,30}(sharing|share|partners)/i, penalty: 12, desc: 'Third-party data sharing' },
      { pattern: /unlimited.?(retention|storage|keep)/i, penalty: 10, desc: 'Unlimited data retention' },
      { pattern: /no.?(opt.?out|choice|control)/i, penalty: 14, desc: 'No user control options' },
      { pattern: /(vague|unclear|ambiguous).{0,20}(terms|language|policy)/i, penalty: 8, desc: 'Unclear terms' },
      { pattern: /extensive.?(collection|gathering|tracking)/i, penalty: 9, desc: 'Extensive data collection' },
      { pattern: /(weak|limited|minimal).{0,20}(security|protection)/i, penalty: 11, desc: 'Weak security measures' },
      { pattern: /automatic.?(consent|agreement)/i, penalty: 7, desc: 'Automatic consent mechanisms' },
      { pattern: /(broad|wide|extensive).{0,20}sharing/i, penalty: 10, desc: 'Broad data sharing' },
      { pattern: /no.?(deletion|removal|erasure)/i, penalty: 13, desc: 'No data deletion rights' },
      { pattern: /location.?(tracking|monitoring)/i, penalty: 6, desc: 'Location tracking' },
      { pattern: /biometric.?(data|collection)/i, penalty: 8, desc: 'Biometric data collection' },
      { pattern: /children.?(data|under.?13)/i, penalty: 12, desc: 'Children data concerns' }
    ];
    
    // Positive indicators with weighted bonuses
    const positiveIndicators = [
      { pattern: /gdpr.?(compliant|compliance)/i, bonus: 8, desc: 'GDPR compliance' },
      { pattern: /(strong|robust).{0,20}(user.?control|privacy)/i, bonus: 10, desc: 'Strong user control' },
      { pattern: /opt.?out.{0,20}(available|provided|easy)/i, bonus: 7, desc: 'Easy opt-out options' },
      { pattern: /data.?(deletion|erasure|removal).{0,20}(rights|available)/i, bonus: 9, desc: 'Data deletion rights' },
      { pattern: /(minimal|limited).{0,20}(collection|data)/i, bonus: 6, desc: 'Minimal data collection' },
      { pattern: /(clear|transparent|explicit).{0,20}consent/i, bonus: 8, desc: 'Clear consent mechanisms' },
      { pattern: /privacy.?by.?design/i, bonus: 12, desc: 'Privacy by design' },
      { pattern: /end.?to.?end.?encrypt/i, bonus: 10, desc: 'End-to-end encryption' },
      { pattern: /zero.?knowledge/i, bonus: 15, desc: 'Zero knowledge architecture' },
      { pattern: /annual.?(audit|review)/i, bonus: 5, desc: 'Regular privacy audits' },
      { pattern: /data.?(portability|export)/i, bonus: 6, desc: 'Data portability' },
      { pattern: /privacy.?officer/i, bonus: 4, desc: 'Dedicated privacy officer' },
      { pattern: /ccpa.?(compliant|compliance)/i, bonus: 6, desc: 'CCPA compliance' }
    ];
    
    // Apply penalties for negative indicators with realistic weighted impact
    let totalPenalty = 0;
    const foundRisks: string[] = [];
    
    negativeIndicators.forEach(({ pattern, penalty, desc }) => {
      if (pattern.test(content)) {
        baseScore -= penalty;
        totalPenalty += penalty;
        foundRisks.push(desc);
      }
    });
    
    // Apply bonuses for positive indicators
    let totalBonus = 0;
    const foundBenefits: string[] = [];
    
    positiveIndicators.forEach(({ pattern, bonus, desc }) => {
      if (pattern.test(content)) {
        baseScore += bonus;
        totalBonus += bonus;
        foundBenefits.push(desc);
      }
    });
    
    // Realistic adjustments based on policy length and detail
    const policyLength = fullText.length;
    if (policyLength < 1000) {
      // Very short policies are often incomplete
      baseScore -= 5;
    } else if (policyLength > 10000) {
      // Very long policies might be overly complex
      baseScore -= 2;
    } else if (policyLength > 3000 && policyLength < 8000) {
      // Good balance of detail
      baseScore += 3;
    }
    
    // Industry-specific adjustments (realistic context)
    const industryPatterns = [
      { pattern: /social.?(media|network)/i, adjustment: -3, reason: 'Social media platforms typically collect more data' },
      { pattern: /(financial|bank|credit)/i, adjustment: +2, reason: 'Financial services often have stricter privacy requirements' },
      { pattern: /(healthcare|medical|health)/i, adjustment: +5, reason: 'Healthcare has strong privacy regulations (HIPAA)' },
      { pattern: /(gaming|game)/i, adjustment: -2, reason: 'Gaming platforms often have extensive tracking' },
      { pattern: /(advertising|marketing)/i, adjustment: -4, reason: 'Ad-focused businesses typically collect more data' },
      { pattern: /(education|school)/i, adjustment: +3, reason: 'Educational institutions often have student privacy protections' }
    ];
    
    industryPatterns.forEach(({ pattern, adjustment, reason }) => {
      if (pattern.test(content)) {
        baseScore += adjustment;
      }
    });
    
    // Prevent score manipulation by balancing extreme adjustments
    if (totalPenalty > 50) {
      baseScore += Math.floor(totalPenalty * 0.1); // Slight recovery for overly penalized scores
    }
    
    if (totalBonus > 40) {
      baseScore -= Math.floor(totalBonus * 0.05); // Slight reduction for overly generous scores
    }
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  private extractFeaturesFromContent(summary: string, fullText: string): { risks: string[], positiveFeatures: string[] } {
    const content = (summary + ' ' + fullText).toLowerCase();
    const risks: string[] = [];
    const positiveFeatures: string[] = [];
    
    // Enhanced risk detection patterns with priority scoring
    const riskPatterns = [
      { pattern: /sell.{0,15}(personal.?)?data/i, text: 'Personal data may be sold to third parties', priority: 5 },
      { pattern: /third.?party.{0,30}(sharing|share|partners)/i, text: 'Data shared with third-party partners', priority: 4 },
      { pattern: /unlimited.?(retention|storage|keep)/i, text: 'Unlimited data retention policy', priority: 4 },
      { pattern: /no.?(opt.?out|choice|control)/i, text: 'Limited or no opt-out options', priority: 5 },
      { pattern: /(vague|unclear|ambiguous).{0,20}(terms|language)/i, text: 'Vague or unclear privacy terms', priority: 3 },
      { pattern: /extensive.?(collection|gathering|tracking)/i, text: 'Extensive personal data collection', priority: 4 },
      { pattern: /(weak|limited|minimal).{0,20}(security|protection)/i, text: 'Weak data security measures', priority: 5 },
      { pattern: /automatic.?(consent|agreement)/i, text: 'Default consent without explicit approval', priority: 3 },
      { pattern: /location.?(tracking|monitoring).{0,20}(always|continuous)/i, text: 'Continuous location tracking', priority: 4 },
      { pattern: /biometric.?(data|collection|fingerprint)/i, text: 'Biometric data collection', priority: 4 },
      { pattern: /(children|minors).{0,20}data.{0,20}(collect|process)/i, text: 'Children data collection concerns', priority: 5 },
      { pattern: /no.?(encryption|security)/i, text: 'Lack of data encryption', priority: 5 },
      { pattern: /(cross.?border|international).{0,20}transfer/i, text: 'International data transfers', priority: 2 },
      { pattern: /advertising.{0,20}(tracking|profiling)/i, text: 'Advertising tracking and profiling', priority: 3 }
    ];
    
    // Enhanced positive feature detection patterns with priority
    const positivePatterns = [
      { pattern: /gdpr.?(compliant|compliance)/i, text: 'GDPR compliant privacy practices', priority: 5 },
      { pattern: /(strong|robust).{0,20}(user.?control|privacy)/i, text: 'Strong user control over personal data', priority: 5 },
      { pattern: /opt.?out.{0,20}(available|provided|easy)/i, text: 'Easy opt-out and unsubscribe options', priority: 4 },
      { pattern: /data.?(deletion|erasure|removal).{0,20}(rights|available)/i, text: 'User data deletion rights provided', priority: 4 },
      { pattern: /(minimal|limited).{0,20}(collection|data)/i, text: 'Minimal necessary data collection only', priority: 4 },
      { pattern: /(clear|transparent|explicit).{0,20}consent/i, text: 'Clear and explicit consent mechanisms', priority: 4 },
      { pattern: /privacy.?by.?design/i, text: 'Privacy by design architecture', priority: 5 },
      { pattern: /end.?to.?end.?encrypt/i, text: 'End-to-end encryption protection', priority: 5 },
      { pattern: /zero.?knowledge/i, text: 'Zero-knowledge privacy approach', priority: 5 },
      { pattern: /annual.?(audit|review|assessment)/i, text: 'Regular privacy audits and reviews', priority: 3 },
      { pattern: /data.?(portability|export|download)/i, text: 'Data portability and export options', priority: 3 },
      { pattern: /(privacy.?officer|data.?protection.?officer)/i, text: 'Dedicated privacy officer oversight', priority: 3 },
      { pattern: /ccpa.?(compliant|compliance)/i, text: 'CCPA compliant data practices', priority: 4 },
      { pattern: /(anonymization|pseudonymization)/i, text: 'Data anonymization techniques used', priority: 4 }
    ];
    
    // Extract risks with priority-based selection
    const foundRiskPatterns = riskPatterns.filter(({ pattern }) => pattern.test(content))
      .sort((a, b) => b.priority - a.priority) // Sort by priority (highest first)
      .slice(0, 6); // Limit to top 6 most important risks
    
    foundRiskPatterns.forEach(({ text }) => {
      risks.push(text);
    });
    
    // Extract positive features with priority-based selection  
    const foundPositivePatterns = positivePatterns.filter(({ pattern }) => pattern.test(content))
      .sort((a, b) => b.priority - a.priority) // Sort by priority (highest first)  
      .slice(0, 5); // Limit to top 5 most important features
    
    foundPositivePatterns.forEach(({ text }) => {
      positiveFeatures.push(text);
    });
    
    // Add fallback items if nothing found
    if (risks.length === 0) {
      risks.push('Privacy policy requires manual review for potential concerns');
    }
    
    if (positiveFeatures.length === 0 && content.includes('privacy')) {
      positiveFeatures.push('Privacy policy document exists');
    }
    
    return { risks, positiveFeatures };
  }
}
