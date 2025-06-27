/**
 * Test script to demonstrate the enhanced privacy scoring system
 */

const { GeminiPrivacyAnalyzer } = require('./dist/services/gemini-analyzer');

// Mock privacy policy scenarios for testing scoring
const testScenarios = [
  {
    name: "Social Media Platform - High Risk",
    safety: "UNSAFE",
    summary: "Policy allows extensive personal data collection with third-party sharing for advertising. No user deletion rights and unclear consent mechanisms reduce privacy protection significantly.",
    fullText: `We collect extensive personal data including location tracking, biometric data, and behavioral patterns. 
    Data is shared with advertising partners and third-party companies. We sell personal data to marketing companies.
    No opt-out options available. Unlimited retention of all user data. Weak security measures implemented.
    Automatic consent for all data processing activities. Vague terms regarding data usage.`
  },
  {
    name: "Healthcare Provider - High Privacy",
    safety: "SAFE", 
    summary: "GDPR compliant healthcare provider with minimal data collection, strong user control, and robust security measures including end-to-end encryption for patient privacy protection.",
    fullText: `GDPR compliant healthcare privacy policy with minimal data collection limited to medical necessity.
    Strong user control over personal health data. Data deletion rights provided upon request.
    End-to-end encryption for all patient communications. Privacy by design architecture implemented.
    Annual privacy audits conducted by independent assessors. Clear and explicit consent mechanisms.
    Data portability options available. Dedicated privacy officer oversight all data practices.`
  },
  {
    name: "E-commerce Site - Medium Risk",
    safety: "RISKY",
    summary: "E-commerce platform collects customer data for business purposes with some third-party sharing. Limited user control options and moderate data retention policies present privacy concerns.",
    fullText: `We collect customer purchase data and browsing behavior for business operations.
    Some data shared with payment processors and shipping partners. Limited opt-out options available.
    Data retention for business purposes with some deletion rights. Clear consent for essential operations.
    Basic security measures in place. Some international data transfers to service providers.`
  },
  {
    name: "Financial Institution - Strong Privacy",
    safety: "SAFE",
    summary: "Financial institution with robust privacy protections, minimal data collection, strong encryption, and comprehensive user rights including data deletion and portability options.",
    fullText: `Financial services privacy policy with strict data protection measures. GDPR and CCPA compliant.
    Minimal data collection limited to regulatory requirements. Strong user control over financial data.
    Robust security measures with end-to-end encryption. Data deletion rights provided.
    Privacy by design approach to all financial products. Annual privacy audits and assessments.
    Data portability and export options available. Privacy officer oversight all operations.`
  },
  {
    name: "Gaming Platform - High Tracking",
    safety: "UNSAFE",
    summary: "Gaming platform with extensive behavioral tracking, location monitoring, and broad third-party data sharing for advertising and analytics purposes with limited user control options.",
    fullText: `Gaming platform collects extensive behavioral data, location tracking, and gameplay patterns.
    Broad third-party sharing with advertising networks and analytics companies. Limited opt-out options.
    Continuous location monitoring for gaming features. Advertising tracking and profiling enabled.
    Automatic consent for data processing. Some children data collection for gaming services.`
  }
];

function testEnhancedScoring() {
  console.log('🎯 Testing Enhanced Privacy Scoring System\n');
  console.log('=' + '='.repeat(80));
  
  // Set a dummy API key for testing purposes
  process.env.GEMINI_API_KEY = 'test-key-for-scoring-demo';
  
  // Create analyzer instance (without actually calling Gemini)
  const analyzer = new (class extends GeminiPrivacyAnalyzer {
    // Override to test scoring without API calls
    testCalculateScore(safety, summary, fullText) {
      return this.calculatePrivacyScore(safety, summary, fullText);
    }
    
    testExtractFeatures(summary, fullText) {
      return this.extractFeaturesFromContent(summary, fullText);
    }
  })();

  testScenarios.forEach((scenario, index) => {
    console.log(`\n🔍 Test ${index + 1}: ${scenario.name}`);
    console.log('-'.repeat(60));
    
    try {
      // Test the scoring calculation
      const score = analyzer.testCalculateScore(scenario.safety, scenario.summary, scenario.fullText);
      const features = analyzer.testExtractFeatures(scenario.summary, scenario.fullText);
      
      console.log(`📊 Privacy Safety Level: ${scenario.safety}`);
      console.log(`🎯 Calculated Score: ${score}/100`);
      
      // Show score interpretation
      let interpretation = '';
      if (score >= 80) interpretation = '🟢 Excellent Privacy Protection';
      else if (score >= 65) interpretation = '🟡 Good Privacy Protection';  
      else if (score >= 45) interpretation = '🟠 Moderate Privacy Concerns';
      else interpretation = '🔴 Significant Privacy Risks';
      
      console.log(`📈 Score Interpretation: ${interpretation}`);
      
      console.log(`\n🚨 Privacy Risks (${features.risks.length}):`);
      features.risks.forEach((risk, i) => {
        console.log(`   ${i + 1}. ${risk}`);
      });
      
      console.log(`\n✅ Positive Features (${features.positiveFeatures.length}):`);
      features.positiveFeatures.forEach((feature, i) => {
        console.log(`   ${i + 1}. ${feature}`);
      });
      
      console.log(`\n💭 Summary: ${scenario.summary.substring(0, 100)}...`);
      
    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error.message);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Enhanced Privacy Scoring Test Completed!');
  console.log('\n📊 Key Improvements:');
  console.log('   • Realistic score ranges with variability');
  console.log('   • Weighted penalty/bonus system');
  console.log('   • Industry-specific adjustments');
  console.log('   • Priority-based risk/feature detection');
  console.log('   • Policy length and complexity factors');
  console.log('   • Balanced scoring to prevent extremes');
}

// Run the test
if (require.main === module) {
  testEnhancedScoring();
}

module.exports = { testEnhancedScoring };
