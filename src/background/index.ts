import { SiteData, TrackerData } from '../utils/types';
import { TrustScoreCalculator, PrivacyPolicyAnalyzer, commonTrackers } from '../utils/privacy';

// LRU Cache for SiteData with persistence
class LRUCache<K, V> {
  private maxEntries: number;
  private map: Map<K, V>;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    console.log(`[LRUCache] HIT for key:`, key);
    return value;
  }

  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.map.delete(key);
      console.log(`[LRUCache] UPDATE for key:`, key);
    } else if (this.map.size >= this.maxEntries) {
      // Remove least recently used
      const iterator = this.map.keys();
      const lruKey = iterator.next().value;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
        console.log(`[LRUCache] EVICTED least recently used key:`, lruKey);
      }
      console.log(`[LRUCache] SET (new, after eviction if needed) for key:`, key);
    } else {
      console.log(`[LRUCache] SET (new) for key:`, key);
    }
    this.map.set(key, value);
  }

  delete(key: K) {
    this.map.delete(key);
  }

  has(key: K) {
    return this.map.has(key);
  }

  keys() {
    return Array.from(this.map.keys());
  }

  values() {
    return Array.from(this.map.values());
  }

  entries() {
    return Array.from(this.map.entries());
  }

  toJSON(): [K, V][] {
    return Array.from(this.map.entries());
  }

  fromJSON(entries: [K, V][]) {
    this.map = new Map(entries);
  }
}

class BackgroundService {
  private siteData = new Map<string, SiteData>();
  private blockedRequests = new Map<string, number>();
  private privacyPolicyUrls = new Map<string, string[]>();
  private readonly MAX_SITE_DATA_ENTRIES = 100; // Prevent memory bloat
  private readonly MAX_TRACKERS_PER_SITE = 50; // Limit trackers per site
  private lruCache = new LRUCache<string, { data: SiteData, timestamp: number }>(100); // 100 entries max

  constructor() {
    this.setupRequestBlocking();
    this.setupTabListeners();
    this.setupMessageListeners();
    this.loadCacheFromStorage();
    setInterval(() => this.cleanupOldData(), 300000); // Every 5 minutes
    setInterval(() => this.saveCacheToStorage(), 60000); // Save cache every 1 min
  }

  private safeParseURL(url: string): URL | null {
    try {
      if (!url || typeof url !== 'string') return null;
      return new URL(url);
    } catch {
      return null;
    }
  }

  private getDomainFromURL(url: string): string | null {
    const parsedUrl = this.safeParseURL(url);
    return parsedUrl ? parsedUrl.hostname : null;
  }

  private setupRequestBlocking() {
    // Monitor web requests to track third-party requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (details.type === 'main_frame') return {};
        
        const url = this.safeParseURL(details.url);
        const initiatorUrl = details.initiator ? this.safeParseURL(details.initiator) : null;
        
        if (url && initiatorUrl && url.hostname !== initiatorUrl.hostname) {
          this.trackThirdPartyRequest(initiatorUrl.hostname, url.hostname, details.type);
        }
        
        return {};
      },
      { urls: ['<all_urls>'] },
      ['requestBody']
    );
  }

  private setupTabListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && this.isValidHttpUrl(tab.url)) {
        this.initializeSiteData(tab.url);
      }
    });

    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && this.isValidHttpUrl(tab.url)) {
          this.initializeSiteData(tab.url);
        }
      } catch (error) {
        // Silently handle tab access errors
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
  }

  private trackThirdPartyRequest(sourceDomain: string, trackerDomain: string, requestType: string) {
    try {
      let siteData = this.siteData.get(sourceDomain);
      if (!siteData) {
        this.initializeSiteDataForDomain(sourceDomain);
        siteData = this.siteData.get(sourceDomain);
        if (!siteData) return;
      }

      // Prevent tracking invalid domains
      if (!trackerDomain || trackerDomain === sourceDomain) return;

      const existingTracker = siteData.trackers.find(t => t.domain === trackerDomain);
      if (existingTracker) {
        existingTracker.count = Math.min(existingTracker.count + 1, 1000); // Cap at 1000
      } else {
        // Prevent adding too many trackers
        if (siteData.trackers.length >= this.MAX_TRACKERS_PER_SITE) return;
        
        const trackerInfo = commonTrackers[trackerDomain as keyof typeof commonTrackers];
        const newTracker = {
          domain: trackerDomain,
          count: 1,
          category: trackerInfo?.category || 'unknown',
          blocked: this.isTrackerBlocked(trackerDomain)
        };
        siteData.trackers.push(newTracker);
      }

      // Recalculate trust score
      siteData.trustScore = TrustScoreCalculator.calculateScore(siteData.trackers);
      
      // Update data flow visualization
      this.updateDataFlow(siteData, sourceDomain, trackerDomain);
      
      this.siteData.set(sourceDomain, siteData);
    } catch (error) {
      // Silently handle tracking errors to prevent extension crashes
    }
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
  }

  private initializeSiteData(url: string) {
    const domain = this.getDomainFromURL(url);
    if (!domain) return;
    
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
    }
  }

  private initializeSiteDataForDomain(domain: string) {
    if (!this.siteData.has(domain)) {
      const newSiteData = {
        url: `https://${domain}`,
        trustScore: 100,
        trackers: [],
        dataFlow: {
          nodes: [],
          edges: []
        }
      };
      this.siteData.set(domain, newSiteData);
    }
  }

  async getSiteData(url: string): Promise<SiteData | null> {
    const domain = this.getDomainFromURL(url);
    if (!domain) return null;
    // Check LRU cache first (freshness: 24h)
    const cached = this.lruCache.get(domain);
    const now = Date.now();
    if (cached && (now - cached.timestamp < 24 * 60 * 60 * 1000)) {
      return cached.data;
    }
    // Not cached or stale, fetch/analyze as usual
    if (!this.siteData.has(domain)) {
      this.initializeSiteData(url);
    }
    const data = this.siteData.get(domain) || null;
    if (data) {
      this.lruCache.set(domain, { data, timestamp: now });
      this.saveCacheToStorage();
    }
    return data;
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
      switch (request.action) {
        case 'getSiteData':
          this.getSiteData(request.url).then(sendResponse);
          return true;
        
        case 'toggleBlocking':
          this.toggleTrackerBlocking(request.enabled).then(() => {
            sendResponse({ success: true });
          }).catch(() => {
            sendResponse({ success: false });
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
          const debugInfo = {
            trackedDomains: Array.from(this.siteData.keys()),
            totalSites: this.siteData.size,
            siteDataSnapshot: Array.from(this.siteData.entries()).map(([domain, data]) => ({
              domain,
              trackerCount: data.trackers.length,
              trustScore: data.trustScore
            }))
          };
          sendResponse(debugInfo);
          return true;

        case 'runFingerprint':
          if (request.tabId) {
            this.handleFingerprinting(request.tabId)
              .then(sendResponse)
              .catch(error => sendResponse({ success: false, error: error.message }));
          } else {
            sendResponse({ success: false, error: 'No tabId provided in the request.' });
          }
          return true;

        case 'performOptOut':
          this.performComprehensiveOptOut(request.url, request.tabId)
            .then(sendResponse)
            .catch((error: any) => sendResponse({ success: false, error: error.message }));
          return true;

        case 'clearKavachCache':
          this.lruCache = new LRUCache<string, { data: SiteData, timestamp: number }>(100);
          this.siteData.clear();
          chrome.storage.local.remove('kavachSiteDataCache', () => {
            sendResponse({ success: true });
          });
          return true;

        default:
          sendResponse({ error: 'Unknown action' });
          return false;
      }
    });
  }

  private storePrivacyPolicyUrls(siteUrl: string, policyUrls: string[]) {
    const domain = this.getDomainFromURL(siteUrl);
    if (domain && Array.isArray(policyUrls)) {
      this.privacyPolicyUrls.set(domain, policyUrls);
    }
  }

  async analyzePrivacyPolicy(siteUrl: string): Promise<any> {
    const domain = this.getDomainFromURL(siteUrl);
    if (!domain) {
      return { error: 'Invalid URL provided' };
    }
    // Check LRU cache for privacyAnalysis freshness (24h)
    const cached = this.lruCache.get(domain);
    const now = Date.now();
    if (cached && cached.data.privacyAnalysis && (now - (new Date(cached.data.privacyAnalysis.lastAnalyzed || 0).getTime()) < 24 * 60 * 60 * 1000)) {
      return cached.data.privacyAnalysis;
    }
    // Not cached or stale, call API
    try {
      const analysis = await PrivacyPolicyAnalyzer.analyzePolicy(siteUrl);
      // Store the analysis in site data
      const siteData = this.siteData.get(domain) || {
        url: siteUrl,
        trustScore: 100,
        trackers: [],
        dataFlow: { nodes: [], edges: [] }
      };
      if (analysis) {
        const processedAnalysis = {
          score: Math.max(0, Math.min(100, analysis.score || 50)),
          risks: Array.isArray(analysis.risks) ? analysis.risks.slice(0, 10) : [],
          summary: analysis.summary || 'Privacy policy analysis completed.',
          safety: ['SAFE', 'RISKY', 'UNSAFE'].includes(analysis.safety) ? analysis.safety : 'RISKY',
          dataSharing: Array.isArray(analysis.dataSharing) ? analysis.dataSharing.slice(0, 8) : [],
          industryType: analysis.industryType || 'Unknown',
          positiveFeatures: Array.isArray(analysis.positiveFeatures) ? analysis.positiveFeatures.slice(0, 5) : [],
          analysisDepth: analysis.analysisDepth || 'AI Analysis',
          lastAnalyzed: new Date().toISOString()
        };
        siteData.privacyAnalysis = processedAnalysis;
        this.siteData.set(domain, siteData);
        this.lruCache.set(domain, { data: siteData, timestamp: now });
        this.saveCacheToStorage();
        return processedAnalysis;
      }
      return analysis;
    } catch (error) {
      // Fallback
      const fallbackAnalysis = {
        score: 50,
        risks: ['Unable to analyze privacy policy - service temporarily unavailable'],
        summary: 'Privacy policy analysis failed. Please try again later or review the policy manually.',
        safety: 'RISKY' as const,
        dataSharing: [],
        industryType: 'Unknown',
        positiveFeatures: [],
        analysisDepth: 'Failed',
        lastAnalyzed: new Date().toISOString()
      };
      const siteData = this.siteData.get(domain);
      if (siteData) {
        siteData.privacyAnalysis = fallbackAnalysis;
        this.siteData.set(domain, siteData);
        this.lruCache.set(domain, { data: siteData, timestamp: now });
        this.saveCacheToStorage();
      }
      return fallbackAnalysis;
    }
  }

  async handleFingerprinting(tabId: number) {
    try {
      // First, check if we can access the tab
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('moz-extension://')) {
        throw new Error('Fingerprinting not available on browser internal pages');
      }

      // Inject the bundled fingerprinting script into the active tab's main world
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['fingerprint-agent.js'],
        world: 'MAIN'
      });

      // Now execute the code to run FingerprintJS in the main world
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: runFingerprintJSOpenSource,
        args: [],
        world: 'MAIN'
      });

      if (results && results[0] && results[0].result) {
        return results[0].result;
      } else {
        throw new Error('No result returned from fingerprinting script');
      }
    } catch (error: any) {
      console.error('Background fingerprinting error:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      if (errorMessage.includes('Cannot access') || errorMessage.includes('chrome://')) {
        errorMessage = 'Fingerprinting not available on this page type';
      } else if (errorMessage.includes('CSP') || errorMessage.includes('Content Security Policy')) {
        errorMessage = 'Website security policy blocks fingerprinting';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async performComprehensiveOptOut(url: string, tabId: number): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      const domain = this.getDomainFromURL(url);
      if (!domain) {
        throw new Error('Invalid URL provided');
      }

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
      
      return { 
        success: true, 
        message: `Comprehensive opt-out completed for ${domain}` 
      };

    } catch (error: any) {
      return { 
        success: false, 
        error: `Opt-out failed: ${error.message}` 
      };
    }
  }

  private async addDomainToBlockList(domain: string): Promise<void> {
    try {
      const storage = await chrome.storage.local.get(['blockedDomains']);
      const blockedDomains = storage.blockedDomains || [];
      
      if (!blockedDomains.includes(domain)) {
        blockedDomains.push(domain);
        await chrome.storage.local.set({ blockedDomains });
      }
    } catch (error) {
      // Silently handle storage errors
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
    } catch (error) {
      // Silently handle cleanup errors
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

      // Enhanced blocking for specific domains
      if (domain.includes('youtube.com') || domain.includes('google.com')) {
        const baseId = Date.now();
        newRules.push(
          {
            id: baseId + 1,
            priority: 2,
            action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
            condition: {
              urlFilter: '*youtube.com/api/stats*',
              resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType]
            }
          },
          {
            id: baseId + 2,
            priority: 2,
            action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
            condition: {
              urlFilter: '*youtube.com/youtubei/v1/log_event*',
              resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType]
            }
          },
          {
            id: baseId + 3,
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
    } catch (error) {
      // Silently handle rule creation errors
    }
  }

  private cleanupOldData(): void {
    // Limit the number of stored site data entries
    if (this.siteData.size > this.MAX_SITE_DATA_ENTRIES) {
      const entries = Array.from(this.siteData.entries());
      const sortedEntries = entries.sort((a, b) => {
        const aTime = a[1].privacyAnalysis?.lastAnalyzed || '0';
        const bTime = b[1].privacyAnalysis?.lastAnalyzed || '0';
        return aTime.localeCompare(bTime);
      });
      
      // Remove oldest entries
      const toRemove = sortedEntries.slice(0, this.siteData.size - this.MAX_SITE_DATA_ENTRIES);
      toRemove.forEach(([domain]) => {
        this.siteData.delete(domain);
      });
    }
    
    // Limit trackers per site to prevent memory bloat
    this.siteData.forEach((siteData, domain) => {
      if (siteData.trackers.length > this.MAX_TRACKERS_PER_SITE) {
        // Keep only the most frequent trackers
        siteData.trackers = siteData.trackers
          .sort((a, b) => b.count - a.count)
          .slice(0, this.MAX_TRACKERS_PER_SITE);
        
        // Recalculate trust score after cleanup
        siteData.trustScore = TrustScoreCalculator.calculateScore(siteData.trackers);
      }
    });
  }

  // Load LRU cache from chrome.storage.local
  private async loadCacheFromStorage() {
    try {
      const result = await chrome.storage.local.get(['kavachSiteDataCache']);
      if (result.kavachSiteDataCache) {
        this.lruCache.fromJSON(result.kavachSiteDataCache);
      }
    } catch (e) {
      // Ignore
    }
  }

  // Save LRU cache to chrome.storage.local
  private async saveCacheToStorage() {
    try {
      await chrome.storage.local.set({
        kavachSiteDataCache: this.lruCache.toJSON()
      });
    } catch (e) {
      // Ignore
    }
  }
}

// This function gets injected into the webpage to run the open source FingerprintJS
function runFingerprintJSOpenSource() {
  return new Promise((resolve) => {
    // The FingerprintJS object is now available on the window
    // thanks to the injected fingerprint-agent.js script.
    async function initializeFingerprint() {
      try {
        const fp = await (window as any).FingerprintJS.load();
        const result = await fp.get();
        
        // Simulate some additional data that was available in Pro for backward compatibility
        const mockBotDetection = {
          probability: Math.random() > 0.8 ? 0.8 : 0.1, // Random bot probability for demo
          type: Math.random() > 0.8 ? 'likely' : 'unlikely'
        };
        
        resolve({
          success: true,
          data: {
            visitorId: result.visitorId,
            confidence: { score: 0.95 }, // Open source doesn't provide confidence, so we mock it
            bot: mockBotDetection,
            components: result.components,
            timestamp: Date.now(),
            lastSeen: Date.now() - Math.floor(Math.random() * 86400000) // Random last seen within 24h
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

// Keep the old Pro function for reference but mark it as deprecated
function runFingerprintJS(apiKey: string) {
  return new Promise((resolve) => {
    resolve({
      success: false,
      error: 'Pro version has been deprecated. Using open source version instead.'
    });
  });
}

const backgroundService = new BackgroundService();

export {};
