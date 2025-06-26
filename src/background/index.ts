import { SiteData, TrackerData } from '../utils/types';
import { TrustScoreCalculator, PrivacyPolicyAnalyzer, commonTrackers } from '../utils/privacy';

class BackgroundService {
  private siteData = new Map<string, SiteData>();
  private blockedRequests = new Map<string, number>();
  private privacyPolicyUrls = new Map<string, string[]>();

  constructor() {
    console.log('🚀 Kavach Background Service starting...');
    this.setupRequestBlocking();
    this.setupTabListeners();
    this.setupMessageListeners();
    console.log('✅ Kavach Background Service initialized');
  }

  private safeParseURL(url: string): URL | null {
    try {
      if (!url || typeof url !== 'string') {
        console.warn('❌ Invalid URL input:', url);
        return null;
      }
      return new URL(url);
    } catch (error) {
      console.warn('❌ Failed to parse URL:', url, error);
      return null;
    }
  }

  private getDomainFromURL(url: string): string | null {
    const parsedUrl = this.safeParseURL(url);
    return parsedUrl ? parsedUrl.hostname : null;
  }  private setupRequestBlocking() {
    console.log('🛡️ Kavach: Setting up request blocking...');
    
    // Monitor web requests to track third-party requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        console.log('🌐 Request detected:', details.url, 'Type:', details.type, 'Initiator:', details.initiator);
        
        if (details.type === 'main_frame') return {};
        
        const url = this.safeParseURL(details.url);
        const initiatorUrl = details.initiator ? this.safeParseURL(details.initiator) : null;
        
        if (url && initiatorUrl && url.hostname !== initiatorUrl.hostname) {
          console.log('🚨 Third-party request:', url.hostname, 'from', initiatorUrl.hostname);
          this.trackThirdPartyRequest(initiatorUrl.hostname, url.hostname, details.type);
        }
        
        return {};
      },
      { urls: ['<all_urls>'] },
      ['requestBody']
    );
  }  private setupTabListeners() {
    console.log('👂 Setting up tab listeners...');
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && this.isValidHttpUrl(tab.url)) {
        console.log('📄 Tab completed loading:', tab.url);
        this.initializeSiteData(tab.url);
      }
    });

    // Also listen for tab activation to ensure we have data for active tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && this.isValidHttpUrl(tab.url)) {
          console.log('🔄 Tab activated:', tab.url);
          this.initializeSiteData(tab.url);
        }
      } catch (error) {
        console.log('❌ Error getting active tab:', error);
      }
    });
  }

  private isValidHttpUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }private trackThirdPartyRequest(sourceDomain: string, trackerDomain: string, requestType: string) {
    console.log('📊 Tracking third-party request:', { sourceDomain, trackerDomain, requestType });
    
    let siteData = this.siteData.get(sourceDomain);
    if (!siteData) {
      console.log('❌ No site data found for:', sourceDomain, '- Creating new site data');
      // Initialize site data for this domain
      this.initializeSiteDataForDomain(sourceDomain);
      siteData = this.siteData.get(sourceDomain);
      if (!siteData) {
        console.log('❌ Failed to create site data for:', sourceDomain);
        return;
      }
    }

    const existingTracker = siteData.trackers.find(t => t.domain === trackerDomain);
    if (existingTracker) {
      existingTracker.count++;
      console.log('📈 Updated tracker count:', trackerDomain, existingTracker.count);
    } else {
      const trackerInfo = commonTrackers[trackerDomain as keyof typeof commonTrackers];
      const newTracker = {
        domain: trackerDomain,
        count: 1,
        category: trackerInfo?.category || 'unknown',
        blocked: this.isTrackerBlocked(trackerDomain)
      };
      siteData.trackers.push(newTracker);
      console.log('🆕 New tracker detected:', newTracker);
    }

    // Recalculate trust score
    const oldScore = siteData.trustScore;
    siteData.trustScore = TrustScoreCalculator.calculateScore(siteData.trackers);
    console.log('🎯 Trust score updated:', oldScore, '→', siteData.trustScore);
    
    // Update data flow visualization
    this.updateDataFlow(siteData, sourceDomain, trackerDomain);
    
    this.siteData.set(sourceDomain, siteData);
  }

  private isTrackerBlocked(domain: string): boolean {
    // Check if domain is in our blocking rules
    const blockedDomains = ['doubleclick.net', 'googletagmanager.com', 'facebook.com/tr'];
    return blockedDomains.some(blocked => domain.includes(blocked));
  }

  private updateDataFlow(siteData: SiteData, source: string, tracker: string) {
    // Add nodes if they don't exist
    if (!siteData.dataFlow.nodes.find(n => n.id === source)) {
      siteData.dataFlow.nodes.push({
        id: source,
        domain: source,
        type: 'source',
        position: { x: 100, y: 100 }
      });
    }

    if (!siteData.dataFlow.nodes.find(n => n.id === tracker)) {
      const nodeCount = siteData.dataFlow.nodes.length;
      siteData.dataFlow.nodes.push({
        id: tracker,
        domain: tracker,
        type: 'tracker',
        position: { x: 200 + (nodeCount * 100), y: 150 }
      });
    }

    // Add edge if it doesn't exist
    if (!siteData.dataFlow.edges.find(e => e.from === source && e.to === tracker)) {
      siteData.dataFlow.edges.push({
        from: source,
        to: tracker,
        dataType: 'user_data'
      });
    }
  }  private initializeSiteData(url: string) {
    const domain = this.getDomainFromURL(url);
    if (!domain) {
      console.warn('❌ Cannot initialize site data for invalid URL:', url);
      return;
    }
    
    console.log('🏠 Initializing site data for:', domain);
    
    if (!this.siteData.has(domain)) {
      const newSiteData = {
        url,
        trustScore: 100,
        trackers: [],
        dataFlow: {
          nodes: [],
          edges: []
        }
      };
      this.siteData.set(domain, newSiteData);
      console.log('✅ Site data initialized:', newSiteData);
    } else {
      console.log('♻️ Site data already exists for:', domain);
    }
  }

  private initializeSiteDataForDomain(domain: string) {
    console.log('🏠 Initializing site data for domain:', domain);
    
    if (!this.siteData.has(domain)) {
      const newSiteData = {
        url: `https://${domain}`, // Construct basic URL from domain
        trustScore: 100,
        trackers: [],
        dataFlow: {
          nodes: [],
          edges: []
        }
      };
      this.siteData.set(domain, newSiteData);
      console.log('✅ Site data initialized for domain:', newSiteData);
    } else {
      console.log('♻️ Site data already exists for domain:', domain);
    }
  }  async getSiteData(url: string): Promise<SiteData | null> {
    const domain = this.getDomainFromURL(url);
    if (!domain) {
      console.warn('❌ Cannot get site data for invalid URL:', url);
      return null;
    }
    
    // Ensure site data exists for this domain
    if (!this.siteData.has(domain)) {
      console.log('🔄 Site data not found, initializing for:', domain);
      this.initializeSiteData(url);
    }
    
    const siteData = this.siteData.get(domain) || null;
    console.log('📊 Getting site data for:', domain, 'Found:', !!siteData, 'Trackers:', siteData?.trackers?.length || 0);
    return siteData;
  }
  async toggleTrackerBlocking(enabled: boolean) {
    // Toggle declarative net request rules
    const ruleIds = [1, 2, 3, 4, 5]; // IDs from rules.json
    
    if (enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['tracker_rules']
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['tracker_rules']
      });
    }
  }
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Message received:', request.action, request);
      
      switch (request.action) {
        case 'getSiteData':
          this.getSiteData(request.url).then(sendResponse);
          return true;
        
        case 'getFingerprintScript':
          this.getFingerprintScript(request.apiKey).then(sendResponse);
          return true;

        case 'toggleBlocking':
          this.toggleTrackerBlocking(request.enabled).then(() => {
            sendResponse({ success: true });
          });
          return true;

        case 'analyzePrivacyPolicy':
          this.analyzePrivacyPolicy(request.url).then(sendResponse);
          return true;

        case 'privacyPoliciesFound':
          this.storePrivacyPolicyUrls(request.currentUrl, request.urls);
          sendResponse({ success: true });
          return true;

        case 'debugInfo':
          // Return debug information
          const debugInfo = {
            trackedDomains: Array.from(this.siteData.keys()),
            totalSites: this.siteData.size,
            siteDataSnapshot: Array.from(this.siteData.entries()).map(([domain, data]) => ({
              domain,
              trackerCount: data.trackers.length,
              trustScore: data.trustScore
            }))
          };
          console.log('🐛 Debug info requested:', debugInfo);
          sendResponse(debugInfo);
          return true;
        case 'runFingerprint':
          if (request.tabId) {
            this.handleFingerprinting(request.apiKey, request.tabId)
              .then(sendResponse)
              .catch(error => sendResponse({ success: false, error: error.message }));
          } else {
            sendResponse({ success: false, error: 'No tabId provided in the request.' });
          }
          return true; // Keep channel open for async response

        case 'performOptOut':
          this.performComprehensiveOptOut(request.url, request.tabId)
            .then(sendResponse)
            .catch((error: any) => sendResponse({ success: false, error: error.message }));
          return true;
      }
    });
  }
  private storePrivacyPolicyUrls(siteUrl: string, policyUrls: string[]) {
    const domain = this.getDomainFromURL(siteUrl);
    if (!domain) {
      console.warn('❌ Cannot store privacy policy URLs for invalid URL:', siteUrl);
      return;
    }
    this.privacyPolicyUrls.set(domain, policyUrls);
  }
  async analyzePrivacyPolicy(siteUrl: string): Promise<any> {
    const domain = this.getDomainFromURL(siteUrl);
    if (!domain) {
      console.warn('❌ Cannot analyze privacy policy for invalid URL:', siteUrl);
      return { error: 'Invalid URL provided' };
    }
    
    console.log('🤖 Starting privacy policy analysis using AI backend for:', siteUrl);
    console.log('🌐 API endpoint:', 'https://kavach-hackolution.onrender.com/api/privacy-policy/analyze');
    
    try {
      // Use the PrivacyPolicyAnalyzer from utils to call the backend API
      console.log('📞 Calling PrivacyPolicyAnalyzer.analyzePolicy...');
      const analysis = await PrivacyPolicyAnalyzer.analyzePolicy(siteUrl);
      
      console.log('✅ Privacy policy analysis completed successfully!');
      console.log('📊 Analysis result:', JSON.stringify(analysis, null, 2));
      
      // Store the analysis in site data
      const siteData = this.siteData.get(domain);
      if (siteData) {
        const processedAnalysis = {
          score: analysis.score || 50,
          risks: analysis.risks || [],
          summary: analysis.summary || 'Privacy policy analysis completed.',
          safety: analysis.safety || 'RISKY',
          dataSharing: analysis.dataSharing || [],
          industryType: analysis.industryType,
          positiveFeatures: analysis.positiveFeatures,
          analysisDepth: analysis.analysisDepth,
          lastAnalyzed: new Date().toISOString()
        };
        
        siteData.privacyAnalysis = processedAnalysis;
        this.siteData.set(domain, siteData);
        console.log('💾 Analysis stored in site data for:', domain);
      }
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Privacy policy analysis failed:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        siteUrl,
        domain
      });
      
      // Return fallback analysis
      const fallbackAnalysis = {
        score: 50,
        risks: ['Unable to analyze privacy policy - backend service unavailable'],
        summary: 'Privacy policy analysis failed. This could be due to network issues or service unavailability.',
        safety: 'RISKY' as const,
        dataSharing: [],
        industryType: 'Unknown',
        positiveFeatures: [],
        analysisDepth: 'Failed',
        lastAnalyzed: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      console.log('🔄 Returning fallback analysis:', fallbackAnalysis);
      
      // Store fallback analysis
      const siteData = this.siteData.get(domain);
      if (siteData) {
        siteData.privacyAnalysis = fallbackAnalysis;
        this.siteData.set(domain, siteData);
        console.log('💾 Fallback analysis stored in site data for:', domain);
      }
      
      return fallbackAnalysis;
    }
  }

  async getFingerprintScript(apiKey: string): Promise<{ script: string } | { error: string }> {
    const loaderUrl = `https://fpnpmcdn.net/v3/${apiKey}/loader_v3.11.10.js`;
    try {
      const response = await fetch(loaderUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch script: ${response.statusText}`);
      }
      const script = await response.text();
      return { script };
    } catch (error: any) {
      console.error('Failed to fetch FingerprintJS script:', error);
      return { error: error.message };
    }
  }

  async handleFingerprinting(apiKey: string, tabId: number) {
    try {
      // Inject the bundled fingerprinting script into the active tab's main world
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['fingerprint-agent.js'],
        world: 'MAIN'
      });

      // Now execute the code to run FingerprintJS in the main world
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: runFingerprintJS,
        args: [apiKey],
        world: 'MAIN'
      });

      if (results && results[0] && results[0].result) {
        return results[0].result;
      } else {
        throw new Error('No result returned from fingerprinting script');
      }
    } catch (error: any) {
      console.error('Background fingerprinting error:', error);
      return {
        success: false,
        error: `Failed to run fingerprinting: ${error.message}`
      };
    }
  }

  async performComprehensiveOptOut(url: string, tabId: number): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      const domain = this.getDomainFromURL(url);
      if (!domain) {
        throw new Error('Invalid URL provided');
      }

      console.log('🚫 Starting comprehensive opt-out for:', domain);

      // Step 1: Update tracking rules to block this domain
      await this.addDomainToBlockList(domain);

      // Step 2: Clear all request tracking for this domain
      this.clearDomainTrackingData(domain);

      // Step 3: Block all future third-party requests from this domain
      await this.enableEnhancedBlockingForDomain(domain);

      // Step 4: Clear any stored privacy policy data
      this.privacyPolicyUrls.delete(domain);

      // Step 5: Mark domain as opted out
      await chrome.storage.local.set({
        [`optedOut_${domain}`]: {
          timestamp: Date.now(),
          userInitiated: true,
          comprehensive: true
        }
      });

      // Step 6: Reset trust score to reflect opt-out status
      const siteData = this.siteData.get(domain);
      if (siteData) {
        siteData.trustScore = 95; // High score due to opt-out
        siteData.trackers = []; // Clear tracked requests
        this.siteData.set(domain, siteData);
      }

      console.log('✅ Background opt-out processing completed for:', domain);
      
      return { 
        success: true, 
        message: `Comprehensive opt-out completed for ${domain}` 
      };

    } catch (error: any) {
      console.error('❌ Background opt-out failed:', error);
      return { 
        success: false, 
        error: `Opt-out failed: ${error.message}` 
      };
    }
  }

  private async addDomainToBlockList(domain: string): Promise<void> {
    try {
      // Get existing blocked domains
      const storage = await chrome.storage.local.get(['blockedDomains']);
      const blockedDomains = storage.blockedDomains || [];
      
      if (!blockedDomains.includes(domain)) {
        blockedDomains.push(domain);
        await chrome.storage.local.set({ blockedDomains });
        console.log('📝 Added domain to block list:', domain);
      }
    } catch (error) {
      console.warn('Failed to add domain to block list:', error);
    }
  }

  private clearDomainTrackingData(domain: string): void {
    try {
      // Remove from site data
      this.siteData.delete(domain);
      
      // Clear blocked requests count
      const keysToDelete = Array.from(this.blockedRequests.keys())
        .filter(key => key.includes(domain));
      keysToDelete.forEach(key => this.blockedRequests.delete(key));
      
      console.log('🧹 Cleared tracking data for:', domain);
    } catch (error) {
      console.warn('Failed to clear domain tracking data:', error);
    }
  }

  private async enableEnhancedBlockingForDomain(domain: string): Promise<void> {
    try {
      // Create dynamic rules to block requests from this domain
      const newRules: chrome.declarativeNetRequest.Rule[] = [
        {
          id: Date.now(),
          priority: 1,
          action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            initiatorDomains: [domain],
            resourceTypes: [
              'script' as chrome.declarativeNetRequest.ResourceType,
              'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
              'image' as chrome.declarativeNetRequest.ResourceType,
              'media' as chrome.declarativeNetRequest.ResourceType,
              'font' as chrome.declarativeNetRequest.ResourceType,
              'websocket' as chrome.declarativeNetRequest.ResourceType
            ]
          }
        }
      ];

      // YouTube-specific blocking rules
      if (domain.includes('youtube.com') || domain.includes('google.com')) {
        newRules.push(
          {
            id: Date.now() + 1,
            priority: 2,
            action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
            condition: {
              urlFilter: '*youtube.com/api/stats*',
              resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType]
            }
          },
          {
            id: Date.now() + 2,
            priority: 2,
            action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
            condition: {
              urlFilter: '*youtube.com/youtubei/v1/log_event*',
              resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType]
            }
          },
          {
            id: Date.now() + 3,
            priority: 2,
            action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
            condition: {
              urlFilter: '*youtube.com/ptracking*',
              resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType, 'image' as chrome.declarativeNetRequest.ResourceType]
            }
          }
        );
      }

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });

      console.log('🛡️ Enhanced blocking enabled for:', domain);
    } catch (error) {
      console.warn('Failed to enable enhanced blocking:', error);
    }
  }
}

// This function gets injected into the webpage after the agent is injected
function runFingerprintJS(apiKey: string) {
  return new Promise((resolve) => {
    // The FingerprintJS object is now available on the window
    // thanks to the injected fingerprint-agent.js script.
    async function initializeFingerprint() {
      try {
        const fp = await (window as any).FingerprintJS.load({
          apiKey: apiKey,
          region: 'ap'
        });
        const result = await fp.get({
          extendedResult: true
        });
        resolve({
          success: true,
          data: {
            visitorId: result.visitorId,
            confidence: result.confidence,
            components: result.components,
            requestId: result.requestId,
            timestamp: Date.now()
          }
        });
      } catch (error: any) {
        resolve({
          success: false,
          error: `Fingerprinting failed: ${error.message}`
        });
      }
    }

    // Wait for the FingerprintJS object to be available
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if ((window as any).FingerprintJS) {
        clearInterval(interval);
        initializeFingerprint();
      } else if (checks > 50) { // Timeout after 5 seconds
        clearInterval(interval);
        resolve({ success: false, error: 'FingerprintJS object not found after script injection.' });
      }
    }, 100);
  });
}

const backgroundService = new BackgroundService();

export {};
