# Cloudflare Setup Guide for Aya Eye

Complete guide for configuring Cloudflare with your domain and Aya Eye application.

## Prerequisites

- Domain purchased and registered
- Cloudflare account (free plan works)
- Linux server with public IP address

## Step 1: Add Domain to Cloudflare

1. **Log in to Cloudflare:**
   - Go to https://dash.cloudflare.com
   - Sign up or log in

2. **Add Your Site:**
   - Click **"Add a Site"**
   - Enter your domain (e.g., `yourdomain.com`)
   - Click **"Add site"**

3. **Select Plan:**
   - Choose **Free** plan (sufficient for most use cases)
   - Click **"Continue"**

4. **Cloudflare Scans DNS:**
   - Cloudflare will automatically scan your existing DNS records
   - Review the records found
   - Click **"Continue"**

## Step 2: Update Nameservers at Registrar

Cloudflare will provide you with nameservers like:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**At Your Domain Registrar:**

1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find **DNS Settings** or **Nameserver Settings**
3. Replace existing nameservers with Cloudflare's nameservers
4. Save changes

**Wait for Propagation:**
- Usually takes 1-2 hours
- Can take up to 24 hours
- Check status in Cloudflare dashboard (should show "Active")

## Step 3: Configure DNS Records

In Cloudflare dashboard, go to **DNS** → **Records**:

### Add A Record (Main Domain)

1. Click **"Add record"**
2. Configure:
   - **Type:** `A`
   - **Name:** `@` (or leave blank for root domain)
   - **IPv4 address:** `YOUR_SERVER_IP`
   - **Proxy status:** 🟠 **Proxied** (orange cloud) - **IMPORTANT**
   - **TTL:** Auto
3. Click **"Save"**

### Add CNAME Record (www)

1. Click **"Add record"**
2. Configure:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** `yourdomain.com` (or `@`)
   - **Proxy status:** 🟠 **Proxied**
   - **TTL:** Auto
3. Click **"Save"**

### Optional: Add Subdomain for Admin

1. Click **"Add record"**
2. Configure:
   - **Type:** `A`
   - **Name:** `admin`
   - **IPv4 address:** `YOUR_SERVER_IP`
   - **Proxy status:** 🟠 **Proxied**
   - **TTL:** Auto
3. Click **"Save"**

## Step 4: SSL/TLS Configuration

### Overview Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **"Full"** or **"Full (strict)"**
   - **Full:** Allows self-signed certificates on origin
   - **Full (strict):** Requires valid SSL certificate on origin (recommended)
3. This ensures encrypted connection between Cloudflare and your server

### Edge Certificates

1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable:
   - ✅ **Always Use HTTPS** - Automatically redirects HTTP to HTTPS
   - ✅ **Automatic HTTPS Rewrites** - Rewrites HTTP links to HTTPS
   - ✅ **Minimum TLS Version:** 1.2 (or 1.3)
3. **Universal SSL** should be enabled automatically (free)

### Origin Server Certificate (Recommended)

**Option 1: Use Let's Encrypt (Recommended)**

On your server:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

This automatically configures SSL on your server. Set Cloudflare SSL mode to **"Full (strict)"**.

**Option 2: Use Cloudflare Origin Certificate**

1. Go to **SSL/TLS** → **Origin Server**
2. Click **"Create Certificate"**
3. Configure:
   - **Private key type:** RSA (2048)
   - **Hostnames:** 
     - `yourdomain.com`
     - `*.yourdomain.com` (for subdomains)
   - **Certificate Validity:** 15 years
4. Click **"Create"**
5. Copy both:
   - **Origin Certificate** (public key)
   - **Private Key**
6. Save on your server:
   ```bash
   sudo mkdir -p /etc/nginx/ssl
   sudo nano /etc/nginx/ssl/yourdomain.com.crt
   # Paste Origin Certificate
   
   sudo nano /etc/nginx/ssl/yourdomain.com.key
   # Paste Private Key
   
   sudo chmod 600 /etc/nginx/ssl/yourdomain.com.key
   sudo chmod 644 /etc/nginx/ssl/yourdomain.com.crt
   ```
7. Update Nginx config to use these certificates
8. Set SSL mode to **"Full (strict)"**

## Step 5: Security Settings

### Web Application Firewall (WAF)

1. Go to **Security** → **WAF**
2. **Free plan:** Basic security rules are enabled automatically
3. Review and adjust rules as needed

### Bot Fight Mode

1. Go to **Security** → **Bots**
2. Enable **Bot Fight Mode** (free)
3. Or configure **Super Bot Fight Mode** (paid)

### Firewall Rules

1. Go to **Security** → **WAF** → **Tools**
2. Create rules to:
   - Block specific countries (if needed)
   - Rate limit requests
   - Block suspicious IPs

## Step 6: Speed & Performance

### Auto Minify

1. Go to **Speed** → **Optimization**
2. Enable:
   - ✅ **Auto Minify:** HTML, CSS, JavaScript
   - ✅ **Brotli** compression

### Caching

1. Go to **Caching** → **Configuration**
2. Set:
   - **Caching Level:** Standard
   - **Browser Cache TTL:** 4 hours (or as needed)
3. Go to **Caching** → **Cache Rules**
4. Create rules for:
   - Static assets (images, CSS, JS): Cache everything
   - API routes: Bypass cache
   - HTML pages: Standard cache

### Page Rules (Optional)

1. Go to **Rules** → **Page Rules**
2. Create rules like:
   - `yourdomain.com/api/*` - Cache Level: Bypass
   - `yourdomain.com/_next/static/*` - Cache Level: Cache Everything

## Step 7: Network Settings

### HTTP/2

1. Go to **Network**
2. Enable:
   - ✅ **HTTP/2**
   - ✅ **HTTP/3 (with QUIC)** - Modern protocol
   - ✅ **0-RTT Connection Resumption**

### IPv6 Compatibility

1. Go to **Network**
2. Enable **IPv6 Compatibility** (if your server supports it)

## Step 8: Verify Configuration

### Check DNS Propagation

```bash
# From your local machine
nslookup yourdomain.com
dig yourdomain.com

# Should show Cloudflare IPs (not your server IP directly)
```

### Test SSL

1. Visit `https://yourdomain.com`
2. Check browser shows secure connection
3. Click padlock icon → Certificate should show Cloudflare

### Test Performance

1. Go to **Analytics** → **Web Analytics**
2. Check traffic is being routed through Cloudflare
3. Use tools like:
   - https://www.ssllabs.com/ssltest/ (test SSL)
   - https://tools.pingdom.com/ (test speed)

## Step 9: Update Server Configuration

### Nginx Configuration

Update your Nginx config to work with Cloudflare:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cloudflare specific headers
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Firewall Configuration

If using Cloudflare proxy (orange cloud), you can restrict direct access:

```bash
# Only allow Cloudflare IPs (optional, Cloudflare handles this)
# Or simply allow HTTP/HTTPS from anywhere since Cloudflare proxies
ufw allow 80/tcp
ufw allow 443/tcp
```

## Troubleshooting

### DNS Not Resolving

1. Check nameservers at registrar match Cloudflare
2. Wait for propagation (up to 24 hours)
3. Use `dig yourdomain.com` to check DNS

### SSL Errors

1. Check SSL mode is "Full" or "Full (strict)"
2. Verify SSL certificate on server is valid
3. Check Nginx SSL configuration

### 502 Bad Gateway

1. Check if application is running: `pm2 status`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify Cloudflare SSL mode is correct

### Site Not Loading

1. Check DNS records point to correct server IP
2. Verify server firewall allows Cloudflare IPs
3. Check application logs: `pm2 logs aya-eye`

## Best Practices

1. **Always use Proxied (orange cloud)** for DNS records
2. **Enable "Always Use HTTPS"** in Cloudflare
3. **Use "Full (strict)" SSL mode** with valid certificate
4. **Enable Bot Fight Mode** for security
5. **Configure caching** for static assets
6. **Monitor analytics** for traffic patterns
7. **Set up alerts** for downtime or security events

## Cloudflare Dashboard Quick Links

- **DNS Records:** https://dash.cloudflare.com → Your Site → DNS
- **SSL/TLS:** https://dash.cloudflare.com → Your Site → SSL/TLS
- **Security:** https://dash.cloudflare.com → Your Site → Security
- **Speed:** https://dash.cloudflare.com → Your Site → Speed
- **Analytics:** https://dash.cloudflare.com → Your Site → Analytics

---

**Last Updated:** 2026-02-17
