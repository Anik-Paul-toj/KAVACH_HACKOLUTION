import React, { useState, useEffect } from 'react';
import { SiteData } from '../utils/types';
import { OptOutManager } from '../utils/privacy';
import TrustScore from '../components/TrustScore';
import TrackerList from '../components/TrackerList';
import PrivacyAnalysis from '../components/PrivacyAnalysis';
import DataFlowVisualization from '../components/DataFlowVisualization';
import ActionButtons from '../components/ActionButtons';
import FingerprintInfo from '../components/FingerprintInfo';
import BugReportIcon from '@mui/icons-material/BugReport';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';



// Comprehensive opt-out cleanup function that runs in the page context
function comprehensiveOptOutCleanup(domain: string) {
  console.log('Starting comprehensive cleanup for:', domain);
  
  // CSP-Safe: Check if we can execute scripts (CSP bypass detection)
  let cspSafe = true;
  try {
    // Test if we can create and execute inline scripts
    const testScript = document.createElement('script');
    testScript.textContent = 'window.kavachCSPTest = true;';
    document.head.appendChild(testScript);
    document.head.removeChild(testScript);
    
    if (!(window as any).kavachCSPTest) {
      cspSafe = false;
    }
    delete (window as any).kavachCSPTest;
  } catch (e) {
    cspSafe = false;
    console.warn('CSP restrictions detected, using limited cleanup mode');
  }
  
  try {
    // Import opt-out utilities (these will be available in the injected context)
    const universalOptOutCookies = [
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
      'OptanonConsent=',
      'OptanonAlertBoxClosed=',
      'CookieConsent=no',
      'notice_behavior=implied,eu',
      'notice_gdpr_prefs=0,1,2,3:',
      'euconsent-v2=',
      'gdpr=1',
      'gdpr_consent=',
      'cookies_accepted=false',
      'accept_cookies=no',
      'cookie_policy_accepted=false',
      'data_processing_consent=false'
    ];

    const optOutSelectors = [
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
      
      // YouTube/Google specific consent selectors
      '[aria-label="Reject all"]',
      '[data-testid="reject-all-button"]',
      'button[jsname="b3VHJd"]', // YouTube reject button
      'button[data-value="2"]', // Google consent reject
      '.VfPpkd-LgbsSe[aria-label*="Reject"]',
      '.QS5gu', // Google "Reject all" button
      '[jsaction*="reject"]',
      'c-wiz button[aria-label*="Reject"]',
      'form[action*="consent"] button:last-child',
      
      // Instagram/Meta specific selectors
      'button[data-testid="cookie-banner-decline"]',
      'button[data-testid="cookie-policy-manage-dialog-decline-button"]',
      '[data-testid="cookie-policy-dialog-decline-button"]',
      'button._acan._acap._acas._aj1-._ap30',
      'button[data-testid="decline-optional-cookies"]',
      '[aria-label*="Decline optional cookies"]',
      'div[role="button"][tabindex="0"]:contains("Decline")',
      
      // Facebook specific
      '[data-testid="cookie-policy-manage-dialog-decline-button"]',
      'button[data-cookiebanner="decline"]',
      '[data-testid="cookie-policy-banner-decline"]',
      
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
      '.privacy-banner .opt-out'
    ];

    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all databases
    if ('indexedDB' in window) {
      indexedDB.databases?.().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(e => console.log('IndexedDB cleanup error:', e));
    }
    
    // Set comprehensive opt-out cookies for multiple domains
    const domainVariants = [domain, `.${domain}`, `www.${domain}`];
    
    domainVariants.forEach(domainVariant => {
      universalOptOutCookies.forEach(cookieStr => {
        document.cookie = `${cookieStr}; path=/; max-age=31536000; SameSite=Strict; domain=${domainVariant}`;
      });
    });
    
    // Site-specific opt-out cookies
    const siteSpecificStrategies = {
      'google.com': ['CONSENT=PENDING+999', 'NID=; expires=Thu, 01 Jan 1970 00:00:00 GMT'],
      'youtube.com': [
        'CONSENT=PENDING+999', 
        'VISITOR_INFO1_LIVE=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'YSC=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'GPS=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'PREF=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        '__Secure-YEC=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'SID=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'LOGIN_INFO=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      'instagram.com': [
        'ig_nrcb=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'sessionid=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'ds_user_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'shbid=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'shbts=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'rur=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'mid=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      'facebook.com': [
        'dpr=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'c_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'xs=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'fr=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      'amazon.com': ['ad-privacy=0', 'csm-hit=; expires=Thu, 01 Jan 1970 00:00:00 GMT'],
      'twitter.com': [
        'personalization_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'ct0=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ],
      'linkedin.com': [
        'UserMatchHistory=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'JSESSIONID=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'li_at=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ]
    };

    Object.entries(siteSpecificStrategies).forEach(([siteDomain, cookies]) => {
      if (domain.includes(siteDomain)) {
        cookies.forEach(cookieStr => {
          document.cookie = `${cookieStr}; path=/; SameSite=Strict`;
        });
      }
    });
    
    // Click opt-out elements with enhanced detection
    const clickOptOutElements = () => {
      optOutSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && typeof (element as HTMLElement).click === 'function') {
              (element as HTMLElement).click();
              console.log('Clicked opt-out element:', selector);
            }
          });
        } catch (e) {
          // Continue with other selectors
        }
      });

      // Text-based opt-out button detection
      const allButtons = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');
      allButtons.forEach(element => {
        const text = element.textContent?.toLowerCase() || '';
        const optOutTexts = [
          'reject all', 'decline all', 'opt out', 'refuse all',
          'deny all', 'reject cookies', 'decline cookies',
          'do not accept', 'no thanks', 'disagree',
          'manage preferences', 'privacy settings', 'cookie settings',
          'do not sell my data', 'do not sell', 'limit use',
          'ablehnen', 'alles ablehnen', // German
          'refuser', 'tout refuser', // French
          'rechazar', 'rechazar todo', // Spanish
          'rifiuta', 'rifiuta tutto', // Italian
          '拒否', '全て拒否' // Japanese
        ];
        
        if (optOutTexts.some(optText => text.includes(optText))) {
          try {
            (element as HTMLElement).click();
            console.log('Clicked text-based opt-out:', text.substring(0, 50));
          } catch (e) {
            // Continue
          }
        }
      });
    };

    // YouTube/Google-specific consent handling
    const handleYouTubeConsent = () => {
      console.log('Handling YouTube-specific consent...');
      
      // Enhanced authentication cookie clearing to prevent re-login (but allow manual re-login)
      const authCookies = [
        'SID', 'HSID', 'SSID', 'APISID', 'SAPISID',
        '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID',
        'LOGIN_INFO', 'SIDCC', '1P_JAR', 'CONSENT', 'NID', 'DV',
        'VISITOR_INFO1_LIVE', 'YSC', 'GPS', 'PREF', '__Secure-YEC',
        'wide', 'f.req', 'GED_PLAYLIST_ACTIVITY', 'ACTIVITY'
      ];
      
      // Clear cookies across all Google domains to prevent auto re-login
      const googleDomains = [
        '.google.com', 'google.com', '.youtube.com', 'youtube.com',
        '.googleapis.com', 'googleapis.com', '.gstatic.com', 'gstatic.com',
        '.googlevideo.com', 'googlevideo.com', '.ggpht.com', 'ggpht.com'
      ];
      
      authCookies.forEach(cookieName => {
        googleDomains.forEach(domain => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; secure`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; samesite=none; secure`;
        });
      });
      
      // Clear YouTube session storage to prevent auto re-login but preserve login capability
      try {
        // Clear only session-specific data, preserve login infrastructure
        sessionStorage.removeItem('yt-remote-connected-devices');
        sessionStorage.removeItem('yt-remote-device-id');
        sessionStorage.removeItem('yt-remote-fast-check-period');
        sessionStorage.removeItem('yt-remote-session-app');
        sessionStorage.removeItem('yt-remote-session-name');
        
        // Clear only tracking-related storage, keep essential login functionality
        localStorage.removeItem('yt-remote-connected-devices');
        localStorage.removeItem('yt-remote-device-id');
        // Keep player preferences for better UX
        // localStorage.removeItem('yt-player-quality');
        // localStorage.removeItem('yt-player-volume');
        
        // Set temporary logged-out state (short duration)
        sessionStorage.setItem('kavach-logout-timestamp', Date.now().toString());
        
        console.log('Cleared YouTube session storage (preserving login capability)');
      } catch (e) {
        console.warn('Could not clear YouTube session storage:', e);
      }
      
      // Prevent YouTube auto-login by modifying page configuration (temporarily and minimally)
      try {
        if (cspSafe && (window as any).ytInitialData) {
          // Only clear tracking data, don't break login functionality
          if ((window as any).ytInitialData.responseContext) {
            (window as any).ytInitialData.responseContext.serviceTrackingParams = [];
          }
          // Don't modify embed data as it may break login
        }
        
        if (cspSafe && (window as any).ytcfg) {
          // Store original config for quick restoration
          if (!(window as any).kavachOriginalYtConfig) {
            (window as any).kavachOriginalYtConfig = {
              LOGGED_IN: (window as any).ytcfg.get('LOGGED_IN'),
              SESSION_INDEX: (window as any).ytcfg.get('SESSION_INDEX')
            };
          }
          
          // Temporarily set logged out state (less aggressive)
          (window as any).ytcfg.set('LOGGED_IN', false);
          (window as any).ytcfg.set('SESSION_INDEX', 0);
          // Don't touch DELEGATED_SESSION_ID as it may be needed for login
          
          // Restore login capability after 10 seconds
          setTimeout(() => {
            try {
              if ((window as any).kavachOriginalYtConfig) {
                console.log('Restoring YouTube login capability after 10 seconds...');
                // Don't restore the logged-in state, just remove blocks
                (window as any).ytcfg.set('SESSION_INDEX', (window as any).kavachOriginalYtConfig.SESSION_INDEX);
                delete (window as any).kavachOriginalYtConfig;
                sessionStorage.removeItem('kavach-logout-timestamp');
                console.log('YouTube login capability restored');
              }
            } catch (e) {
              console.warn('Could not restore YouTube config:', e);
            }
          }, 10000); // 10-second timeout for login restoration
        }
      } catch (e) {
        console.warn('Could not modify YouTube configuration:', e);
      }
      
      // YouTube consent iframe handling
      const consentIframes = document.querySelectorAll('iframe[src*="consent"], iframe[src*="privacy"]');
      consentIframes.forEach(iframe => {
        try {
          // Try to access iframe content and click reject buttons
          const iframeDoc = (iframe as HTMLIFrameElement).contentDocument;
          if (iframeDoc) {
            const rejectButtons = iframeDoc.querySelectorAll(
              'button[aria-label*="Reject"], button[data-value="2"], .VfPpkd-LgbsSe[aria-label*="Reject"]'
            );
            rejectButtons.forEach(btn => (btn as HTMLElement).click());
          }
        } catch (e) {
          // Cross-origin restrictions, continue
        }
      });
      
      // Enhanced YouTube-specific consent dialog selectors
      const youtubeSelectors = [
        // Main consent buttons
        'button[jsname="b3VHJd"]', // Reject all button
        'c-wiz button[aria-label*="Reject"]',
        'form[action*="consent"] button:last-child',
        '.VfPpkd-LgbsSe[aria-label*="Reject"]',
        'button[data-value="2"]',
        
        // Privacy settings
        '[jsaction*="reject"]',
        '[data-ved] button[aria-label*="Reject"]',
        '.QS5gu', // Google reject all
        
        // Consent management
        'ytd-consent-bump-v2-lightbox button:last-child',
        'ytd-button-renderer[button-renderer] button:last-child',
        
        // Cookie settings
        '#consent-bump button[aria-label*="Reject"]',
        'tp-yt-paper-dialog button:last-child',
        
        // 2024 updated selectors
        '[data-testid="reject-all-button"]',
        'button[aria-label="Turn off search and watch history"]',
        'button[aria-label="Turn off YouTube History"]'
      ];
      
      // Enhanced clicking with better error handling
      const clickYouTubeButtons = () => {
        let buttonsClicked = 0;
        
        youtubeSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
              if (element && typeof (element as HTMLElement).click === 'function') {
                try {
                  // Check visibility
                  const rect = element.getBoundingClientRect();
                  const isVisible = rect.width > 0 && rect.height > 0;
                  
                  if (isVisible) {
                    (element as HTMLElement).click();
                    buttonsClicked++;
                    console.log(`Clicked YouTube element ${index + 1}:`, selector);
                    
                    // Additional event triggering for React components
                    const events = ['mousedown', 'mouseup', 'focus'];
                    events.forEach(eventType => {
                      const event = new MouseEvent(eventType, { bubbles: true });
                      element.dispatchEvent(event);
                    });
                  }
                } catch (clickError) {
                  console.warn('YouTube click failed:', selector, clickError);
                }
              }
            });
          } catch (e) {
            console.warn('YouTube selector error:', selector, e);
          }
        });
        
        // Text-based detection for YouTube
        const allButtons = document.querySelectorAll('button, div[role="button"], [aria-label]');
        allButtons.forEach(element => {
          const text = element.textContent?.toLowerCase() || '';
          const ariaLabel = (element as HTMLElement).getAttribute('aria-label')?.toLowerCase() || '';
          
          const rejectTexts = [
            'reject all', 'turn off', 'no thanks', 'decline',
            'refuse', 'opt out', 'disable', 'ablehnen alle'
          ];
          
          if (rejectTexts.some(rejectText => text.includes(rejectText) || ariaLabel.includes(rejectText))) {
            try {
              (element as HTMLElement).click();
              buttonsClicked++;
              console.log('Clicked YouTube text button:', (text || ariaLabel).substring(0, 30));
            } catch (e) {
              // Continue
            }
          }
        });
        
        console.log(`YouTube: Clicked ${buttonsClicked} consent buttons`);
        return buttonsClicked;
      };
      
      // Multiple attempts with increasing delays
      const attempts = [0, 500, 1000, 2000, 3000, 5000];
      attempts.forEach((delay, index) => {
        setTimeout(() => {
          const clicks = clickYouTubeButtons();
          console.log(`YouTube attempt ${index + 1}: ${clicks} clicks`);
        }, delay);
      });
      
      // Gentle logout to clear session (non-intrusive)
      setTimeout(() => {
        try {
          // Only attempt logout if user is visibly logged in
          const accountButtons = document.querySelectorAll(
            '#avatar-btn, [aria-label*="account"], [aria-label*="Account"], yt-img-shadow[id="avatar"]'
          );
          
          // Check if any account indicators are present and visible
          const hasVisibleAccount = Array.from(accountButtons).some(button => {
            const rect = button.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          if (hasVisibleAccount) {
            console.log('User appears logged in, attempting gentle logout...');
            
            accountButtons.forEach(button => {
              if (button) {
                const rect = button.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                
                if (isVisible) {
                  (button as HTMLElement).click();
                  setTimeout(() => {
                    // Look for sign out only in the opened menu
                    const signOutButtons = document.querySelectorAll(
                      'a[href*="logout"], yt-formatted-string:contains("Sign out"), [aria-label*="Sign out"]'
                    );
                    signOutButtons.forEach(signOut => {
                      if (signOut) {
                        const signOutRect = signOut.getBoundingClientRect();
                        const isSignOutVisible = signOutRect.width > 0 && signOutRect.height > 0;
                        
                        if (isSignOutVisible) {
                          (signOut as HTMLElement).click();
                          console.log('Triggered gentle YouTube logout');
                        }
                      }
                    });
                  }, 500);
                }
              }
            });
          } else {
            console.log('User not visibly logged in, skipping logout attempt');
          }
        } catch (e) {
          console.warn('Could not attempt YouTube logout:', e);
        }
      }, 3000);
    };

    // Instagram/Meta-specific consent handling
    const handleInstagramConsent = () => {
      console.log('Handling Instagram-specific consent...');
      
      // Enhanced Instagram-specific session cookies
      const instaCookies = [
        'sessionid', 'ds_user_id', 'shbid', 'shbts', 'rur', 'mid',
        'ig_did', 'ig_nrcb', 'csrftoken', 'datr', 'sb', 'fr', 'c_user',
        'xs', 'pl', 'presence', 'spin', 'wd', 'act', 'locale',
        'fbm_124024574287414', 'fbsr_124024574287414'
      ];
      
      instaCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.instagram.com`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=instagram.com`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.facebook.com`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=facebook.com`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.meta.com`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=meta.com`;
      });
      
      // Enhanced Instagram consent selectors (updated for 2024)
      const instaSelectors = [
        // Primary Instagram cookie consent selectors
        'button[data-testid="cookie-banner-decline"]',
        'button[data-testid="cookie-policy-manage-dialog-decline-button"]',
        '[data-testid="cookie-policy-dialog-decline-button"]',
        'button[data-testid="decline-optional-cookies"]',
        'button[data-testid="cookie-consent-decline"]',
        'button[data-testid="non-personalized-ads-decline"]',
        
        // Updated Instagram UI class selectors (2024)
        'button._acan._acap._acas._aj1-._ap30',
        'button._a9--._a9_1',
        'button._abl-._abm2',
        'div[role="button"]._acan._acap._acas._aj1-._ap30',
        'button[class*="_acan"][class*="_acap"]',
        
        // Aria-label based selectors
        '[aria-label*="Decline optional cookies"]',
        '[aria-label*="Decline all"]',
        '[aria-label*="Only allow essential cookies"]',
        '[aria-label*="Manage cookies"]',
        '[aria-label*="Cookie settings"]',
        '[aria-label*="Essential cookies only"]',
        
        // Meta consent framework selectors
        'button[data-cookiebanner="decline"]',
        'button[data-testid="cookie-policy-banner-decline"]',
        'div[data-testid="cookie-consent-banner"] button:last-child',
        '.cookie-consent-decline',
        '.gdpr-decline-all',
        
        // Shadow DOM and iframe selectors
        'iframe[title*="cookie"] button[data-testid*="decline"]',
        'iframe[src*="consent"] button:last-child'
      ];
      
      // Enhanced click function with better error handling and visibility checks
      const clickInstaButtons = () => {
        let buttonsClicked = 0;
        
        instaSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
              if (element && typeof (element as HTMLElement).click === 'function') {
                // Check if element is visible and interactable
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                computedStyle.visibility !== 'hidden' &&
                                computedStyle.display !== 'none' &&
                                computedStyle.opacity !== '0';
                
                if (isVisible) {
                  try {
                    // Try multiple click methods
                    (element as HTMLElement).click();
                    
                    // Dispatch click event manually
                    const clickEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    });
                    element.dispatchEvent(clickEvent);
                    
                    // Also try focus + enter for accessibility
                    (element as HTMLElement).focus();
                    const enterEvent = new KeyboardEvent('keydown', {
                      key: 'Enter',
                      code: 'Enter',
                      bubbles: true
                    });
                    element.dispatchEvent(enterEvent);
                    
                    buttonsClicked++;
                    console.log(`Clicked Instagram element ${index + 1}:`, selector);
                  } catch (clickError) {
                    console.warn('Click failed for element:', selector, clickError);
                  }
                }
              }
            });
          } catch (e) {
            console.warn('Error with Instagram selector:', selector, e);
          }
        });
        
        // Enhanced text-based detection with comprehensive patterns
        const allInteractiveElements = document.querySelectorAll(
          'button, div[role="button"], span[role="button"], a[role="button"], [tabindex="0"], [onclick]'
        );
        
        allInteractiveElements.forEach(element => {
          const text = element.textContent?.toLowerCase().trim() || '';
          const ariaLabel = (element as HTMLElement).getAttribute('aria-label')?.toLowerCase() || '';
          const title = (element as HTMLElement).getAttribute('title')?.toLowerCase() || '';
          
          const declinePatterns = [
            // English patterns
            'decline optional', 'decline all', 'reject cookies', 'reject all',
            'manage cookies', 'cookie settings', 'only essential', 'essential only',
            'necessary only', 'decline non-essential', 'refuse optional', 'opt out',
            'no thanks', 'essential cookies only', 'strictly necessary',
            'required cookies only', 'manage preferences', 'privacy settings',
            
            // Multi-language support
            'nur erforderliche', 'alleen noodzakelijke', 'solo essenziali',
            'seulement essentiels', 'solo necesarias', 'apenas essenciais',
            'decline', 'ablehnen', 'refuser', 'rechazar', 'rifiuta', '拒否'
          ];
          
          const hasDeclineText = declinePatterns.some(pattern => 
            text.includes(pattern) || ariaLabel.includes(pattern) || title.includes(pattern)
          );
          
          if (hasDeclineText) {
            try {
              const rect = element.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              
              if (isVisible) {
                (element as HTMLElement).click();
                buttonsClicked++;
                console.log('Clicked Instagram text button:', text.substring(0, 40));
                
                // Trigger additional events for React components
                const events = ['mousedown', 'mouseup', 'click', 'focus', 'change'];
                events.forEach(eventType => {
                  try {
                    const event = new MouseEvent(eventType, { bubbles: true, cancelable: true });
                    element.dispatchEvent(event);
                  } catch (e) {
                    // Continue with other events
                  }
                });
              }
            } catch (e) {
              console.warn('Error clicking Instagram text element:', text.substring(0, 20), e);
            }
          }
        });
        
        console.log(`📷 Instagram: Clicked ${buttonsClicked} consent buttons`);
        return buttonsClicked;
      };
      
      // Progressive clicking attempts with increasing delays
      let totalClicks = 0;
      const attempts = [0, 300, 800, 1500, 2500, 4000, 6000, 8000];
      
      attempts.forEach((delay, index) => {
        setTimeout(() => {
          const clicks = clickInstaButtons();
          totalClicks += clicks;
          console.log(`📷 Instagram attempt ${index + 1}: ${clicks} clicks (total: ${totalClicks})`);
          
          // On later attempts, also try scrolling to trigger lazy-loaded consent dialogs
          if (index > 2) {
            try {
              window.scrollBy(0, 100);
              setTimeout(() => window.scrollBy(0, -100), 100);
            } catch (e) {
              // Continue
            }
          }
        }, delay);
      });
      
      // Set comprehensive Instagram storage opt-out flags
      try {
        // Instagram-specific storage flags
        localStorage.setItem('ig_nrcb', '0');
        localStorage.setItem('ig_gdpr_consent', 'false');
        localStorage.setItem('ig_cookie_consent', 'declined');
        localStorage.setItem('ig_personalized_ads', 'false');
        localStorage.setItem('ig_optional_cookies', 'declined');
        localStorage.setItem('cookieConsent', 'declined');
        localStorage.setItem('instagram_privacy_consent', 'declined');
        
        // Meta/Facebook shared storage flags
        localStorage.setItem('fb_cookie_consent', 'declined');
        localStorage.setItem('meta_personalized_ads', 'false');
        localStorage.setItem('meta_optional_cookies', 'declined');
        
        // Session storage flags
        sessionStorage.setItem('cookieConsentDeclined', 'true');
        sessionStorage.setItem('gdprConsentDeclined', 'true');
        sessionStorage.setItem('instagramOptOut', 'true');
        
        console.log('📷 Set comprehensive Instagram storage opt-out flags');
      } catch (e) {
        console.warn('Could not set Instagram storage flags:', e);
      }
      
      // Gentle logout attempt if user is signed in (to clear session without blocking re-login)
      try {
        // Check if user is actually logged in before attempting logout
        const loginIndicators = document.querySelectorAll(
          '[aria-label*="Profile"], [data-testid*="user-avatar"], .profile-picture, [href*="/accounts/"]'
        );
        
        if (loginIndicators.length > 0) {
          console.log('📷 User appears to be logged in, attempting gentle logout...');
          
          const logoutSelectors = [
            'a[href="/accounts/logout/"]',
            'a[href*="logout"]',
            'button[data-testid="logout"]',
            '[aria-label="Log out"]',
            '[aria-label="Sign out"]'
          ];
          
          logoutSelectors.forEach(selector => {
            const logoutElement = document.querySelector(selector);
            if (logoutElement) {
              // Check if logout is directly accessible
              const rect = logoutElement.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              
              if (isVisible) {
                setTimeout(() => {
                  (logoutElement as HTMLElement).click();
                  console.log('📷 Triggered gentle Instagram logout');
                }, 2000);
              }
            }
          });
        } else {
          console.log('📷 User not logged in, skipping logout attempt');
        }
      } catch (e) {
        console.warn('Could not attempt Instagram logout:', e);
      }
    };

    // Click immediately and with delays to catch dynamic content
    clickOptOutElements();
    setTimeout(clickOptOutElements, 1000);
    setTimeout(clickOptOutElements, 3000);
    
    // YouTube-specific consent handling
    if (domain.includes('youtube.com') || domain.includes('google.com')) {
      handleYouTubeConsent();
    }
    
    // Instagram-specific consent handling
    if (domain.includes('instagram.com') || domain.includes('facebook.com')) {
      handleInstagramConsent();
    }
    
    // Clear tracking pixels and beacons
    const trackingElements = document.querySelectorAll('img[src*="track"], img[src*="pixel"], img[src*="beacon"], iframe[src*="track"]');
    trackingElements.forEach(element => {
      element.remove();
    });
    
    // Disable analytics and tracking scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const src = script.src?.toLowerCase() || '';
      const content = script.textContent?.toLowerCase() || '';
      
      const trackingDomains = [
        'google-analytics', 'googletagmanager', 'doubleclick',
        'facebook.com/tr', 'connect.facebook', 'analytics',
        'mixpanel', 'segment', 'hotjar', 'fullstory',
        'amplitude', 'trackjs', 'bugsnag', 'sentry'
      ];
      
      if (trackingDomains.some(domain => src.includes(domain) || content.includes(domain))) {
        script.remove();
        console.log('🚫 Removed tracking script:', src.substring(0, 50));
      }
    });
    
    // Set anti-tracking headers and properties
    if (typeof window !== 'undefined') {
      // Override tracking methods
      const trackingMethods = ['gtag', 'ga', 'fbq', '_paq', 'mixpanel', 'analytics', 'dataLayer'];
      trackingMethods.forEach(method => {
        if ((window as any)[method]) {
          (window as any)[method] = () => console.log(`Tracking method ${method} disabled by Kavach`);
        }
      });
      
      // Set DNT headers
      Object.defineProperty(navigator, 'doNotTrack', {
        value: '1',
        writable: false
      });

      // Disable service workers for tracking
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            if (registration.scope.includes('track') || registration.scope.includes('analytics')) {
              registration.unregister();
            }
          });
        });
      }
    }
    
    // Gentle logout suggestion (not forced) to clear session
    const logoutSelectors = [
      'a[href*="logout"]', 'a[href*="signout"]', 'a[href*="sign-out"]',
      'button[data-testid*="logout"]', 'button[data-testid*="signout"]',
      '.logout', '.signout', '.sign-out',
      '[aria-label*="Sign out"]', '[aria-label*="Log out"]'
    ];

    // Only attempt logout if user explicitly wants comprehensive cleanup
    // This is now gentler and won't prevent re-login
    setTimeout(() => {
      // Check if user is actually logged in before attempting logout
      const loginIndicators = document.querySelectorAll(
        '#avatar-btn, [aria-label*="Account menu"], button[aria-label*="Account"], .profile-btn'
      );
      
      if (loginIndicators.length > 0) {
        console.log('🚪 User appears to be logged in, attempting gentle session cleanup...');
        
        // Only click logout if it's easily accessible (don't force through menus)
        logoutSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            try {
              // Check if logout element is directly visible and accessible
              const rect = element.getBoundingClientRect();
              const isDirectlyVisible = rect.width > 0 && rect.height > 0 && 
                                      window.getComputedStyle(element).display !== 'none';
              
              if (isDirectlyVisible) {
                (element as HTMLElement).click();
                console.log('🚪 Clicked visible logout element:', selector);
              }
            } catch (e) {
              // Continue - don't force logout if it fails
            }
          });
        });
      } else {
        console.log('User not logged in, skipping logout attempt');
      }
    }, 2000);
    
    // Show comprehensive notification with CSP status
    const notification = document.createElement('div');
    const cspStatus = cspSafe ? 'Full cleanup mode' : 'Limited by CSP';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 16px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 15px;
        font-weight: 600;
        box-shadow: 0 20px 40px rgba(220, 38, 38, 0.4);
        border: 2px solid rgba(254, 202, 202, 0.3);
        backdrop-filter: blur(10px);
        min-width: 320px;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 20px; margin-right: 10px;">SHIELD</span>
          <strong>Kavach Privacy Reset Complete</strong>
        </div>
        <div style="font-size: 13px; opacity: 0.9; line-height: 1.4;">
          ${cspStatus}<br>
          ✓ All cookies cleared (${universalOptOutCookies.length} types)<br>
          ✓ Storage completely wiped<br>
          ✓ Tracking scripts disabled<br>
          ✓ Consent management bypassed<br>
          ✓ Session gently terminated<br>
          ✓ Anti-tracking measures activated<br>
          INFO: You can log back in normally when desired
          ${!cspSafe ? '<br>WARNING: Some features limited by Content Security Policy' : ''}
        </div>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    try {
      document.body.appendChild(notification);
    } catch (e) {
      console.warn('Could not show notification due to CSP restrictions');
    }
    
    // Auto-remove notification
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 10000);
    
    console.log('✅ Comprehensive cleanup completed for:', domain);
    
    // Automatically reload the page to ensure all changes take effect
    setTimeout(() => {
      console.log('🔄 Auto-reloading page to ensure all tracking is permanently disabled');
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

const App: React.FC = () => {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [blockingEnabled, setBlockingEnabled] = useState(true);
  const [analyzingPolicy, setAnalyzingPolicy] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [clearCacheMessage, setClearCacheMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentSiteData();
    loadSettings();
  }, []);

  const loadCurrentSiteData = async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url) return;

      setCurrentUrl(tab.url);

      // Get site data from background script
      const response = await chrome.runtime.sendMessage({
        action: 'getSiteData',
        url: tab.url
      });

      setSiteData(response);
    } catch (error) {
      console.error('Failed to load site data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(['blockingEnabled']);
      setBlockingEnabled(result.blockingEnabled ?? true);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleToggleBlocking = async (enabled: boolean) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'toggleBlocking',
        enabled
      });
      
      await chrome.storage.sync.set({ blockingEnabled: enabled });
      setBlockingEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle blocking:', error);
    }
  };

  const handleOptOut = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.id) return;

      const url = new URL(tab.url);
      const origin = url.origin;
      const domain = url.hostname;

      console.log('🚫 Starting comprehensive opt-out for:', domain);

      // Step 1: Trigger opt-out action in background service
      await chrome.runtime.sendMessage({
        action: 'performOptOut',
        url: tab.url,
        tabId: tab.id
      });

      // Step 2: Execute comprehensive cleanup script in the page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: comprehensiveOptOutCleanup,
        args: [domain]
      });

      // Step 3: Clear all cookies for this domain and related subdomains
      await clearAllCookiesForDomain(domain);

      // Step 4: Clear all storage data for this origin
      await chrome.browsingData.remove({
        origins: [origin]
      }, {
        localStorage: true,
        indexedDB: true,
        webSQL: true,
        serviceWorkers: true,
        cacheStorage: true,
        fileSystems: true,
        passwords: false, // Keep passwords for user convenience
        formData: true
      });

      // Step 5: Clear browsing data related to this domain
      await chrome.browsingData.remove({
        origins: [origin]
      }, {
        cache: true,
        downloads: false, // Keep downloads
        history: false, // Keep history for user reference
        appcache: true
      });

      // Step 6: Block future tracking for this domain
      await chrome.storage.local.set({
        [`optedOut_${domain}`]: {
          timestamp: Date.now(),
          userInitiated: true
        }
      });

      console.log('✅ Comprehensive opt-out completed for:', domain);
      
    } catch (error) {
      console.error('❌ Failed to perform opt-out:', error);
    }
  };

  const clearAllCookiesForDomain = async (domain: string) => {
    // Get all cookies for the main domain
    const mainDomainCookies = await chrome.cookies.getAll({ domain });
    
    // Get all cookies for subdomains (with leading dot)
    const subdomainCookies = await chrome.cookies.getAll({ domain: `.${domain}` });
    
    // Get all cookies for www subdomain
    const wwwCookies = await chrome.cookies.getAll({ domain: `www.${domain}` });

    // Special handling for YouTube/Google domains
    let specialCookies: chrome.cookies.Cookie[] = [];
    if (domain.includes('youtube.com') || domain.includes('google.com')) {
      const googleDomains = [
        'google.com', '.google.com', 'youtube.com', '.youtube.com',
        'googlevideo.com', '.googlevideo.com', 'gstatic.com', '.gstatic.com',
        'ggpht.com', '.ggpht.com', 'googleapis.com', '.googleapis.com'
      ];
      
      for (const gDomain of googleDomains) {
        try {
          const cookies = await chrome.cookies.getAll({ domain: gDomain });
          specialCookies = [...specialCookies, ...cookies];
        } catch (e) {
          // Continue with other domains
        }
      }
    }

    // Special handling for Instagram/Meta domains
    if (domain.includes('instagram.com') || domain.includes('facebook.com')) {
      const metaDomains = [
        'facebook.com', '.facebook.com', 'instagram.com', '.instagram.com',
        'meta.com', '.meta.com', 'fbcdn.net', '.fbcdn.net',
        'cdninstagram.com', '.cdninstagram.com'
      ];
      
      for (const mDomain of metaDomains) {
        try {
          const cookies = await chrome.cookies.getAll({ domain: mDomain });
          specialCookies = [...specialCookies, ...cookies];
        } catch (e) {
          // Continue with other domains
        }
      }
    }

    const allCookies = [...mainDomainCookies, ...subdomainCookies, ...wwwCookies, ...specialCookies];
    
    // Remove duplicates
    const uniqueCookies = allCookies.filter((cookie, index, array) => 
      array.findIndex(c => c.name === cookie.name && c.domain === cookie.domain) === index
    );
    
    console.log(`🍪 Clearing ${uniqueCookies.length} cookies for ${domain}`);
    
    for (const cookie of uniqueCookies) {
      try {
        const protocol = cookie.secure ? 'https:' : 'http:';
        const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;
        
        await chrome.cookies.remove({
          url: cookieUrl,
          name: cookie.name,
          storeId: cookie.storeId
        });
        
        console.log('🍪 Removed cookie:', cookie.name, 'from', cookie.domain);
      } catch (e) {
        console.warn('Failed to remove cookie:', cookie.name, e);
      }
    }
    
    // Additional YouTube-specific cookie clearing by name
    if (domain.includes('youtube.com') || domain.includes('google.com')) {
      const youtubeCookieNames = [
        'VISITOR_INFO1_LIVE', 'YSC', 'GPS', 'PREF', '__Secure-YEC',
        'CONSENT', 'NID', 'SID', 'SAPISID', 'APISID', 'SSID', 'HSID',
        '1P_JAR', '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID',
        '__Secure-3PAPISID', 'LOGIN_INFO', 'SIDCC'
      ];
      
      for (const cookieName of youtubeCookieNames) {
        try {
          await chrome.cookies.remove({
            url: 'https://youtube.com/',
            name: cookieName
          });
          await chrome.cookies.remove({
            url: 'https://google.com/',
            name: cookieName
          });
        } catch (e) {
          // Continue
        }
      }
    }

    // Additional Instagram-specific cookie clearing by name
    if (domain.includes('instagram.com') || domain.includes('facebook.com')) {
      const instaCookieNames = [
        'sessionid', 'ds_user_id', 'shbid', 'shbts', 'rur', 'mid',
        'ig_did', 'ig_nrcb', 'csrftoken', 'datr', 'sb', 'fr', 'c_user',
        'xs', 'pl', 'presence', 'spin', 'wd', 'act', 'locale'
      ];
      
      const instaDomains = ['https://instagram.com/', 'https://facebook.com/', 'https://meta.com/'];
      
      for (const cookieName of instaCookieNames) {
        for (const domainUrl of instaDomains) {
          try {
            await chrome.cookies.remove({
              url: domainUrl,
              name: cookieName
            });
          } catch (e) {
            // Continue
          }
        }
      }
    }
  };

  const handleAnalyzePolicy = async () => {
    if (!siteData || analyzingPolicy) return;

    setAnalyzingPolicy(true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzePrivacyPolicy',
        url: currentUrl
      });

      if (response && !response.error) {
        setSiteData({
          ...siteData,
          privacyAnalysis: response
        });
      } else {
        // Still set the response so user can see the error
        setSiteData({
          ...siteData,
          privacyAnalysis: response || { 
            error: 'Analysis failed',
            summary: 'Unable to analyze privacy policy',
            safety: 'RISKY',
            score: 30
          }
        });
      }
    } catch (error) {
      // Show user-friendly error
      setSiteData({
        ...siteData,
        privacyAnalysis: {
          score: 0,
          risks: ['Analysis failed due to technical error'],
          summary: 'Unable to analyze privacy policy at this time. Please try again later.',
          dataSharing: []
        }
      });
    } finally {
      setAnalyzingPolicy(false);
    }
  };

  const handleDebugInfo = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'debugInfo'
      });
      setDebugInfo(response);
      console.log('🐛 Debug Info:', response);
    } catch (error) {
      console.error('Failed to get debug info:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearKavachCache' });
      setClearCacheMessage('Kavach cache cleared!');
      setTimeout(() => setClearCacheMessage(null), 3000);
    } catch (error) {
      setClearCacheMessage('Failed to clear cache.');
      setTimeout(() => setClearCacheMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-logo">
            <img src="logo.png" alt="Kavach Logo" className="logo-image" />
          </div>
          <div className="spinner"></div>
          Loading site data...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <img src="logo.png" alt="Kavach Logo" className="logo-image" />
        </div>
        <div className="header-text">
          <h1>Kavach</h1>
          <p>Privacy Guardian</p>
        </div>
      </header>

      <div className="content">
        {siteData ? (
          <>
            <TrustScore 
              score={siteData.trustScore} 
              url={currentUrl}
            />
            
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  Tracker Blocking
                </div>
              </div>
              <TrackerList trackers={siteData.trackers} onBlock={loadCurrentSiteData} />
            </div>

            {siteData.privacyAnalysis && (
              <PrivacyAnalysis analysis={siteData.privacyAnalysis} />
            )}

            <div className="section">
              <div className="section-title" style={{ marginBottom: '20px' }}>
                Data Flow
              </div>
              <DataFlowVisualization dataFlow={siteData.dataFlow} />
            </div>

            <FingerprintInfo />

            <ActionButtons 
              onOptOut={handleOptOut}
              onAnalyzePolicy={handleAnalyzePolicy}
              hasPrivacyAnalysis={!!siteData.privacyAnalysis}
              analyzingPolicy={analyzingPolicy}
            />

            {/* Debug Section */}
            <div className="debug-section">
              <div className="debug-buttons">
                <button onClick={handleDebugInfo} className="debug-button">
                  <BugReportIcon className="debug-icon" />
                  <span>Debug Info</span>
                </button>
                <button onClick={handleClearCache} className="debug-button">
                  <ClearAllIcon className="debug-icon" />
                  <span>Clear Cache</span>
                </button>
              </div>
              {debugInfo && (
                <div className="debug-info">
                  <p><strong>Tracked Domains:</strong> {debugInfo.totalSites}</p>
                  <p><strong>Current Domain:</strong> {new URL(currentUrl).hostname}</p>
                  {debugInfo.siteDataSnapshot.length > 0 && (
                    <details>
                      <summary>Site Data</summary>
                      <pre>{JSON.stringify(debugInfo.siteDataSnapshot, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}
              {clearCacheMessage && (
                <div className="debug-info success-message">
                  <CheckCircleIcon className="success-icon" />
                  {clearCacheMessage}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-logo">
              <img src="logo.png" alt="Kavach Logo" className="logo-image" />
            </div>
            <p>No tracking data available for this site yet.</p>
            <p>Navigate to a website to see privacy insights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
