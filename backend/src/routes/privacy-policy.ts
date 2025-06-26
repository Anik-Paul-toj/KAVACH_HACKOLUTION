import express, { Request, Response } from 'express';
import { GeminiPrivacyAnalyzer } from '../services/gemini-analyzer';
import { PolicyScraper } from '../services/policy-scraper';

const router = express.Router();

interface AnalyzeRequest {
  url: string;
  policyUrl?: string;
}

interface PolicyMetadata {
  url: string;
  title: string;
  lastModified?: string;
  contentLength: number;
  analyzedAt: string;
}

interface AnalyzeResponseData {
  summary: string;
  safety: 'SAFE' | 'RISKY' | 'UNSAFE';
  score: number;
  risks: string[];
  positiveFeatures: string[];
  dataSharing: string[];
  industryType: string;
  analysisDepth: string;
  policyMetadata: PolicyMetadata;
}

interface AnalyzeResponse {
  success: boolean;
  data?: AnalyzeResponseData;
  error?: string;
  policyUrl?: string;
}

// Initialize Gemini analyzer
let analyzer: GeminiPrivacyAnalyzer;

try {
  analyzer = new GeminiPrivacyAnalyzer();
} catch (error) {
  console.error('Failed to initialize Gemini analyzer:', error);
}

// Helper function to detect industry type from URL
function detectIndustryType(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('bank') || hostname.includes('credit') || hostname.includes('finance')) {
      return 'Financial';
    } else if (hostname.includes('health') || hostname.includes('medical') || hostname.includes('clinic')) {
      return 'Healthcare';
    } else if (hostname.includes('shop') || hostname.includes('store') || hostname.includes('commerce')) {
      return 'E-commerce';
    } else if (hostname.includes('social') || hostname.includes('chat') || hostname.includes('media')) {
      return 'Social Media';
    } else if (hostname.includes('edu') || hostname.includes('university') || hostname.includes('school')) {
      return 'Education';
    } else if (hostname.includes('gov') || hostname.includes('government')) {
      return 'Government';
    } else if (hostname.includes('news') || hostname.includes('blog') || hostname.includes('journal')) {
      return 'Media';
    } else {
      return 'Technology';
    }
  } catch {
    return 'Unknown';
  }
}

/**
 * POST /api/privacy-policy/analyze
 * Analyzes a website's privacy policy using AI
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, policyUrl }: AnalyzeRequest = req.body;

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'Website URL is required'
      } as AnalyzeResponse);
      return;
    }

    if (!analyzer) {
      res.status(500).json({
        success: false,
        error: 'Privacy policy analyzer is not available. Please check server configuration.'
      } as AnalyzeResponse);
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      } as AnalyzeResponse);
      return;
    }

    let finalPolicyUrl = policyUrl;
    
    // If no specific policy URL provided, try to find it
    if (!finalPolicyUrl) {
      console.log(`🔍 Searching for privacy policy on ${url}`);
      const foundPolicyUrl = await PolicyScraper.findPrivacyPolicyUrl(url);
      
      if (!foundPolicyUrl) {
        res.status(404).json({
          success: false,
          error: 'No privacy policy found on this website'
        } as AnalyzeResponse);
        return;
      }
      
      finalPolicyUrl = foundPolicyUrl;
    }

    console.log(`📄 Scraping privacy policy from ${finalPolicyUrl}`);
    
    // Scrape the privacy policy content
    const scrapedContent = await PolicyScraper.scrapePrivacyPolicy(finalPolicyUrl);
    
    if (!scrapedContent.text || scrapedContent.text.length < 100) {
      res.status(400).json({
        success: false,
        error: 'Privacy policy content is too short or empty'
      } as AnalyzeResponse);
      return;
    }

    console.log(`🤖 Analyzing privacy policy with AI (${scrapedContent.text.length} characters)`);
    
    // Analyze with Gemini
    const analysis = await analyzer.analyzePrivacyPolicy(scrapedContent.text, url);

    const response: AnalyzeResponse = {
      success: true,
      data: {
        summary: analysis.summary,
        safety: analysis.safety,
        score: analysis.score,
        risks: analysis.risks || [],
        positiveFeatures: analysis.positiveFeatures || [],
        dataSharing: [], // Will be extracted from analysis in future iterations
        industryType: detectIndustryType(url),
        analysisDepth: 'AI Analysis',
        policyMetadata: {
          url: finalPolicyUrl,
          title: scrapedContent.title,
          lastModified: scrapedContent.lastModified,
          contentLength: scrapedContent.text.length,
          analyzedAt: new Date().toISOString()
        }
      },
      policyUrl: finalPolicyUrl
    };

    console.log(`✅ Analysis complete for ${url} - Safety: ${analysis.safety}`);
    res.json(response);

  } catch (error) {
    console.error('Error analyzing privacy policy:', error);
    
    let errorMessage = 'Failed to analyze privacy policy';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('Access denied')) {
        errorMessage = `Website blocks automated access. Please manually review the privacy policy.`;
        statusCode = 403;
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'Privacy policy not found on this website';
        statusCode = 404;
      } else if (error.message.includes('429') || error.message.includes('Rate limited')) {
        errorMessage = 'Too many requests - please try again later';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the website took too long to respond';
        statusCode = 408;
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Website not found or not accessible';
        statusCode = 404;
      } else if (error.message.includes('content is too short')) {
        errorMessage = 'Privacy policy content is insufficient for analysis';
        statusCode = 400;
      } else if (error.message.includes('quota') || error.message.includes('API')) {
        errorMessage = 'AI analysis service temporarily unavailable - manual review recommended';
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    } as AnalyzeResponse);
  }
});

/**
 * GET /api/privacy-policy/find
 * Find privacy policy URL for a given website
 */
router.get('/find', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Website URL is required as query parameter'
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
      return;
    }

    const policyUrl = await PolicyScraper.findPrivacyPolicyUrl(url);

    if (!policyUrl) {
      res.status(404).json({
        success: false,
        error: 'No privacy policy found on this website'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        policyUrl,
        foundAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error finding privacy policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for privacy policy'
    });
  }
});

export { router as privacyPolicyRouter };
