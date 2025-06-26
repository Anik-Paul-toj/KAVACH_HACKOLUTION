import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  text: string;
  url: string;
  title: string;
  lastModified?: string;
}

export class PolicyScraper {
  private static readonly PRIVACY_KEYWORDS = [
    'privacy policy', 'privacy notice', 'data policy', 'cookie policy',
    'privacy statement', 'data protection', 'privacy practices',
    'terms of service', 'user agreement', 'data usage', 'information collection',
    'gdpr', 'ccpa', 'data rights', 'personal information', 'cookies',
    'tracking', 'analytics', 'third party', 'data sharing'
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
    'a:contains("Terms")', 'a:contains("Legal")'
  ];

  static async findPrivacyPolicyUrl(baseUrl: string): Promise<string | null> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    for (let attempt = 0; attempt < userAgents.length; attempt++) {
      try {
        const response = await axios.get(baseUrl, {
          timeout: 15000,
          maxRedirects: 5,
          headers: {
            'User-Agent': userAgents[attempt],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        const $ = cheerio.load(response.data);
        
        // Method 1: Look for privacy policy links using enhanced selectors
        const foundUrls = new Set<string>();
        
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
          } catch (selectorError) {
            // Continue with next selector if one fails
            continue;
          }
        }

        // Method 2: Search all links with text matching
        $('a').each((_, element) => {
          const link = $(element);
          const href = link.attr('href');
          const text = link.text().toLowerCase().trim();
          const title = link.attr('title')?.toLowerCase() || '';
          
          if (href && this.isPrivacyRelated(text, href, title)) {
            const normalizedUrl = this.normalizeUrl(href, baseUrl);
            if (normalizedUrl && this.isValidPrivacyUrl(normalizedUrl)) {
              foundUrls.add(normalizedUrl);
            }
          }
        });

        // Method 3: Try common privacy policy URLs
        const commonPaths = [
          '/privacy', '/privacy-policy', '/privacy.html', '/privacy.php', '/privacy.aspx',
          '/cookie-policy', '/data-policy', '/privacy-notice', '/privacy-statement',
          '/legal/privacy', '/about/privacy', '/help/privacy', '/support/privacy',
          '/terms-and-privacy', '/legal', '/policies', '/legal/privacy-policy',
          '/en/privacy', '/us/privacy', '/privacy/', '/privacy-policy/',
          '/page/privacy', '/static/privacy', '/docs/privacy'
        ];

        for (const path of commonPaths) {
          try {
            const testUrl = new URL(path, baseUrl).toString();
            foundUrls.add(testUrl);
          } catch {
            continue;
          }
        }

        // Method 4: Test URLs for accessibility
        for (const url of Array.from(foundUrls)) {
          try {
            const testResponse = await axios.head(url, { 
              timeout: 5000,
              maxRedirects: 3,
              headers: {
                'User-Agent': userAgents[attempt],
                'Accept': 'text/html,application/xhtml+xml',
                'Cache-Control': 'no-cache'
              }
            });
            if (testResponse.status === 200) {
              return url;
            }
          } catch {
            // Continue to next URL
          }
        }

        // Return first found URL even if we couldn't verify it
        return Array.from(foundUrls)[0] || null;

      } catch (error: any) {
        // Handle 403 specifically
        if (error.response?.status === 403) {
          console.log(`🚫 Access denied (403) for ${baseUrl} with User-Agent ${attempt + 1}, trying alternative...`);
          
          // If this is the last attempt, try fallback strategy
          if (attempt === userAgents.length - 1) {
            return this.tryFallbackPolicyDiscovery(baseUrl);
          }
          continue;
        }
        
        // For other errors, try next user agent
        if (attempt < userAgents.length - 1) {
          continue;
        }
        
        console.error('Error finding privacy policy URL:', error.message);
        return null;
      }
    }

    return null;
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
    try {
      // Try multiple scraping strategies
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await this.attemptScrape(url, attempt);
          if (result && result.text.length > 200) {
            return result;
          }
        } catch (attemptError) {
          console.log(`Scraping attempt ${attempt} failed:`, attemptError.message);
          if (attempt === 3) throw attemptError;
        }
      }
      
      throw new Error('All scraping attempts failed');
    } catch (error) {
      console.error('Error scraping privacy policy:', error);
      throw new Error(`Failed to scrape privacy policy from ${url}: ${error.message}`);
    }
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
      }
    ];

    const config = configs[attempt - 1];
    
    try {
      const response = await axios.get(url, {
        ...config,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      const $ = cheerio.load(response.data);
      
      // Enhanced content extraction
      const extractedContent = this.extractContent($, url);
      
      return {
        text: this.cleanText(extractedContent.text),
        url,
        title: extractedContent.title,
        lastModified: response.headers['last-modified']
      };
    } catch (error: any) {
      // Handle 403 errors specifically
      if (error.response?.status === 403) {
        throw new Error(`Access denied (403) - Website blocks automated requests. Try manual review of privacy policy at: ${url}`);
      }
      
      // Handle other HTTP errors
      if (error.response?.status === 404) {
        throw new Error(`Privacy policy not found (404) at: ${url}`);
      }
      
      if (error.response?.status === 429) {
        throw new Error(`Rate limited (429) - Too many requests to: ${url}`);
      }
      
      // Re-throw for other errors
      throw error;
    }
  }

  private static extractContent($: cheerio.Root, url: string): { text: string; title: string } {
    // Remove unwanted elements
    $('script, style, nav, header, .header, footer, .footer, .navigation, .menu, .sidebar, .ads, .advertisement, .social-share, .comments, .related-articles, noscript').remove();
    
    // Try multiple content extraction strategies
    let content = '';
    let title = '';

    // Strategy 1: Look for main content containers with substantial text
    const contentSelectors = [
      'main', '[role="main"]', '.main-content', '.content', '.page-content',
      '.policy-content', '.privacy-policy', '.privacy-content', '.legal-content',
      'article', '.article', '.post-content', '.entry-content',
      '.container .content', '.wrapper .content', '.page .content',
      '#content', '#main-content', '#privacy-policy', '#privacy',
      '.section-content', '.text-content', '.document-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 500 && text.length > content.length) {
          content = text;
          title = element.find('h1, h2, .title').first().text().trim() || title;
        }
      }
    }

    // Strategy 2: Look for privacy-specific content patterns
    if (!content || content.length < 500) {
      $('div, section, article').each((_, element) => {
        const el = $(element);
        const text = el.text().trim();
        const classNames = el.attr('class') || '';
        const id = el.attr('id') || '';
        
        // Check if this container likely contains privacy content
        if (text.length > 500 && (
          classNames.toLowerCase().includes('privacy') ||
          classNames.toLowerCase().includes('policy') ||
          classNames.toLowerCase().includes('legal') ||
          id.toLowerCase().includes('privacy') ||
          text.toLowerCase().includes('personal information') ||
          text.toLowerCase().includes('data collection') ||
          text.toLowerCase().includes('we collect') ||
          text.toLowerCase().includes('privacy policy')
        )) {
          if (text.length > content.length) {
            content = text;
            title = el.find('h1, h2, h3, .title').first().text().trim() || title;
          }
        }
      });
    }

    // Strategy 3: Fallback to body content with filtering
    if (!content || content.length < 300) {
      content = $('body').text().trim();
    }

    // Extract title if not found
    if (!title) {
      title = $('title').text().trim() || 
              $('h1').first().text().trim() || 
              $('h2').first().text().trim() ||
              'Privacy Policy';
    }

    // Clean up title
    title = title.replace(/\s*\|\s*.*$/, '').trim(); // Remove site name after |
    title = title.replace(/\s*-\s*.*$/, '').trim();  // Remove site name after -
    
    if (!title || title.length < 3) {
      title = 'Privacy Policy';
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
}
