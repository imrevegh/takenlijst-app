# GitHub Actions Keep-Alive Setup

GitHub Actions zal je Render app automatisch elke 10 minuten pingen om cold starts te voorkomen.

## 🚀 Eenmalige Setup (2 minuten)

### Stap 1: Repository Secrets instellen
1. Ga naar je GitHub repository
2. Klik op **Settings** (bovenaan)
3. Klik op **Secrets and variables** → **Actions** (links)
4. Klik op **New repository secret**
5. Vul in:
   - **Name**: `APP_URL`
   - **Secret**: `https://jouw-app-naam.onrender.com` (vervang met je echte Render URL)
6. Klik **Add secret**

### Stap 2: Workflows activeren
De workflows worden automatisch actief zodra je ze pusht naar GitHub!

✅ **Dat is alles!** GitHub Actions doet nu de rest.

## 📊 Wat er gebeurt

### Keep-Alive Service (`keep-alive.yml`)
- 🕐 **Frequentie**: Elke 10 minuten, 24/7
- 🎯 **Doel**: Ping `/api/tasks` endpoint
- ✅ **Succes**: HTTP 200 of 401 (beide betekenen app is wakker)
- 🔄 **Retry**: 3 pogingen bij failures
- 📈 **Resultaat**: 90%+ minder cold starts

### Daily Health Check (`daily-health-check.yml`)
- 🕐 **Frequentie**: Elke dag om 09:00 UTC (11:00 CET)
- 🏥 **Tests**: Login, API, CSS, JavaScript endpoints
- 📊 **Metrics**: Response times en status monitoring
- 🚨 **Alerts**: Detecteert problemen vroeg

## 🔍 Monitoring

### Logs bekijken
1. Ga naar je GitHub repository
2. Klik op **Actions** tab (bovenaan)
3. Zie je workflows draaien:
   - 🟢 **Keep-Alive Service** - laatste ping status
   - 🟢 **Daily Health Check** - dagelijkse health status

### Wat betekenen de statuses?
- ✅ **Groen**: App reageert snel (warm)
- 🟡 **Geel**: App reageert traag (mogelijk cold start)
- ❌ **Rood**: App reageert niet (probleem of zeer trage cold start)

## 🛠️ Troubleshooting

### "APP_URL secret not configured"
➡️ Je hebt Stap 1 nog niet gedaan. Voeg de `APP_URL` secret toe.

### Alle pings falen
Mogelijke oorzaken:
1. **Verkeerde URL**: Check of je APP_URL klopt
2. **App down**: Check je Render dashboard
3. **Render issue**: Tijdelijke problemen bij Render

### Test handmatig
```bash
# Test je URL lokaal
curl -I https://jouw-app-naam.onrender.com/api/tasks

# Verwachte output:
# HTTP/2 401 (auth required) = ✅ App werkt
# HTTP/2 200 = ✅ App werkt (onverwacht maar oké)
# Timeout/error = ❌ Probleem
```

### Workflow handmatig starten
1. Ga naar **Actions** tab
2. Klik op **Keep-Alive Service**
3. Klik **Run workflow** → **Run workflow**

## 📈 Resultaten verwachten

### Voor GitHub Actions Keep-Alive:
- 🐌 **Cold start**: 20-60 seconden laadtijd
- 😴 **App slaapt**: Na 15 minuten inactiviteit

### Na GitHub Actions Keep-Alive:
- 🚀 **Warm start**: 1-3 seconden laadtijd  
- ⚡ **App wakker**: 95% van de tijd
- 😴 **Zeldzame cold starts**: Alleen bij Render maintenance/restarts

## 💡 Pro Tips

### GitHub Actions limieten
- ✅ **Gratis**: 2000 minuten/maand (ruim voldoende)
- ✅ **Usage**: ~144 minuten/maand voor keep-alive
- ✅ **Overig**: Blijft ruim over voor andere workflows

### Efficiëntie optimaliseren
De workflows zijn al geoptimaliseerd:
- HEAD requests (sneller dan GET)
- Korte timeouts (geen lange waits)
- Smart retry logic
- Minimale compute tijd

### Alternatieve frequenties
Wil je minder vaak pingen? Edit `.github/workflows/keep-alive.yml`:
```yaml
# Elke 15 minuten (riskanter maar minder usage)
- cron: '*/15 * * * *'

# Elke 5 minuten (extra zeker maar meer usage)  
- cron: '*/5 * * * *'
```

## 🎉 Klaar!

Je Render app wordt nu 24/7 warm gehouden door GitHub Actions!

**Verwacht resultaat**: In plaats van 20-60 seconden cold starts, laadt je app nu binnen 1-3 seconden. 🚀