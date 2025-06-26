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
  static async analyzePolicy(url: string): Promise<any> {
    // Simulate AI analysis - in real implementation, this would call an AI service
    const mockAnalysis = {
      score: Math.floor(Math.random() * 40) + 60,
      risks: [
        'Data may be shared with third parties',
        'Vague data retention policies',
        'No explicit user consent for cookies'
      ],
      summary: 'This policy contains some concerning clauses about data sharing and lacks clarity on user rights.',
      dataSharing: ['Facebook', 'Google Analytics', 'Oracle']
    };
    
    return mockAnalysis;
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
