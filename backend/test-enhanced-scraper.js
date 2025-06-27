const { PolicyScraper } = require('./src/services/policy-scraper.ts');

async function testEnhancedPolicyScraper() {
  console.log('🚀 Testing Enhanced Privacy Policy Scraper\n');

  // Test websites with different privacy policy setups
  const testSites = [
    'https://google.com',
    'https://facebook.com', 
    'https://amazon.com',
    'https://microsoft.com',
    'https://apple.com'
  ];

  console.log('📊 Testing comprehensive privacy policy discovery...\n');

  for (const site of testSites) {
    try {
      console.log(`\n🔍 Analyzing: ${site}`);
      console.log('=' + '='.repeat(50));
      
      // Test comprehensive discovery
      const result = await PolicyScraper.findPrivacyPolicyUrl(site);
      
      console.log(`📍 Privacy Policy URL: ${result.privacyPolicyUrl || 'Not found'}`);
      console.log(`🔍 Discovery Method: ${result.method}`);
      console.log(`📄 Pages Crawled: ${result.crawledPages}`);
      console.log(`🔗 Total URLs Found: ${result.foundUrls.length}`);
      
      if (result.foundUrls.length > 0) {
        console.log(`📋 Sample URLs found:`);
        result.foundUrls.slice(0, 3).forEach((url, index) => {
          console.log(`   ${index + 1}. ${url}`);
        });
      }

      // Test page discovery
      console.log('\n📊 Discovering relevant pages...');
      const pageDiscovery = await PolicyScraper.discoverRelevantPages(site);
      console.log(`   Privacy pages: ${pageDiscovery.privacyPages.length}`);
      console.log(`   Legal pages: ${pageDiscovery.legalPages.length}`);
      console.log(`   About pages: ${pageDiscovery.aboutPages.length}`);
      console.log(`   Support pages: ${pageDiscovery.supportPages.length}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${site}:`, error.message);
    }
    
    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎯 Testing batch processing...');
  try {
    const batchResults = await PolicyScraper.batchFindPrivacyPolicies(testSites.slice(0, 3));
    
    console.log('\n📊 Batch Results Summary:');
    console.log('=' + '='.repeat(30));
    
    for (const [site, result] of batchResults.entries()) {
      console.log(`\n🌐 ${site}:`);
      console.log(`   Status: ${result.privacyPolicyUrl ? '✅ Found' : '❌ Not found'}`);
      console.log(`   Method: ${result.method}`);
      console.log(`   Pages crawled: ${result.crawledPages}`);
      if (result.privacyPolicyUrl) {
        console.log(`   URL: ${result.privacyPolicyUrl}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Batch processing error:', error.message);
  }

  console.log('\n✅ Enhanced privacy policy scraper testing completed!');
}

// Run the test
if (require.main === module) {
  testEnhancedPolicyScraper().catch(console.error);
}

module.exports = { testEnhancedPolicyScraper };
