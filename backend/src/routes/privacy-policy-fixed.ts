import express, { Request, Response } from 'express';
import { GeminiPrivacyAnalyzer } from '../services/gemini-analyzer';
import { PolicyScraper } from '../services/policy-scraper';

const router = express.Router();

interface AnalyzeRequest {
  url: string;
  policyUrl?: string;
}

interface AnalyzeResponse {
  success: boolean;
  data?: any;
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
      const foundPolicyResult = await PolicyScraper.findPrivacyPolicyUrl(url);
      
      if (!foundPolicyResult.privacyPolicyUrl) {
        res.status(404).json({
          success: false,
          error: 'No privacy policy found on this website'
        } as AnalyzeResponse);
        return;
      }
      
      finalPolicyUrl = foundPolicyResult.privacyPolicyUrl;
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
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the website took too long to respond';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Website not found or not accessible';
      } else if (error.message.includes('scrape')) {
        errorMessage = 'Failed to extract privacy policy content';
      } else if (error.message.includes('API')) {
        errorMessage = 'AI analysis service temporarily unavailable';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
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

    const policyResult = await PolicyScraper.findPrivacyPolicyUrl(url);

    if (!policyResult.privacyPolicyUrl) {
      res.status(404).json({
        success: false,
        error: 'No privacy policy found on this website'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        policyUrl: policyResult.privacyPolicyUrl,
        foundAt: new Date().toISOString(),
        method: policyResult.method,
        crawledPages: policyResult.crawledPages,
        foundUrls: policyResult.foundUrls.length
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
