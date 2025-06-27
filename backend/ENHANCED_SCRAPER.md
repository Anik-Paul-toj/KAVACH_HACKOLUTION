# Enhanced Privacy Policy Scraper

## Overview
The Enhanced Privacy Policy Scraper is a comprehensive tool for discovering and extracting privacy policy content from websites. It employs multiple strategies to find privacy policies across entire websites, not just individual pages.

## Key Features

### 🔍 Multi-Method Discovery
1. **Direct Route Testing**: Tests common privacy policy paths immediately
2. **Robots.txt Parsing**: Analyzes robots.txt for privacy policy references
3. **Sitemap Analysis**: Parses XML sitemaps to find privacy-related pages
4. **Comprehensive Crawling**: Intelligent website crawling with depth control
5. **Fallback Methods**: Last-resort discovery techniques

### 🕷️ Intelligent Crawling
- **Depth-Limited Crawling**: Configurable crawl depth (default: 3 levels)
- **Page Limit Control**: Maximum pages to crawl (default: 50 pages)
- **Respectful Delays**: Built-in delays between requests
- **Smart Route Prioritization**: Focuses on likely privacy-containing pages

### 🎯 Enhanced Content Extraction
- **Multiple Content Strategies**: 5 different content extraction methods
- **Privacy Content Validation**: Verifies extracted content is actually a privacy policy
- **Structured Data Recognition**: Handles tables, definition lists, and other formats
- **Title Extraction**: Intelligent title detection and cleaning

### 📊 Batch Processing
- **Concurrent Processing**: Process multiple sites simultaneously (with limits)
- **Comprehensive Results**: Detailed discovery results for each site
- **Error Handling**: Robust error handling for individual site failures

## API Reference

### Main Methods

#### `findPrivacyPolicyUrl(baseUrl: string): Promise<CrawlResult>`
Comprehensive privacy policy discovery with full crawling capabilities.

**Returns:**
```typescript
interface CrawlResult {
  privacyPolicyUrl: string | null;
  foundUrls: string[];
  crawledPages: number;
  method: 'direct' | 'sitemap' | 'crawl' | 'robots' | 'fallback';
}
```

#### `findPrivacyPolicyUrlSimple(baseUrl: string): Promise<string | null>`
Backward-compatible method that returns just the privacy policy URL.

#### `scrapePrivacyPolicy(url: string): Promise<ScrapedContent>`
Enhanced content extraction with validation and multiple scraping strategies.

#### `batchFindPrivacyPolicies(baseUrls: string[]): Promise<Map<string, CrawlResult>>`
Process multiple websites in batches with intelligent scheduling.

#### `discoverRelevantPages(baseUrl: string): Promise<PageDiscoveryResult>`
Discover and categorize all relevant pages on a website.

**Returns:**
```typescript
interface PageDiscoveryResult {
  privacyPages: string[];
  legalPages: string[];
  aboutPages: string[];
  supportPages: string[];
  allPages: string[];
}
```

### Configuration

#### Crawling Limits
```typescript
private static readonly MAX_CRAWL_DEPTH = 3;
private static readonly MAX_PAGES_TO_CRAWL = 50;
private static readonly CRAWL_DELAY_MS = 500;
```

#### Route Discovery
The scraper tests 60+ common privacy policy routes including:
- Standard paths: `/privacy`, `/privacy-policy`
- Localized paths: `/en/privacy`, `/us/privacy-policy`
- CMS paths: `/legal/privacy`, `/about/privacy`
- File extensions: `/privacy.html`, `/privacy.php`

## Usage Examples

### Basic Usage
```typescript
import { PolicyScraper } from './services/policy-scraper';

// Simple discovery
const privacyUrl = await PolicyScraper.findPrivacyPolicyUrlSimple('https://example.com');

// Comprehensive discovery
const result = await PolicyScraper.findPrivacyPolicyUrl('https://example.com');
console.log(`Found via ${result.method}: ${result.privacyPolicyUrl}`);
console.log(`Crawled ${result.crawledPages} pages`);
```

### Batch Processing
```typescript
const websites = [
  'https://google.com',
  'https://facebook.com',
  'https://amazon.com'
];

const results = await PolicyScraper.batchFindPrivacyPolicies(websites);

for (const [site, result] of results.entries()) {
  console.log(`${site}: ${result.privacyPolicyUrl ? 'Found' : 'Not found'}`);
}
```

### Page Discovery
```typescript
const pages = await PolicyScraper.discoverRelevantPages('https://example.com');
console.log(`Found ${pages.privacyPages.length} privacy-related pages`);
console.log(`Found ${pages.legalPages.length} legal pages`);
```

### Content Scraping
```typescript
const content = await PolicyScraper.scrapePrivacyPolicy('https://example.com/privacy');
console.log(`Title: ${content.title}`);
console.log(`Content: ${content.text.substring(0, 200)}...`);
```

## Discovery Methods

### 1. Direct Route Testing
Tests 60+ common privacy policy paths immediately:
- `/privacy`, `/privacy-policy`, `/cookie-policy`
- Language variants: `/en/privacy`, `/us/privacy-policy`
- CMS patterns: `/legal/privacy`, `/about/privacy`
- File extensions: `.html`, `.php`, `.aspx`

### 2. Robots.txt Analysis
- Parses robots.txt for privacy policy references
- Extracts URLs and paths from comments and rules
- Tests discovered URLs for privacy content

### 3. Sitemap Parsing
- Checks multiple sitemap locations
- Parses XML structure to find privacy-related URLs
- Handles sitemap indexes and nested sitemaps

### 4. Intelligent Crawling
- Starts from homepage and follows links
- Prioritizes pages likely to contain privacy information
- Respects crawl depth and page limits
- Uses smart routing to avoid irrelevant pages

### 5. Content Validation
- Verifies that discovered URLs contain actual privacy policy content
- Checks for key privacy indicators: "personal information", "data collection", etc.
- Requires substantial content (>500 characters) and multiple indicators

## Error Handling

The scraper handles various error conditions gracefully:
- **403 Forbidden**: Tries alternative user agents and methods
- **404 Not Found**: Continues to next discovery method
- **429 Rate Limited**: Implements backoff and retry logic
- **Network Errors**: Provides clear error messages and fallbacks

## Performance Considerations

- **Respectful Crawling**: Built-in delays between requests
- **Concurrent Limits**: Batch processing with controlled concurrency
- **Timeout Management**: Progressive timeouts for different methods
- **Resource Limits**: Configurable page and depth limits

## Privacy and Ethics

- **Respectful Scraping**: Follows robots.txt and implements delays
- **User Agent Rotation**: Uses legitimate browser user agents
- **Rate Limiting**: Prevents overwhelming target servers
- **Error Logging**: Provides transparency in discovery process

## Integration with Existing Code

The enhanced scraper maintains backward compatibility:
- Existing calls to `findPrivacyPolicyUrl()` now return `CrawlResult`
- New `findPrivacyPolicyUrlSimple()` method for simple string return
- All existing scraping functionality enhanced but interface-compatible

## Testing

Run the test script to see the scraper in action:
```bash
cd backend
node test-enhanced-scraper.js
```

This will test the scraper against several major websites and demonstrate all features.
