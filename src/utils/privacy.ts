import { SiteData, TrackerData } from './types';

export class TrustScoreCalculator {
  static calculateScore(trackers: TrackerData[], privacyRisks: string[] = []): number {
    let score = 100;
    
    // Deduct points for trackers
    const trackerPenalty = Math.min(trackers.length * 5, 40);
    score -= trackerPenalty;
    
    // Deduct points for high-risk trackers
    const highRiskTrackers = trackers.filter(t => 
      ['advertising', 'social', 'analytics'].includes(t.category)
    );
    score -= highRiskTrackers.length * 3;
    
    // Deduct points for privacy policy risks
    score -= Math.min(privacyRisks.length * 8, 30);
    
    return Math.max(0, Math.min(100, score));
  }
}

export class PrivacyPolicyAnalyzer {
  // Production Render API endpoint
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://kavach-hackolution.onrender.com/api'
    : 'https://kavach-hackolution.onrender.com/api'; // Use production API for both dev and prod

  static async analyzePolicy(url: string): Promise<any> {
    try {
      console.log('🚀 [Frontend] Starting privacy policy analysis for:', url);
      console.log('🌐 [Frontend] API endpoint:', `${this.API_BASE_URL}/privacy-policy/analyze`);
      
      const requestBody = { url };
      console.log('📤 [Frontend] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.API_BASE_URL}/privacy-policy/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add timeout for Chrome extension
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      console.log('📥 [Frontend] Response status:', response.status, response.statusText);
      console.log('📥 [Frontend] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Frontend] API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [Frontend] Raw API response:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }
      
      console.log('Privacy policy analysis completed:', result.data);
      return result.data;
      
    } catch (error) {
      console.error('Privacy policy analysis failed:', error);
      
      // Return enhanced fallback data based on error type
      const fallbackAnalysis = {
        score: 50,
        risks: ['Unable to analyze privacy policy - please review manually'],
        summary: 'Privacy policy analysis failed. This could be due to network issues, missing privacy policy, or service unavailability.',
        dataSharing: [],
        recommendations: [
          'Review the privacy policy manually',
          'Check if the website has a privacy policy',
          'Contact the website for clarification on data practices'
        ],
        complianceStatus: {
          gdpr: 'unclear' as const,
          ccpa: 'unclear' as const,
          coppa: 'unclear' as const
        },
        dataRetention: 'Unable to determine data retention policy',
        userRights: [],
        thirdPartySharing: true, // Assume worst case
        cookiePolicy: 'Unable to determine cookie policy',
        policyMetadata: {
          url: null,
          title: 'Privacy Policy Analysis Failed',
          analyzedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      // Provide more specific feedback based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          fallbackAnalysis.summary = 'Privacy policy analysis timed out. The website may be slow to respond.';
          fallbackAnalysis.recommendations = [
            'Try again in a few minutes',
            'Check your internet connection',
            'Review the privacy policy manually'
          ];
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          fallbackAnalysis.summary = 'No privacy policy was found on this website.';
          fallbackAnalysis.score = 30; // Lower score for missing privacy policy
          fallbackAnalysis.risks = [
            'No privacy policy found',
            'Data practices unclear',
            'User rights undefined'
          ];
          fallbackAnalysis.recommendations = [
            'Contact the website to request their privacy policy',
            'Avoid sharing personal information',
            'Consider the privacy implications of using this site'
          ];
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          fallbackAnalysis.summary = 'Unable to connect to privacy analysis service.';
          fallbackAnalysis.recommendations = [
            'Check your internet connection',
            'Try again later',
            'Review the privacy policy manually'
          ];
        }
      }

      return fallbackAnalysis;
    }
  }

  /**
   * Find privacy policy URL for a website
   */
  static async findPrivacyPolicyUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/privacy-policy/find?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.success ? result.data.policyUrl : null;
      
    } catch (error) {
      console.error('Failed to find privacy policy URL:', error);
      return null;
    }
  }
}

export const commonTrackers = {
  'doubleclick.net': { category: 'advertising', name: 'Google DoubleClick' },
  'googletagmanager.com': { category: 'analytics', name: 'Google Tag Manager' },
  'facebook.com': { category: 'social', name: 'Facebook Pixel' },
  'google-analytics.com': { category: 'analytics', name: 'Google Analytics' },
  'connect.facebook.net': { category: 'social', name: 'Facebook Connect' },
  'amazon-adsystem.com': { category: 'advertising', name: 'Amazon Advertising' },
  'twitter.com': { category: 'social', name: 'Twitter Analytics' },
  'linkedin.com': { category: 'social', name: 'LinkedIn Insights' }
};

export class OptOutManager {
  // Website-specific opt-out mechanisms
  static readonly OPT_OUT_STRATEGIES = {
    'google.com': {
      cookiesToSet: [
        'CONSENT=PENDING+999',
        'NID=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'ANID=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-testid="reject-all"]', '.QS5gu'],
      logoutUrl: 'https://accounts.google.com/logout'
    },
    'facebook.com': {
      cookiesToSet: [
        'dpr=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'wd=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-testid="cookie-policy-manage-dialog-decline-button"]'],
      logoutUrl: 'https://www.facebook.com/logout.php'
    },
    'amazon.com': {
      cookiesToSet: [
        'ad-privacy=0',
        'csm-hit=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-cy="sp_choice_type_REJECT_ALL"]'],
      logoutUrl: 'https://www.amazon.com/gp/flex/sign-out.html'
    },
    'twitter.com': {
      cookiesToSet: [
        'personalization_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'guest_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-testid="decline"]'],
      logoutUrl: 'https://twitter.com/logout'
    },
    'linkedin.com': {
      cookiesToSet: [
        'UserMatchHistory=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'AnalyticsSyncHistory=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-tracking-control-name="consent-banner_decline-all"]'],
      logoutUrl: 'https://www.linkedin.com/uas/logout'
    },
    'youtube.com': {
      cookiesToSet: [
        'CONSENT=PENDING+999',
        'VISITOR_INFO1_LIVE=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[aria-label="Reject all"]', '[data-testid="reject-all-button"]'],
      logoutUrl: 'https://accounts.google.com/logout'
    },
    'instagram.com': {
      cookiesToSet: [
        'ig_nrcb=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      selectors: ['[data-testid="cookie-banner-decline"]'],
      logoutUrl: 'https://www.instagram.com/accounts/logout/'
    }
  };

  static getOptOutStrategy(domain: string) {
    // Find matching strategy for domain or subdomain
    const strategies = Object.keys(this.OPT_OUT_STRATEGIES);
    const matchingStrategy = strategies.find(strategyDomain => 
      domain.includes(strategyDomain) || strategyDomain.includes(domain)
    );
    
    return matchingStrategy ? this.OPT_OUT_STRATEGIES[matchingStrategy as keyof typeof this.OPT_OUT_STRATEGIES] : null;
  }

  static getUniversalOptOutCookies(): string[] {
    return [
      'gdpr_consent=false',
      'ccpa_optout=true',
      'privacy_optout=true',
      'cookie_consent=rejected',
      'tracking_consent=false',
      'analytics_consent=false',
      'marketing_consent=false',
      'personalization_consent=false',
      'advertising_consent=false',
      'functional_consent=false',
      'performance_consent=false',
      'social_media_consent=false',
      'opt_out=true',
      'privacy_settings=all_rejected',
      'consent_mode=opt_out',
      'do_not_track=1',
      'user_consent_status=rejected',
      // OneTrust specific
      'OptanonConsent=',
      'OptanonAlertBoxClosed=',
      // Cookiebot specific
      'CookieConsent=no',
      // TrustArc specific
      'notice_behavior=implied,eu',
      'notice_gdpr_prefs=0,1,2,3:',
      // Quantcast specific
      'euconsent-v2=',
      // Generic IAB consent
      'gdpr=1',
      'gdpr_consent=',
      // Site-specific patterns
      'cookies_accepted=false',
      'accept_cookies=no',
      'cookie_policy_accepted=false',
      'data_processing_consent=false'
    ];
  }

  static getUniversalOptOutSelectors(): string[] {
    return [
      // Generic opt-out buttons
      'button[data-testid*="reject"]',
      'button[data-testid*="decline"]', 
      'button[data-testid*="opt-out"]',
      'button[class*="reject"]',
      'button[class*="decline"]',
      'button[class*="opt-out"]',
      'a[href*="opt-out"]',
      'a[href*="unsubscribe"]',
      'a[href*="privacy-settings"]',
      
      // OneTrust CMP
      '#onetrust-reject-all-handler',
      '#onetrust-pc-btn-handler',
      '.optanon-category-2',
      '.optanon-category-3',
      '.optanon-category-4',
      
      // Cookiebot CMP
      '#CybotCookiebotDialogBodyButtonDecline',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      
      // TrustArc CMP
      '#truste-consent-required',
      '.truste-button-2',
      
      // Quantcast CMP
      '.qc-cmp2-summary-buttons > button:last-child',
      '.qc-cmp2-toggle-switch',
      
      // Generic consent management
      '[data-cy*="reject"]',
      '[data-cy*="decline"]',
      '[data-cy="manage-consent-reject-all"]',
      '[data-testid="consent-reject-all"]',
      '.sp_choice_type_REJECT_ALL',
      
      // Common cookie banner patterns
      '.cookie-banner button[data-role="reject"]',
      '.gdpr-banner .reject-all',
      '.consent-manager .decline-all',
      '.privacy-banner .opt-out',
      
      // Language-specific patterns
      'button:contains("Reject All")',
      'button:contains("Decline All")', 
      'button:contains("Opt Out")',
      'button:contains("Refuse All")',
      'button:contains("Deny All")',
      'button:contains("No Thanks")',
      'button:contains("Disagree")',
      
      // Logout buttons
      'a[href*="logout"]',
      'a[href*="signout"]',
      'a[href*="sign-out"]',
      'button[data-testid*="logout"]',
      'button[data-testid*="signout"]',
      '.logout', '.signout', '.sign-out'
    ];
  }

  static getTrackingDomainsToBlock(): string[] {
    return [
      // Google tracking
      'google-analytics.com',
      'googletagmanager.com',
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'gstatic.com',
      
      // Facebook/Meta tracking  
      'facebook.com',
      'facebook.net',
      'connect.facebook.net',
      
      // Amazon tracking
      'amazon-adsystem.com',
      'amazonpay.com',
      
      // Microsoft tracking
      'bing.com',
      'microsoft.com',
      'live.com',
      
      // Social media tracking
      'twitter.com',
      'linkedin.com',
      'pinterest.com',
      'tiktok.com',
      'snapchat.com',
      
      // Analytics platforms
      'mixpanel.com',
      'segment.com',
      'amplitude.com',
      'hotjar.com',
      'fullstory.com',
      'logrocket.com',
      'mouseflow.com',
      'crazyegg.com',
      'optimizely.com',
      
      // Ad networks
      'criteo.com',
      'outbrain.com',
      'taboola.com',
      'pubmatic.com',
      'rubiconproject.com',
      'openx.com',
      'adsystem.com'
    ];
  }
}
