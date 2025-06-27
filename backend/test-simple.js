/**
 * Simple test script to demonstrate the enhanced privacy policy scraper
 */

// Import the compiled JavaScript version
const { PolicyScraper } = require('./dist/services/policy-scraper');

async function runSimpleTest() {
  console.log('🚀 Enhanced Privacy Policy Scraper Demo\n');
  
  // Test with a simple website
  const testUrl = 'https://github.com';
  
  try {
    console.log(`🔍 Testing comprehensive discovery on: ${testUrl}`);
    console.log('=' + '='.repeat(50));
    
    // Test the enhanced discovery
    const result = await PolicyScraper.findPrivacyPolicyUrl(testUrl);
    
    console.log('\n📊 Discovery Results:');
    console.log(`   Privacy Policy URL: ${result.privacyPolicyUrl || 'Not found'}`);
    console.log(`   Discovery Method: ${result.method}`);
    console.log(`   Pages Crawled: ${result.crawledPages}`);
    console.log(`   URLs Found: ${result.foundUrls.length}`);
    
    if (result.foundUrls.length > 0) {
      console.log('\n🔗 Sample URLs discovered:');
      result.foundUrls.slice(0, 5).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }
    
    // Test backward compatibility
    console.log('\n🔄 Testing backward compatibility...');
    const simpleResult = await PolicyScraper.findPrivacyPolicyUrlSimple(testUrl);
    console.log(`   Simple result: ${simpleResult || 'Not found'}`);
    
    // Test page discovery
    console.log('\n📋 Testing page discovery...');
    const pages = await PolicyScraper.discoverRelevantPages(testUrl);
    console.log(`   Privacy pages found: ${pages.privacyPages.length}`);
    console.log(`   Legal pages found: ${pages.legalPages.length}`);
    console.log(`   About pages found: ${pages.aboutPages.length}`);
    console.log(`   Support pages found: ${pages.supportPages.length}`);
    console.log(`   Total pages found: ${pages.allPages.length}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runSimpleTest().catch(console.error);
}

module.exports = { runSimpleTest };
