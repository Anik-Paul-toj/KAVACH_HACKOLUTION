
class ContentScript {
  private privacyPolicyUrls: string[] = [];
  private optedOutDomains: Set<string> = new Set();

  constructor() {
    console.log('🔍 Kavach Content Script starting on:', window.location.href);
    this.checkOptOutStatus();
    this.detectPrivacyPolicies();
    this.injectTrackingDetector();
    this.setupOptOutListeners();
    console.log('✅ Kavach Content Script initialized');
  }

  private async checkOptOutStatus() {
    const domain = window.location.hostname;
    try {
      const storage = await chrome.storage.local.get([`optedOut_${domain}`]);
      if (storage[`optedOut_${domain}`]) {
        this.optedOutDomains.add(domain);
        console.log('🚫 Domain is opted out:', domain);
        this.enforceOptOutState();
      }
    } catch (error) {
      console.log('Could not check opt-out status:', error);
    }
  }

  private enforceOptOutState() {
   
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
           
            if (element.tagName === 'SCRIPT') {
              const script = element as HTMLScriptElement;
              const src = script.src?.toLowerCase() || '';
              const content = script.textContent?.toLowerCase() || '';
              
              const trackingPatterns = [
                'google-analytics', 'googletagmanager', 'gtag', 'ga(',
                'facebook.com/tr', 'connect.facebook', 'fbq(',
                'doubleclick', 'adsystem', 'googlesyndication'
              ];
              
              if (trackingPatterns.some(pattern => src.includes(pattern) || content.includes(pattern))) {
                script.remove();
                console.log('🚫 Blocked tracking script:', src.substring(0, 50));
              }
            }
            
           
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              const src = img.src?.toLowerCase() || '';
              
              if (src.includes('track') || src.includes('pixel') || src.includes('beacon')) {
                img.remove();
                console.log('🚫 Blocked tracking pixel:', src.substring(0, 50));
              }
            }
          }
        });
      });
    });

    observer.observe(document, { childList: true, subtree: true });
  }

  private setupOptOutListeners() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'performOptOut') {
        this.handleOptOutRequest();
        sendResponse({ success: true });
      }
    });
  }

  private handleOptOutRequest() {
    // Additional page-specific opt-out handling
    this.clickConsentButtons();
    this.disableTrackingMethods();
    this.clearPageStorage();
  }

  private clickConsentButtons() {
    // Enhanced consent button detection and clicking
    setTimeout(() => {
      const consentButtons = [
        // Generic opt-out buttons
        'button[data-testid*="reject"]',
        'button[data-testid*="decline"]',
        'button[data-testid*="opt-out"]',
        '[data-cy*="reject"]',
        '[data-cy*="decline"]',
        
        // YouTube/Google specific
        '[aria-label="Reject all"]',
        '[data-testid="reject-all-button"]',
        'button[jsname="b3VHJd"]',
        'button[data-value="2"]',
        '.VfPpkd-LgbsSe[aria-label*="Reject"]',
        '.QS5gu',
        '[jsaction*="reject"]',
        'c-wiz button[aria-label*="Reject"]',
        'form[action*="consent"] button:last-child',
        
        // Specific CMP platforms
        '#onetrust-reject-all-handler',
        '.optanon-category-2',
        '.optanon-category-3', 
        '.optanon-category-4',
        '[data-cy="manage-consent-reject-all"]',
        '.sp_choice_type_REJECT_ALL',
        '#truste-consent-required',
        
        // Common cookie banner selectors
        '.cookie-banner button[data-role="reject"]',
        '.gdpr-banner .reject-all',
        '.consent-manager .decline-all'
      ];

      // Click with multiple attempts for YouTube's dynamic loading
      const clickButtons = () => {
        consentButtons.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            try {
              (element as HTMLElement).click();
              console.log('🖱️ Clicked consent button:', selector);
            } catch (e) {
              // Continue
            }
          });
        });
        
        // YouTube-specific text-based detection
        if (window.location.hostname.includes('youtube.com')) {
          const allButtons = document.querySelectorAll('button, [role="button"]');
          allButtons.forEach(button => {
            const text = button.textContent?.toLowerCase() || '';
            const ariaLabel = (button as HTMLElement).getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('reject all') || text.includes('turn off') || 
                ariaLabel.includes('reject all') || text.includes('no thanks')) {
              try {
                (button as HTMLElement).click();
                console.log('🖱️ Clicked YouTube consent button:', text.substring(0, 30));
              } catch (e) {
                // Continue
              }
            }
          });
        }
      };
      
      // Multiple clicks with delays for YouTube
      clickButtons();
      setTimeout(clickButtons, 1000);
      setTimeout(clickButtons, 3000);
      setTimeout(clickButtons, 5000);
      
    }, 1000);
  }

  private disableTrackingMethods() {
    // Override common tracking functions
    const trackingMethods = ['gtag', 'ga', 'fbq', '_paq', 'mixpanel'];
    trackingMethods.forEach(method => {
      if ((window as any)[method]) {
        (window as any)[method] = () => console.log(`Tracking method ${method} disabled by Kavach`);
      }
    });
  }

  private clearPageStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 Cleared page storage');
    } catch (error) {
      console.log('Could not clear page storage:', error);
    }
  }
  private detectPrivacyPolicies() {
    // Look for privacy policy links with better detection
    const selectors = [
      'a[href*="privacy"]',
      'a[href*="terms"]', 
      'a[href*="policy"]',
      'a[href*="legal"]',
      'a[href*="gdpr"]',
      'a[href*="ccpa"]'
    ];
    
    const privacyKeywords = [
      'privacy policy',
      'privacy statement', 
      'privacy notice',
      'terms of service',
      'terms and conditions',
      'data policy',
      'cookie policy',
      'legal',
      'gdpr',
      'ccpa'
    ];

    // Check link hrefs and text content
    selectors.forEach(selector => {
      const links = document.querySelectorAll(selector);
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.toLowerCase() || '';
        
        if (href && !this.privacyPolicyUrls.includes(href)) {
          // Check if the link text contains privacy-related keywords
          const isPrivacyRelated = privacyKeywords.some(keyword => 
            text.includes(keyword) || href.toLowerCase().includes(keyword)
          );
          
          if (isPrivacyRelated) {
            this.privacyPolicyUrls.push(href);
          }
        }
      });
    });

    // Also check for common footer links
    const footerElements = document.querySelectorAll('footer, .footer, [class*="footer"]');
    footerElements.forEach(footer => {
      const links = footer.querySelectorAll('a');
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.toLowerCase() || '';
        
        if (href && !this.privacyPolicyUrls.includes(href)) {
          const isPrivacyRelated = privacyKeywords.some(keyword => 
            text.includes(keyword)
          );
          
          if (isPrivacyRelated) {
            this.privacyPolicyUrls.push(href);
          }
        }
      });
    });

    // Send privacy policy URLs to background script
    if (this.privacyPolicyUrls.length > 0) {
      chrome.runtime.sendMessage({
        action: 'privacyPoliciesFound',
        urls: this.privacyPolicyUrls,
        currentUrl: window.location.href
      }).catch(error => {
        console.log('Failed to send privacy policy URLs:', error);
      });
    }
  }

  private injectTrackingDetector() {
    // Inject script to detect client-side tracking
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      // Remove the script element after loading
      (this as HTMLScriptElement).remove();
    };
    (document.head || document.documentElement).appendChild(script);  }
  init() {
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          // Re-scan for privacy policies after DOM is fully loaded
          this.detectPrivacyPolicies();
        }, 1000);
      });
    } else {
      setTimeout(() => {
        // Re-scan for privacy policies
        this.detectPrivacyPolicies();
      }, 1000);
    }

    // Also scan again after a delay to catch dynamically loaded content
    setTimeout(() => {
      this.detectPrivacyPolicies();
    }, 3000);
  }
}

const contentScript = new ContentScript();
contentScript.init();

export {};
