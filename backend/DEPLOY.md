# 🚀 Deploy Kavach Backend to Render

## Step-by-Step Deployment Guide

### Prerequisites
- ✅ Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- ✅ GitHub account with your Kavach project
- ✅ Render account (free at [render.com](https://render.com))

### 1. Prepare Your Repository

First, make sure your backend code is pushed to GitHub:

```bash
# Add backend to your git repository
git add backend/
git commit -m "Add Kavach backend with Gemini AI integration"
git push origin main
```

### 2. Create Render Web Service

1. **Login to Render**: Go to [render.com](https://render.com) and sign in
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: Connect your GitHub repository
4. **Configure Service**:
   - **Name**: `kavach-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18` (recommended for stability)

### 3. Environment Variables

In the Render dashboard, add these environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `GEMINI_API_KEY` | `AIzaSyCS1_3cdyCSUlsSvZ-UlRpmp6w2ZwTb7m0` | Your Google Gemini API key |
| `NODE_ENV` | `production` | Production environment |
| `PORT` | (auto-assigned by Render) | Server port |
| `ALLOWED_ORIGINS` | `chrome-extension://,moz-extension://` | CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### 4. Deploy

Click **"Create Web Service"** and wait for deployment:

- ⏳ Build process starts automatically
- 📦 Dependencies installed (`npm install`)
- 🏗️ TypeScript compiled (`npm run build`)
- 🚀 Server starts (`npm start`)
- ✅ Deployment complete!

## 🔧 Troubleshooting Render Deployment

### Build Failed Issues

If you see "Build failed 😞", try these solutions:

1. **Missing Dependencies Error**:
   ```bash
   # Solution: Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Timeout During Build**:
   - **Root Cause**: Large dependencies like Puppeteer
   - **Solution**: Use our optimized package.json (already fixed)
   - **Build Command**: `npm install --production=false && npm run build`

3. **TypeScript Compilation Errors**:
   ```bash
   # Test locally first
   npm run build
   
   # Check for missing type definitions
   npm install --save-dev @types/cors @types/express @types/node
   ```

4. **Environment Variables Not Loading**:
   - Verify all variables are set in Render dashboard
   - Check variable names match exactly (case-sensitive)
   - Restart service after adding variables

### Common Error Messages

**"Could not find a declaration file for module 'cors'"**
- **Fix**: Already included `@types/cors` in devDependencies

**"find: './node_modules/[package]': No such file or directory"**
- **Fix**: Removed problematic packages (puppeteer)
- **Alternative**: Use our clean package.json

**"Build timeout"**
- **Fix**: Simplified dependencies, removed heavy packages
- **Fallback**: Use build command with `--production=false`

## 🔧 Troubleshooting Build Issues

### TypeScript Build Errors

If you encounter TypeScript declaration file errors like:
```
error TS7016: Could not find a declaration file for module 'cors'
```

**Solution**: The updated `package.json` moves all TypeScript types to `dependencies` instead of `devDependencies` to ensure they're available during Render builds.

### Build Timeout Issues

If the build times out during `npm install`:

1. **Check Dependencies**: Ensure no heavy dependencies like `puppeteer` are included
2. **Use Lighter Alternatives**: We use `cheerio` + `axios` instead of `puppeteer`
3. **Clear Build Cache**: In Render dashboard → Settings → Clear build cache

### Environment Variable Issues

If you see "GEMINI_API_KEY environment variable is required":

1. **Double-check** the environment variable is set correctly in Render
2. **Restart** the service after adding environment variables
3. **Check logs** for any typos in variable names

### Deployment Checklist

Before deploying, verify:

- ✅ All TypeScript files compile: `npm run build`
- ✅ Environment variables set in Render dashboard
- ✅ Latest code pushed to GitHub
- ✅ Root directory set to `backend`
- ✅ Build command: `npm install --production=false && npm run build`
- ✅ Start command: `npm start`

### Performance Monitoring

After successful deployment:

1. **Check Health Endpoint**: `https://your-app.onrender.com/health`
2. **Monitor Logs**: Watch for Gemini API initialization
3. **Test Analysis**: Try the privacy policy analysis endpoint
4. **Memory Usage**: Should stay under 512MB on free tier
   ```bash
   curl https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

2. **Privacy Analysis**:
   ```bash
   curl -X POST https://your-service-name.onrender.com/api/privacy-policy/analyze \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.google.com"}'
   ```

### 6. Update Chrome Extension

Update your Chrome extension to use the deployed API:

**Edit `src/utils/privacy.ts`:**
```typescript
export class PrivacyPolicyAnalyzer {
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-service-name.onrender.com/api'  // 👈 Update this URL
    : 'http://localhost:3000/api';
  
  // ... rest of the code
}
```

**Rebuild your extension:**
```bash
npm run build
```

### 7. Load Updated Extension

1. Open Chrome → Extensions (`chrome://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your `dist` folder
5. Test on any website!

## 🔧 Troubleshooting

### Common Deployment Issues:

**Build Failed - Hanging on npm install**
- This usually happens with heavy dependencies like Puppeteer
- The updated package.json removes puppeteer in favor of puppeteer-core
- Make sure you've committed the latest package.json changes
- If still hanging, try using a smaller build command: `npm ci --production && npm run build`

**Environment Variables**
- Double-check `GEMINI_API_KEY` is set correctly
- Test API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Restart service after changing env vars

**CORS Errors**
- Verify `ALLOWED_ORIGINS` includes `chrome-extension://`
- Check browser console for specific CORS errors
- Ensure extension manifest allows the domain

**API Timeouts**
- Render free tier sleeps after 15 min inactivity
- First request may take 30+ seconds to wake up
- Consider upgrading to paid tier for always-on service

### Monitoring Your Service

**Render Dashboard Features:**
- 📊 **Metrics**: View CPU, memory, and request stats
- 📝 **Logs**: Real-time server logs
- 🔄 **Deployments**: History and rollback options
- ⚙️ **Settings**: Environment variables and configuration

**Key Metrics to Watch:**
- Response times (should be < 10s for most requests)
- Error rates (should be < 5%)
- Memory usage (should stay under 512MB on free tier)

## 💰 Cost Breakdown

### Render Free Tier
- ✅ **750 hours/month** (enough for continuous deployment)
- ✅ **512MB RAM** 
- ✅ **0.1 CPU**
- ⚠️ **Sleeps after 15min inactivity**
- ⚠️ **Limited to 100GB bandwidth/month**

### Gemini API Costs
- ✅ **Free tier**: 15 requests/minute, 1,500 requests/day
- 💰 **Paid tier**: $0.00025 per 1K characters
- 📊 **Average cost**: ~$0.003 per privacy policy analysis

### Upgrading for Production

For high-traffic production use, consider:

1. **Render Pro ($7/month)**:
   - Always-on (no sleeping)
   - More RAM and CPU
   - Priority support

2. **Add Redis Caching**:
   - Cache privacy analyses
   - Reduce API calls to Gemini
   - Faster response times

3. **Database Integration**:
   - PostgreSQL on Render
   - Store user preferences
   - Analytics and usage tracking

## 🎉 Success!

Your Kavach Privacy Guardian now has:
- ✅ Real AI-powered privacy analysis
- ✅ Automatic privacy policy detection  
- ✅ Comprehensive risk assessment
- ✅ GDPR/CCPA compliance checking
- ✅ Production-ready backend

Share your deployed service URL in the Chrome extension and start protecting users' privacy with real AI insights!

---

**Need help?** Check the [Render documentation](https://render.com/docs) or the server logs in your Render dashboard.
