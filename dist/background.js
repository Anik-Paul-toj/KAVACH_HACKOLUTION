/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/utils/privacy.ts":
/*!******************************!*\
  !*** ./src/utils/privacy.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OptOutManager: () => (/* binding */ OptOutManager),
/* harmony export */   PrivacyPolicyAnalyzer: () => (/* binding */ PrivacyPolicyAnalyzer),
/* harmony export */   TrustScoreCalculator: () => (/* binding */ TrustScoreCalculator),
/* harmony export */   commonTrackers: () => (/* binding */ commonTrackers)
/* harmony export */ });
class TrustScoreCalculator {
    static calculateScore(trackers, privacyRisks = []) {
        let score = 100;
        // Deduct points for trackers
        const trackerPenalty = Math.min(trackers.length * 5, 40);
        score -= trackerPenalty;
        // Deduct points for high-risk trackers
        const highRiskTrackers = trackers.filter(t => ['advertising', 'social', 'analytics'].includes(t.category));
        score -= highRiskTrackers.length * 3;
        // Deduct points for privacy policy risks
        score -= Math.min(privacyRisks.length * 8, 30);
        return Math.max(0, Math.min(100, score));
    }
}
class PrivacyPolicyAnalyzer {
    static async analyzePolicy(url) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/privacy-policy/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Analysis failed');
            }
            return result.data;
        }
        catch (error) {
            // Return enhanced fallback data based on error type
            const fallbackAnalysis = {
                score: 50,
                risks: ['Unable to analyze privacy policy - please review manually'],
                summary: 'Privacy policy analysis failed. This could be due to network issues, missing privacy policy, or service unavailability.',
                safety: 'RISKY',
                dataSharing: [],
                industryType: 'Unknown',
                positiveFeatures: [],
                analysisDepth: 'Failed',
                lastAnalyzed: new Date().toISOString()
            };
            // Provide more specific feedback based on error type
            if (error instanceof Error) {
                if (error.message.includes('timeout') || error.message.includes('AbortError')) {
                    fallbackAnalysis.summary = 'Privacy policy analysis timed out. The website may be slow to respond.';
                }
                else if (error.message.includes('404') || error.message.includes('not found')) {
                    fallbackAnalysis.summary = 'No privacy policy was found on this website.';
                    fallbackAnalysis.score = 30;
                    fallbackAnalysis.risks = ['No privacy policy found', 'Data practices unclear', 'User rights undefined'];
                }
                else if (error.message.includes('network') || error.message.includes('fetch')) {
                    fallbackAnalysis.summary = 'Unable to connect to privacy analysis service.';
                }
            }
            return fallbackAnalysis;
        }
    }
    /**
     * Find privacy policy URL for a website
     */
    static async findPrivacyPolicyUrl(url) {
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
        }
        catch (error) {
            console.error('Failed to find privacy policy URL:', error);
            return null;
        }
    }
}
// Production Render API endpoint
PrivacyPolicyAnalyzer.API_BASE_URL =  false
    ? 0
    : 'https://kavach-hackolution.onrender.com/api'; // Use production API for both dev and prod
const commonTrackers = {
    'doubleclick.net': { category: 'advertising', name: 'Google DoubleClick' },
    'googletagmanager.com': { category: 'analytics', name: 'Google Tag Manager' },
    'facebook.com': { category: 'social', name: 'Facebook Pixel' },
    'google-analytics.com': { category: 'analytics', name: 'Google Analytics' },
    'connect.facebook.net': { category: 'social', name: 'Facebook Connect' },
    'amazon-adsystem.com': { category: 'advertising', name: 'Amazon Advertising' },
    'twitter.com': { category: 'social', name: 'Twitter Analytics' },
    'linkedin.com': { category: 'social', name: 'LinkedIn Insights' }
};
class OptOutManager {
    static getOptOutStrategy(domain) {
        // Find matching strategy for domain or subdomain
        const strategies = Object.keys(this.OPT_OUT_STRATEGIES);
        const matchingStrategy = strategies.find(strategyDomain => domain.includes(strategyDomain) || strategyDomain.includes(domain));
        return matchingStrategy ? this.OPT_OUT_STRATEGIES[matchingStrategy] : null;
    }
    static getUniversalOptOutCookies() {
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
    static getUniversalOptOutSelectors() {
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
    static getTrackingDomainsToBlock() {
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
// Website-specific opt-out mechanisms
OptOutManager.OPT_OUT_STRATEGIES = {
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


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_privacy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/privacy */ "./src/utils/privacy.ts");

// LRU Cache for SiteData with persistence
class LRUCache {
    constructor(maxEntries) {
        this.maxEntries = maxEntries;
        this.map = new Map();
    }
    get(key) {
        if (!this.map.has(key))
            return undefined;
        const value = this.map.get(key);
        // Move to end (most recently used)
        this.map.delete(key);
        this.map.set(key, value);
        console.log(`[LRUCache] HIT for key:`, key);
        return value;
    }
    set(key, value) {
        if (this.map.has(key)) {
            this.map.delete(key);
            console.log(`[LRUCache] UPDATE for key:`, key);
        }
        else if (this.map.size >= this.maxEntries) {
            // Remove least recently used
            const iterator = this.map.keys();
            const lruKey = iterator.next().value;
            if (lruKey !== undefined) {
                this.map.delete(lruKey);
                console.log(`[LRUCache] EVICTED least recently used key:`, lruKey);
            }
            console.log(`[LRUCache] SET (new, after eviction if needed) for key:`, key);
        }
        else {
            console.log(`[LRUCache] SET (new) for key:`, key);
        }
        this.map.set(key, value);
    }
    delete(key) {
        this.map.delete(key);
    }
    has(key) {
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
    toJSON() {
        return Array.from(this.map.entries());
    }
    fromJSON(entries) {
        this.map = new Map(entries);
    }
}
class BackgroundService {
    constructor() {
        this.siteData = new Map();
        this.blockedRequests = new Map();
        this.privacyPolicyUrls = new Map();
        this.MAX_SITE_DATA_ENTRIES = 100; // Prevent memory bloat
        this.MAX_TRACKERS_PER_SITE = 50; // Limit trackers per site
        this.lruCache = new LRUCache(100); // 100 entries max
        this.setupRequestBlocking();
        this.setupTabListeners();
        this.setupMessageListeners();
        this.loadCacheFromStorage();
        setInterval(() => this.cleanupOldData(), 300000); // Every 5 minutes
        setInterval(() => this.saveCacheToStorage(), 60000); // Save cache every 1 min
    }
    safeParseURL(url) {
        try {
            if (!url || typeof url !== 'string')
                return null;
            return new URL(url);
        }
        catch {
            return null;
        }
    }
    getDomainFromURL(url) {
        const parsedUrl = this.safeParseURL(url);
        return parsedUrl ? parsedUrl.hostname : null;
    }
    setupRequestBlocking() {
        // Monitor web requests to track third-party requests
        chrome.webRequest.onBeforeRequest.addListener((details) => {
            if (details.type === 'main_frame')
                return {};
            const url = this.safeParseURL(details.url);
            const initiatorUrl = details.initiator ? this.safeParseURL(details.initiator) : null;
            if (url && initiatorUrl && url.hostname !== initiatorUrl.hostname) {
                this.trackThirdPartyRequest(initiatorUrl.hostname, url.hostname, details.type);
            }
            return {};
        }, { urls: ['<all_urls>'] }, ['requestBody']);
    }
    setupTabListeners() {
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
            }
            catch (error) {
                // Silently handle tab access errors
            }
        });
    }
    isValidHttpUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    trackThirdPartyRequest(sourceDomain, trackerDomain, requestType) {
        try {
            let siteData = this.siteData.get(sourceDomain);
            if (!siteData) {
                this.initializeSiteDataForDomain(sourceDomain);
                siteData = this.siteData.get(sourceDomain);
                if (!siteData)
                    return;
            }
            // Prevent tracking invalid domains
            if (!trackerDomain || trackerDomain === sourceDomain)
                return;
            const existingTracker = siteData.trackers.find(t => t.domain === trackerDomain);
            if (existingTracker) {
                existingTracker.count = Math.min(existingTracker.count + 1, 1000); // Cap at 1000
            }
            else {
                // Prevent adding too many trackers
                if (siteData.trackers.length >= this.MAX_TRACKERS_PER_SITE)
                    return;
                const trackerInfo = _utils_privacy__WEBPACK_IMPORTED_MODULE_0__.commonTrackers[trackerDomain];
                const newTracker = {
                    domain: trackerDomain,
                    count: 1,
                    category: trackerInfo?.category || 'unknown',
                    blocked: this.isTrackerBlocked(trackerDomain)
                };
                siteData.trackers.push(newTracker);
            }
            // Recalculate trust score
            siteData.trustScore = _utils_privacy__WEBPACK_IMPORTED_MODULE_0__.TrustScoreCalculator.calculateScore(siteData.trackers);
            // Update data flow visualization
            this.updateDataFlow(siteData, sourceDomain, trackerDomain);
            this.siteData.set(sourceDomain, siteData);
        }
        catch (error) {
            // Silently handle tracking errors to prevent extension crashes
        }
    }
    isTrackerBlocked(domain) {
        // Check if domain is in our blocking rules
        const blockedDomains = ['doubleclick.net', 'googletagmanager.com', 'facebook.com/tr'];
        return blockedDomains.some(blocked => domain.includes(blocked));
    }
    updateDataFlow(siteData, source, tracker) {
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
    initializeSiteData(url) {
        const domain = this.getDomainFromURL(url);
        if (!domain)
            return;
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
    initializeSiteDataForDomain(domain) {
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
    async getSiteData(url) {
        const domain = this.getDomainFromURL(url);
        if (!domain)
            return null;
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
    async toggleTrackerBlocking(enabled) {
        // Toggle declarative net request rules
        const ruleIds = [1, 2, 3, 4, 5]; // IDs from rules.json
        if (enabled) {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ['tracker_rules']
            });
        }
        else {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ['tracker_rules']
            });
        }
    }
    setupMessageListeners() {
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
                    }
                    else {
                        sendResponse({ success: false, error: 'No tabId provided in the request.' });
                    }
                    return true;
                case 'performOptOut':
                    this.performComprehensiveOptOut(request.url, request.tabId)
                        .then(sendResponse)
                        .catch((error) => sendResponse({ success: false, error: error.message }));
                    return true;
                case 'clearKavachCache':
                    this.lruCache = new LRUCache(100);
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
    storePrivacyPolicyUrls(siteUrl, policyUrls) {
        const domain = this.getDomainFromURL(siteUrl);
        if (domain && Array.isArray(policyUrls)) {
            this.privacyPolicyUrls.set(domain, policyUrls);
        }
    }
    async analyzePrivacyPolicy(siteUrl) {
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
            const analysis = await _utils_privacy__WEBPACK_IMPORTED_MODULE_0__.PrivacyPolicyAnalyzer.analyzePolicy(siteUrl);
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
        }
        catch (error) {
            // Fallback
            const fallbackAnalysis = {
                score: 50,
                risks: ['Unable to analyze privacy policy - service temporarily unavailable'],
                summary: 'Privacy policy analysis failed. Please try again later or review the policy manually.',
                safety: 'RISKY',
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
    async handleFingerprinting(tabId) {
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
            }
            else {
                throw new Error('No result returned from fingerprinting script');
            }
        }
        catch (error) {
            console.error('Background fingerprinting error:', error);
            // Provide more user-friendly error messages
            let errorMessage = error.message;
            if (errorMessage.includes('Cannot access') || errorMessage.includes('chrome://')) {
                errorMessage = 'Fingerprinting not available on this page type';
            }
            else if (errorMessage.includes('CSP') || errorMessage.includes('Content Security Policy')) {
                errorMessage = 'Website security policy blocks fingerprinting';
            }
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    async performComprehensiveOptOut(url, tabId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Opt-out failed: ${error.message}`
            };
        }
    }
    async addDomainToBlockList(domain) {
        try {
            const storage = await chrome.storage.local.get(['blockedDomains']);
            const blockedDomains = storage.blockedDomains || [];
            if (!blockedDomains.includes(domain)) {
                blockedDomains.push(domain);
                await chrome.storage.local.set({ blockedDomains });
            }
        }
        catch (error) {
            // Silently handle storage errors
        }
    }
    clearDomainTrackingData(domain) {
        try {
            // Remove from site data
            this.siteData.delete(domain);
            // Clear blocked requests count
            const keysToDelete = Array.from(this.blockedRequests.keys())
                .filter(key => key.includes(domain));
            keysToDelete.forEach(key => this.blockedRequests.delete(key));
        }
        catch (error) {
            // Silently handle cleanup errors
        }
    }
    async enableEnhancedBlockingForDomain(domain) {
        try {
            // Create dynamic rules to block requests from this domain
            const newRules = [
                {
                    id: Date.now(),
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        initiatorDomains: [domain],
                        resourceTypes: [
                            'script',
                            'xmlhttprequest',
                            'image',
                            'media',
                            'font',
                            'websocket'
                        ]
                    }
                }
            ];
            // Enhanced blocking for specific domains
            if (domain.includes('youtube.com') || domain.includes('google.com')) {
                const baseId = Date.now();
                newRules.push({
                    id: baseId + 1,
                    priority: 2,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*youtube.com/api/stats*',
                        resourceTypes: ['xmlhttprequest']
                    }
                }, {
                    id: baseId + 2,
                    priority: 2,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*youtube.com/youtubei/v1/log_event*',
                        resourceTypes: ['xmlhttprequest']
                    }
                }, {
                    id: baseId + 3,
                    priority: 2,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*youtube.com/ptracking*',
                        resourceTypes: ['xmlhttprequest', 'image']
                    }
                });
            }
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: newRules
            });
        }
        catch (error) {
            // Silently handle rule creation errors
        }
    }
    cleanupOldData() {
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
                siteData.trustScore = _utils_privacy__WEBPACK_IMPORTED_MODULE_0__.TrustScoreCalculator.calculateScore(siteData.trackers);
            }
        });
    }
    // Load LRU cache from chrome.storage.local
    async loadCacheFromStorage() {
        try {
            const result = await chrome.storage.local.get(['kavachSiteDataCache']);
            if (result.kavachSiteDataCache) {
                this.lruCache.fromJSON(result.kavachSiteDataCache);
            }
        }
        catch (e) {
            // Ignore
        }
    }
    // Save LRU cache to chrome.storage.local
    async saveCacheToStorage() {
        try {
            await chrome.storage.local.set({
                kavachSiteDataCache: this.lruCache.toJSON()
            });
        }
        catch (e) {
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
                const fp = await window.FingerprintJS.load();
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
            }
            catch (error) {
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
            if (window.FingerprintJS) {
                clearInterval(interval);
                initializeFingerprint();
            }
            else if (checks > 50) { // Timeout after 5 seconds
                clearInterval(interval);
                resolve({ success: false, error: 'FingerprintJS object not found after script injection.' });
            }
        }, 100);
    });
}
// Keep the old Pro function for reference but mark it as deprecated
function runFingerprintJS(apiKey) {
    return new Promise((resolve) => {
        resolve({
            success: false,
            error: 'Pro version has been deprecated. Using open source version instead.'
        });
    });
}
const backgroundService = new BackgroundService();

})();

/******/ })()
;
//# sourceMappingURL=background.js.map