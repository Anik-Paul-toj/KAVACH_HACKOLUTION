import axios from 'axios';
import * as cheerio from 'cheerio';
import * as url from 'url';

export interface ScrapedContent {
  text: string;
  url: string;
  title: string;
  lastModified?: string;
}

export interface CrawlResult {
  privacyPolicyUrl: string | null;
  foundUrls: string[];
  crawledPages: number;
  method: 'direct' | 'sitemap' | 'crawl' | 'robots' | 'fallback';
}

export class PolicyScraper {
  private static readonly PRIVACY_KEYWORDS = [
    'privacy policy', 'privacy notice', 'data policy', 'cookie policy',
    'privacy statement', 'data protection', 'privacy practices',
    'terms of service', 'user agreement', 'data usage', 'information collection',
    'gdpr', 'ccpa', 'data rights', 'personal information', 'cookies',
    'tracking', 'analytics', 'third party', 'data sharing', 'personal data',
    'data controller', 'data processor', 'opt-out', 'consent', 'transparency',
    'data retention', 'security policy', 'privacy rights', 'user privacy',
    'data collection policy', 'information policy', 'user data', 'privacy settings'
  ];

  private static readonly PRIVACY_SELECTORS = [
    // Direct privacy links
    'a[href*="privacy"]', 'a[href*="cookie"]', 'a[href*="data-policy"]',
    'a[href*="data-protection"]', 'a[href*="terms"]', 'a[href*="legal"]',
    
    // CSS classes and IDs
    '.privacy-policy', '.privacy-link', '.privacy', '.cookie-policy',
    '#privacy-policy', '#privacy', '#cookies', '#data-protection',
    
    // Data attributes
    '[data-testid*="privacy"]', '[data-cy*="privacy"]', '[data-qa*="privacy"]',
    '[aria-label*="privacy"]', '[title*="privacy"]',
    
    // Common footer patterns
    'footer a', '.footer a', '.footer-links a', '.legal-links a',
    '.site-footer a', '.page-footer a', '.bottom-links a',
    
    // Navigation patterns
    '.nav-legal a', '.legal-nav a', '.secondary-nav a',
    '.utility-nav a', '.footer-nav a', '.legal a',
    
    // Text-based matching
    'a:contains("Privacy")', 'a:contains("Cookie")', 'a:contains("Data")',
    'a:contains("Terms")', 'a:contains("Legal")', 'a:contains("GDPR")',
    'a:contains("CCPA")', 'a:contains("Policy")'
  ];

  private static readonly CRAWL_ROUTES = [
    // Homepage and main sections
    '/', '/home', '/index.html', '/index.php',
    
    // About and company pages
    '/about', '/about-us', '/company', '/who-we-are', '/our-company',
    '/about/privacy', '/about/legal', '/about/policies',
    
    // Legal and policy sections
    '/legal', '/policies', '/terms', '/compliance', '/governance',
    '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/data-protection',
    '/policies/privacy', '/policies/data', '/policies/cookies',
    
    // Privacy-specific routes
    '/privacy', '/privacy-policy', '/privacy-notice', '/privacy-statement',
    '/data-policy', '/data-protection', '/cookie-policy', '/cookies',
    '/privacy.html', '/privacy.php', '/privacy.aspx', '/privacy/',
    '/privacy-policy.html', '/privacy-policy.php', '/privacy-policy/',
    
    // Help and support sections
    '/help', '/support', '/faq', '/contact', '/customer-service',
    '/help/privacy', '/support/privacy', '/help/legal',
    
    // User account related
    '/account', '/profile', '/settings', '/preferences', '/dashboard',
    '/account/privacy', '/settings/privacy', '/user/privacy',
    
    // Language variants
    '/en/privacy', '/us/privacy', '/privacy/en', '/en/privacy-policy',
    '/en-us/privacy', '/english/privacy',
    
    // Common subdirectories
    '/page/privacy', '/pages/privacy', '/static/privacy', '/docs/privacy',
    '/document/privacy', '/info/privacy', '/information/privacy',
    
    // WordPress/CMS common paths
    '/wp-content/themes/*/privacy', '/sites/default/files/privacy',
    
    // Mobile and app versions
    '/m/privacy', '/mobile/privacy', '/app/privacy'
  ];

  private static readonly MAX_CRAWL_DEPTH = 3;
  private static readonly MAX_PAGES_TO_CRAWL = 50;
  private static readonly CRAWL_DELAY_MS = 500;

  /**
   * Enhanced privacy policy discovery with comprehensive crawling
   */
  static async findPrivacyPolicyUrl(baseUrl: string): Promise<CrawlResult> {
    console.log(`🔍 Starting comprehensive privacy policy search for: ${baseUrl}`);
    
    try {
      // Method 1: Direct route testing (fastest)
      console.log('📍 Method 1: Testing direct privacy policy routes...');
      const directResult = await this.testDirectRoutes(baseUrl);
      if (directResult.privacyPolicyUrl) {
        console.log(`✅ Found via direct route: ${directResult.privacyPolicyUrl}`);
        return { ...directResult, method: 'direct' };
      }

      // Method 2: Parse robots.txt
      console.log('🤖 Method 2: Checking robots.txt for privacy policy links...');
      const robotsResult = await this.parseRobotsTxt(baseUrl);
      if (robotsResult.privacyPolicyUrl) {
        console.log(`✅ Found via robots.txt: ${robotsResult.privacyPolicyUrl}`);
        return { ...robotsResult, method: 'robots' };
      }

      // Method 3: Parse sitemap.xml
      console.log('🗺️  Method 3: Parsing sitemap.xml for privacy policy...');
      const sitemapResult = await this.parseSitemap(baseUrl);
      if (sitemapResult.privacyPolicyUrl) {
        console.log(`✅ Found via sitemap: ${sitemapResult.privacyPolicyUrl}`);
        return { ...sitemapResult, method: 'sitemap' };
      }

      // Method 4: Comprehensive site crawling
      console.log('🕷️  Method 4: Starting comprehensive site crawl...');
      const crawlResult = await this.comprehensiveCrawl(baseUrl);
      if (crawlResult.privacyPolicyUrl) {
        console.log(`✅ Found via crawling: ${crawlResult.privacyPolicyUrl}`);
        return { ...crawlResult, method: 'crawl' };
      }

      // Method 5: Last resort fallback
      console.log('🆘 Method 5: Using fallback discovery methods...');
      const fallbackResult = await this.tryFallbackPolicyDiscovery(baseUrl);
      
      return {
        privacyPolicyUrl: fallbackResult,
        foundUrls: fallbackResult ? [fallbackResult] : [],
        crawledPages: 0,
        method: 'fallback'
      };

    } catch (error) {
      console.error('❌ Error in comprehensive privacy policy search:', error);
      return {
        privacyPolicyUrl: null,
        foundUrls: [],
        crawledPages: 0,
        method: 'fallback'
      };
    }
  }

  /**
   * Test direct privacy policy routes
   */
  private static async testDirectRoutes(baseUrl: string): Promise<CrawlResult> {
    const foundUrls: string[] = [];
    let crawledPages = 0;

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    for (const route of this.CRAWL_ROUTES) {
      try {
        const testUrl = new URL(route, baseUrl).toString();
        
        // Test if URL exists and is accessible
        const response = await axios.head(testUrl, {
          timeout: 8000,
          maxRedirects: 3,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache'
          },
          validateStatus: (status) => status < 400
        });

        if (response.status === 200) {
          foundUrls.push(testUrl);
          crawledPages++;

          // If this looks like a privacy policy URL, test its content
          if (this.isLikelyPrivacyUrl(testUrl)) {
            const hasPrivacyContent = await this.validatePrivacyContent(testUrl);
            if (hasPrivacyContent) {
              return {
                privacyPolicyUrl: testUrl,
                foundUrls,
                crawledPages,
                method: 'direct'
              };
            }
          }
        }

        // Add small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Continue to next route
        continue;
      }
    }

    return { privacyPolicyUrl: null, foundUrls, crawledPages, method: 'direct' };
  }

  /**
   * Parse robots.txt for privacy policy references
   */
  private static async parseRobotsTxt(baseUrl: string): Promise<CrawlResult> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await axios.get(robotsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PrivacyPolicyBot/1.0)'
        }
      });

      const robotsContent = response.data;
      const foundUrls: string[] = [];

      // Look for privacy policy mentions in robots.txt
      const lines = robotsContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();
        
        // Check comments and allow/disallow rules
        if (trimmedLine.includes('privacy') || trimmedLine.includes('policy') || 
            trimmedLine.includes('legal') || trimmedLine.includes('terms')) {
          
          // Extract URLs from the line
          const urlMatch = line.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            foundUrls.push(urlMatch[0]);
          }
          
          // Extract paths
          const pathMatch = line.match(/\/[^\s]+/);
          if (pathMatch) {
            try {
              const fullUrl = new URL(pathMatch[0], baseUrl).toString();
              foundUrls.push(fullUrl);
            } catch {
              continue;
            }
          }
        }
      }

      // Test found URLs
      for (const testUrl of foundUrls) {
        const hasPrivacyContent = await this.validatePrivacyContent(testUrl);
        if (hasPrivacyContent) {
          return {
            privacyPolicyUrl: testUrl,
            foundUrls,
            crawledPages: 1,
            method: 'robots'
          };
        }
      }

      return { privacyPolicyUrl: null, foundUrls, crawledPages: 1, method: 'robots' };
    } catch {
      return { privacyPolicyUrl: null, foundUrls: [], crawledPages: 0, method: 'robots' };
    }
  }

  /**
   * Parse sitemap.xml for privacy policy pages
   */
  private static async parseSitemap(baseUrl: string): Promise<CrawlResult> {
    const foundUrls: string[] = [];
    let crawledPages = 0;

    const sitemapUrls = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemaps.xml',
      '/sitemap/sitemap.xml',
      '/wp-sitemap.xml'
    ];

    for (const sitemapPath of sitemapUrls) {
      try {
        const sitemapUrl = new URL(sitemapPath, baseUrl).toString();
        const response = await axios.get(sitemapUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PrivacyPolicyBot/1.0)',
            'Accept': 'application/xml,text/xml,*/*'
          }
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        crawledPages++;

        // Parse XML sitemap
        $('url loc, sitemap loc').each((_, element) => {
          const url = $(element).text().trim();
          if (url && this.isLikelyPrivacyUrl(url)) {
            foundUrls.push(url);
          }
        });

        // Test found privacy URLs
        for (const testUrl of foundUrls) {
          const hasPrivacyContent = await this.validatePrivacyContent(testUrl);
          if (hasPrivacyContent) {
            return {
              privacyPolicyUrl: testUrl,
              foundUrls,
              crawledPages,
              method: 'sitemap'
            };
          }
        }

      } catch {
        continue;
      }
    }

    return { privacyPolicyUrl: null, foundUrls, crawledPages, method: 'sitemap' };
  }

  /**
   * Comprehensive website crawling
   */
  private static async comprehensiveCrawl(baseUrl: string): Promise<CrawlResult> {
    const foundUrls: string[] = [];
    const crawledUrls = new Set<string>();
    const toCrawl: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }];
    let crawledPages = 0;

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    while (toCrawl.length > 0 && crawledPages < this.MAX_PAGES_TO_CRAWL) {
      const { url: currentUrl, depth } = toCrawl.shift()!;
      
      if (crawledUrls.has(currentUrl) || depth > this.MAX_CRAWL_DEPTH) {
        continue;
      }

      try {
        console.log(`🔍 Crawling: ${currentUrl} (depth: ${depth})`);
        crawledUrls.add(currentUrl);
        crawledPages++;

        const response = await axios.get(currentUrl, {
          timeout: 15000,
          maxRedirects: 3,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });

        const $ = cheerio.load(response.data);
        
        // Search for privacy policy links on this page
        const pagePrivacyUrls = this.extractPrivacyLinks($, currentUrl);
        foundUrls.push(...pagePrivacyUrls);

        // Test found privacy URLs immediately
        for (const privacyUrl of pagePrivacyUrls) {
          const hasPrivacyContent = await this.validatePrivacyContent(privacyUrl);
          if (hasPrivacyContent) {
            console.log(`✅ Found valid privacy policy: ${privacyUrl}`);
            return {
              privacyPolicyUrl: privacyUrl,
              foundUrls,
              crawledPages,
              method: 'crawl'
            };
          }
        }

        // Add more URLs to crawl (only if we haven't gone too deep)
        if (depth < this.MAX_CRAWL_DEPTH) {
          const nextUrls = this.extractCrawlableLinks($, baseUrl, currentUrl);
          for (const nextUrl of nextUrls.slice(0, 10)) { // Limit to prevent explosion
            if (!crawledUrls.has(nextUrl)) {
              toCrawl.push({ url: nextUrl, depth: depth + 1 });
            }
          }
        }

        // Respectful crawling delay
        await new Promise(resolve => setTimeout(resolve, this.CRAWL_DELAY_MS));

      } catch (error) {
        console.log(`⚠️  Failed to crawl ${currentUrl}:`, error.message);
        continue;
      }
    }

    console.log(`🔍 Crawling completed. Visited ${crawledPages} pages, found ${foundUrls.length} potential privacy URLs`);
    
    return {
      privacyPolicyUrl: foundUrls[0] || null,
      foundUrls,
      crawledPages,
      method: 'crawl'
    };
  }

  /**
   * Extract privacy policy links from a page
   */
  private static extractPrivacyLinks($: cheerio.Root, baseUrl: string): string[] {
    const foundUrls = new Set<string>();

    // Use all privacy selectors
    for (const selector of this.PRIVACY_SELECTORS) {
      try {
        const links = $(selector);
        for (let i = 0; i < links.length; i++) {
          const link = $(links[i]);
          const href = link.attr('href');
          const text = link.text().toLowerCase().trim();
          const title = link.attr('title')?.toLowerCase() || '';
          const ariaLabel = link.attr('aria-label')?.toLowerCase() || '';
          
          if (href && this.isPrivacyRelated(text, href, title, ariaLabel)) {
            const normalizedUrl = this.normalizeUrl(href, baseUrl);
            if (normalizedUrl && this.isValidPrivacyUrl(normalizedUrl)) {
              foundUrls.add(normalizedUrl);
            }
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(foundUrls);
  }

  /**
   * Extract crawlable links from a page
   */
  private static extractCrawlableLinks($: cheerio.Root, baseUrl: string, currentUrl: string): string[] {
    const links = new Set<string>();
    const baseHost = new URL(baseUrl).hostname;

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const fullUrl = this.normalizeUrl(href, currentUrl);
        const urlObj = new URL(fullUrl);
        
        // Only crawl same domain
        if (urlObj.hostname === baseHost) {
          const path = urlObj.pathname.toLowerCase();
          
          // Prioritize pages that might contain privacy links
          if (this.isCrawlableRoute(path)) {
            links.add(fullUrl);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  /**
   * Check if a route is worth crawling
   */
  private static isCrawlableRoute(path: string): boolean {
    const importantRoutes = [
      'about', 'legal', 'help', 'support', 'contact', 'company',
      'terms', 'privacy', 'policy', 'footer', 'sitemap'
    ];

    const skipRoutes = [
      'login', 'register', 'cart', 'checkout', 'search', 'api',
      'admin', 'wp-admin', 'images', 'css', 'js', 'assets'
    ];

    const pathLower = path.toLowerCase();

    // Skip certain routes
    if (skipRoutes.some(skip => pathLower.includes(skip))) {
      return false;
    }

    // Prioritize important routes
    if (importantRoutes.some(route => pathLower.includes(route))) {
      return true;
    }

    // Skip very deep paths or those with many parameters
    const segments = path.split('/').filter(s => s.length > 0);
    return segments.length <= 4 && !path.includes('?') && !path.includes('#');
  }

  /**
   * Check if URL likely contains privacy policy
   */
  private static isLikelyPrivacyUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    const privacyIndicators = [
      'privacy', 'policy', 'legal', 'terms', 'cookie', 'data-protection',
      'gdpr', 'ccpa', 'compliance'
    ];

    return privacyIndicators.some(indicator => urlLower.includes(indicator));
  }

  /**
   * Validate that a URL actually contains privacy policy content
   */
  private static async validatePrivacyContent(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      const $ = cheerio.load(response.data);
      const text = $('body').text().toLowerCase();

      // Check for privacy policy indicators
      const privacyIndicators = [
        'personal information', 'data collection', 'privacy policy',
        'we collect', 'your information', 'data processing',
        'cookies', 'third parties', 'data sharing'
      ];

      const indicatorCount = privacyIndicators.filter(indicator => 
        text.includes(indicator)
      ).length;

      // Must have at least 3 privacy indicators and substantial content
      return indicatorCount >= 3 && text.length > 1000;

    } catch {
      return false;
    }
  }

  private static async tryFallbackPolicyDiscovery(baseUrl: string): Promise<string | null> {
    try {
      // Try common privacy policy URLs without checking the main page
      const commonPaths = [
        '/privacy-policy', '/privacy', '/legal/privacy', '/privacy.html'
      ];

      for (const path of commonPaths) {
        try {
          const testUrl = new URL(path, baseUrl).toString();
          
          // Try with minimal headers to avoid detection
          const testResponse = await axios.head(testUrl, { 
            timeout: 5000,
            headers: {
              'User-Agent': 'curl/7.68.0',  // Very basic user agent
              'Accept': '*/*'
            }
          });
          
          if (testResponse.status === 200) {
            console.log(`✅ Found privacy policy via fallback: ${testUrl}`);
            return testUrl;
          }
        } catch {
          continue;
        }
      }

      console.log(`⚠️  Could not find privacy policy for ${baseUrl} - all methods failed`);
      return null;
    } catch (error) {
      console.error('Fallback policy discovery failed:', error);
      return null;
    }
  }

  private static isPrivacyRelated(text: string, href: string, title: string = '', ariaLabel: string = ''): boolean {
    const searchText = `${text} ${href.toLowerCase()} ${title} ${ariaLabel}`.toLowerCase();
    
    return this.PRIVACY_KEYWORDS.some(keyword => 
      searchText.includes(keyword) || 
      href.toLowerCase().includes(keyword.replace(/\s+/g, '-')) ||
      href.toLowerCase().includes(keyword.replace(/\s+/g, '_'))
    );
  }

  private static isValidPrivacyUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      
      // Exclude obvious non-privacy URLs
      const excludePatterns = [
         '/register', '/contact',
        '/careers', '/jobs', '/blog', '/news', '/press', '/investors'
      ];
      
      return !excludePatterns.some(pattern => path.includes(pattern));
    } catch {
      return false;
    }
  }

  static async scrapePrivacyPolicy(url: string): Promise<ScrapedContent> {
    console.log(`📄 Starting enhanced privacy policy scraping for: ${url}`);
    
    try {
      // Try multiple scraping strategies with improved error handling
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          console.log(`📄 Attempt ${attempt}/4 for: ${url}`);
          const result = await this.attemptScrape(url, attempt);
          
          if (result && result.text.length > 200) {
            // Validate that this is actually privacy policy content
            const isValidPrivacyPolicy = this.validatePrivacyPolicyContent(result.text);
            
            if (isValidPrivacyPolicy) {
              console.log(`✅ Successfully scraped privacy policy: ${url} (${result.text.length} chars)`);
              return result;
            } else {
              console.log(`⚠️  Content doesn't appear to be a privacy policy, trying next method...`);
              if (attempt < 4) continue;
            }
          }
          
          if (attempt === 4 && result && result.text.length > 100) {
            // If all attempts fail but we have some content, return it
            console.log(`⚠️  Returning partial content from final attempt: ${url}`);
            return result;
          }
          
        } catch (attemptError: any) {
          console.log(`❌ Scraping attempt ${attempt} failed:`, attemptError.message);
          
          // If this is a permanent error (404, 403), don't retry
          if (attemptError.message.includes('404') || attemptError.message.includes('403')) {
            throw attemptError;
          }
          
          if (attempt === 4) throw attemptError;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      throw new Error('All scraping attempts failed - no valid content found');
    } catch (error: any) {
      console.error(`❌ Error scraping privacy policy from ${url}:`, error.message);
      throw new Error(`Failed to scrape privacy policy from ${url}: ${error.message}`);
    }
  }

  /**
   * Validate that scraped content is actually a privacy policy
   */
  private static validatePrivacyPolicyContent(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Must contain core privacy policy indicators
    const requiredIndicators = [
      'personal information', 'data collection', 'privacy'
    ];
    
    const optionalIndicators = [
      'cookie', 'third party', 'data sharing', 'we collect', 'your information',
      'data processing', 'personal data', 'information we collect', 'how we use',
      'data protection', 'privacy policy', 'gdpr', 'ccpa', 'consent'
    ];
    
    // Check required indicators
    const hasRequired = requiredIndicators.some(indicator => lowerText.includes(indicator));
    
    // Check optional indicators
    const optionalCount = optionalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    // Must have at least one required indicator and 2+ optional indicators
    // Also must be substantial content (>500 chars)
    return hasRequired && optionalCount >= 2 && text.length > 500;
  }

  private static async attemptScrape(url: string, attempt: number): Promise<ScrapedContent> {
    const configs = [
      // Attempt 1: Standard browser headers
      {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache',
          'DNT': '1'
        }
      },
      // Attempt 2: Mobile user agent (less likely to be blocked)
      {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate'
        }
      },
      // Attempt 3: Minimal bot-friendly headers
      {
        timeout: 25000,
        headers: {
          'User-Agent': 'curl/7.68.0',
          'Accept': 'text/html',
          'Accept-Language': 'en'
        }
      },
      // Attempt 4: Search engine bot user agent
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en',
          'Accept-Encoding': 'gzip, deflate'
        }
      }
    ];

    const config = configs[attempt - 1];
    
    try {
      console.log(`🌐 Fetching with method ${attempt}: ${url}`);
      
      const response = await axios.get(url, {
        ...config,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Allow 4xx errors to be handled
      });

      // Handle different response types
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const $ = cheerio.load(response.data);
      
      // Enhanced content extraction with multiple strategies
      const extractedContent = this.extractContentComprehensive($, url);
      
      const result: ScrapedContent = {
        text: this.cleanText(extractedContent.text),
        url,
        title: extractedContent.title,
        lastModified: response.headers['last-modified']
      };

      console.log(`📊 Extracted content: ${result.text.length} chars, title: "${result.title}"`);
      return result;
      
    } catch (error: any) {
      // Handle specific HTTP errors
      if (error.response?.status === 403) {
        throw new Error(`Access denied (403) - Website blocks automated requests. Try manual review of privacy policy at: ${url}`);
      }
      
      if (error.response?.status === 404) {
        throw new Error(`Privacy policy not found (404) at: ${url}`);
      }
      
      if (error.response?.status === 429) {
        throw new Error(`Rate limited (429) - Too many requests to: ${url}`);
      }

      if (error.response?.status === 503) {
        throw new Error(`Service unavailable (503) - Server temporarily unavailable: ${url}`);
      }
      
      // For network errors, provide more context
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Domain not found: ${url}`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused: ${url}`);
      }
      
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Request timeout: ${url}`);
      }
      
      // Re-throw for other errors
      throw error;
    }
  }

  /**
   * Comprehensive content extraction with multiple strategies
   */
  private static extractContentComprehensive($: cheerio.Root, url: string): { text: string; title: string } {
    // Remove unwanted elements first
    $('script, style, nav, header, .header, footer, .footer, .navigation, .menu, .sidebar, .ads, .advertisement, .social-share, .comments, .related-articles, noscript, .cookie-banner, .cookie-notice, .gdpr-notice').remove();
    
    let content = '';
    let title = '';

    // Strategy 1: Look for structured content containers
    const contentSelectors = [
      'main', '[role="main"]', '.main-content', '.content', '.page-content',
      '.policy-content', '.privacy-policy', '.privacy-content', '.legal-content',
      'article', '.article', '.post-content', '.entry-content',
      '.container .content', '.wrapper .content', '.page .content',
      '#content', '#main-content', '#privacy-policy', '#privacy',
      '.section-content', '.text-content', '.document-content', '.policy-text',
      '.privacy-text', '.legal-text', '.terms-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 500 && text.length > content.length) {
          content = text;
          title = element.find('h1, h2, .title, .page-title').first().text().trim() || title;
        }
      }
    }

    // Strategy 2: Look for privacy-specific content with enhanced detection
    if (!content || content.length < 500) {
      $('div, section, article, .policy, .privacy, .legal').each((_, element) => {
        const el = $(element);
        const text = el.text().trim();
        const classNames = (el.attr('class') || '').toLowerCase();
        const id = (el.attr('id') || '').toLowerCase();
        
        // Enhanced privacy content detection
        const privacyIndicators = [
          'privacy', 'policy', 'legal', 'gdpr', 'ccpa', 'data-protection',
          'personal-information', 'data-collection', 'cookie-policy'
        ];
        
        const hasPrivacyIndicator = privacyIndicators.some(indicator => 
          classNames.includes(indicator) || id.includes(indicator)
        );
        
        const hasPrivacyContent = text.toLowerCase().includes('personal information') ||
                                text.toLowerCase().includes('data collection') ||
                                text.toLowerCase().includes('privacy policy') ||
                                text.toLowerCase().includes('we collect') ||
                                text.toLowerCase().includes('your information') ||
                                text.toLowerCase().includes('data processing');
        
        if (text.length > 500 && (hasPrivacyIndicator || hasPrivacyContent)) {
          if (text.length > content.length) {
            content = text;
            title = el.find('h1, h2, h3, .title, .page-title').first().text().trim() || title;
          }
        }
      });
    }

    // Strategy 3: Look for content in specific HTML structures
    if (!content || content.length < 500) {
      // Check for content in tables (some policies are in tabular format)
      const tableContent = $('table').text().trim();
      if (tableContent.length > 500 && 
          (tableContent.toLowerCase().includes('privacy') || 
           tableContent.toLowerCase().includes('personal information'))) {
        content = tableContent;
      }
      
      // Check for content in definition lists
      const dlContent = $('dl').text().trim();
      if (dlContent.length > 500 && dlContent.toLowerCase().includes('privacy')) {
        content = dlContent;
      }
    }

    // Strategy 4: Enhanced paragraph-based extraction
    if (!content || content.length < 500) {
      let paragraphContent = '';
      $('p').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 50) {
          paragraphContent += text + '\n\n';
        }
      });
      
      if (paragraphContent.length > content.length) {
        content = paragraphContent;
      }
    }

    // Strategy 5: Fallback to body content with better filtering
    if (!content || content.length < 300) {
      const bodyText = $('body').text().trim();
      
      // Filter out common non-content elements
      const filteredText = bodyText
        .replace(/\b(Home|About|Contact|Login|Register|Search|Menu|Navigation)\b/gi, '')
        .replace(/\b(Follow us|Social media|Newsletter|Subscribe)\b/gi, '')
        .replace(/\b(Copyright|All rights reserved|Terms of use)\b/gi, '')
        .trim();
      
      if (filteredText.length > 300) {
        content = filteredText;
      }
    }

    // Enhanced title extraction
    if (!title) {
      const titleSelectors = [
        'title', 'h1', '.page-title', '.main-title', '.content-title',
        '.policy-title', '.privacy-title', '.legal-title', 'h2'
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = $(selector).first();
        if (titleElement.length > 0) {
          const titleText = titleElement.text().trim();
          if (titleText.length > 3 && titleText.length < 200) {
            title = titleText;
            break;
          }
        }
      }
    }

    // Clean up title
    if (title) {
      title = title.replace(/\s*\|\s*.*$/, '').trim(); // Remove site name after |
      title = title.replace(/\s*-\s*.*$/, '').trim();  // Remove site name after -
      title = title.replace(/\s*–\s*.*$/, '').trim();  // Remove site name after –
    }
    
    if (!title || title.length < 3) {
      // Try to extract title from URL or content
      try {
        const urlPath = new URL(url).pathname;
        if (urlPath.includes('privacy')) {
          title = 'Privacy Policy';
        } else if (urlPath.includes('cookie')) {
          title = 'Cookie Policy';
        } else if (urlPath.includes('terms')) {
          title = 'Terms of Service';
        } else {
          title = 'Privacy Policy';
        }
      } catch {
        title = 'Privacy Policy';
      }
    }

    return { text: content, title };
  }

  private static normalizeUrl(href: string, baseUrl: string): string {
    try {
      if (href.startsWith('http')) {
        return href;
      }
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .trim();
  }

  /**
   * Simplified method for backward compatibility - returns just the URL
   */
  static async findPrivacyPolicyUrlSimple(baseUrl: string): Promise<string | null> {
    const result = await this.findPrivacyPolicyUrl(baseUrl);
    return result.privacyPolicyUrl;
  }

  /**
   * Get comprehensive privacy policy discovery results
   */
  static async getPrivacyPolicyDiscoveryResults(baseUrl: string): Promise<CrawlResult> {
    return this.findPrivacyPolicyUrl(baseUrl);
  }

  /**
   * Batch process multiple websites to find privacy policies
   */
  static async batchFindPrivacyPolicies(baseUrls: string[]): Promise<Map<string, CrawlResult>> {
    const results = new Map<string, CrawlResult>();
    const concurrent = 3; // Process 3 sites concurrently to be respectful
    
    console.log(`🔍 Starting batch privacy policy discovery for ${baseUrls.length} websites...`);
    
    // Process in batches
    for (let i = 0; i < baseUrls.length; i += concurrent) {
      const batch = baseUrls.slice(i, i + concurrent);
      
      const batchPromises = batch.map(async (baseUrl) => {
        try {
          console.log(`🌐 Processing: ${baseUrl}`);
          const result = await this.findPrivacyPolicyUrl(baseUrl);
          results.set(baseUrl, result);
          return { baseUrl, result };
        } catch (error) {
          console.error(`❌ Failed to process ${baseUrl}:`, error);
          results.set(baseUrl, {
            privacyPolicyUrl: null,
            foundUrls: [],
            crawledPages: 0,
            method: 'fallback'
          });
          return { baseUrl, result: null };
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add delay between batches to be respectful
      if (i + concurrent < baseUrls.length) {
        console.log('⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Batch processing completed. Found privacy policies for ${
      Array.from(results.values()).filter(r => r.privacyPolicyUrl).length
    } out of ${baseUrls.length} websites.`);
    
    return results;
  }

  /**
   * Enhanced website discovery - finds additional pages that might contain privacy info
   */
  static async discoverRelevantPages(baseUrl: string): Promise<{
    privacyPages: string[];
    legalPages: string[];
    aboutPages: string[];
    supportPages: string[];
    allPages: string[];
  }> {
    const privacyPages: string[] = [];
    const legalPages: string[] = [];
    const aboutPages: string[] = [];
    const supportPages: string[] = [];
    const allPages: string[] = [];

    try {
      console.log(`🔍 Discovering relevant pages for: ${baseUrl}`);
      
      const response = await axios.get(baseUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract all links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().toLowerCase().trim();
        
        if (!href) return;
        
        try {
          const fullUrl = this.normalizeUrl(href, baseUrl);
          const urlObj = new URL(fullUrl);
          
          // Only process same-domain links
          if (urlObj.hostname !== new URL(baseUrl).hostname) return;
          
          const path = urlObj.pathname.toLowerCase();
          
          allPages.push(fullUrl);
          
          // Categorize pages
          if (this.isPrivacyRelated(text, path)) {
            privacyPages.push(fullUrl);
          } else if (path.includes('legal') || path.includes('terms') || text.includes('legal') || text.includes('terms')) {
            legalPages.push(fullUrl);
          } else if (path.includes('about') || path.includes('company') || text.includes('about') || text.includes('company')) {
            aboutPages.push(fullUrl);
          } else if (path.includes('help') || path.includes('support') || path.includes('contact') || 
                    text.includes('help') || text.includes('support') || text.includes('contact')) {
            supportPages.push(fullUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      });

      // Remove duplicates
      const uniquePrivacy = [...new Set(privacyPages)];
      const uniqueLegal = [...new Set(legalPages)];
      const uniqueAbout = [...new Set(aboutPages)];
      const uniqueSupport = [...new Set(supportPages)];
      const uniqueAll = [...new Set(allPages)];

      console.log(`📊 Page discovery results for ${baseUrl}:`);
      console.log(`   Privacy pages: ${uniquePrivacy.length}`);
      console.log(`   Legal pages: ${uniqueLegal.length}`);
      console.log(`   About pages: ${uniqueAbout.length}`);
      console.log(`   Support pages: ${uniqueSupport.length}`);
      console.log(`   Total pages: ${uniqueAll.length}`);

      return {
        privacyPages: uniquePrivacy,
        legalPages: uniqueLegal,
        aboutPages: uniqueAbout,
        supportPages: uniqueSupport,
        allPages: uniqueAll
      };

    } catch (error) {
      console.error(`❌ Failed to discover pages for ${baseUrl}:`, error);
      return {
        privacyPages: [],
        legalPages: [],
        aboutPages: [],
        supportPages: [],
        allPages: []
      };
    }
  }
}
