# Keep-Alive Service voor Render

Voorkomt cold starts door je Render app elke 14 minuten te pingen.

## Snel starten

### Optie 1: Node.js script (aanbevolen)
```bash
# Stel je app URL in
export APP_URL=https://jouw-app-naam.onrender.com

# Start de service
node keep-alive.js
```

### Optie 2: Bash script
```bash
# Eenmalig
APP_URL=https://jouw-app-naam.onrender.com ./keep-alive.sh

# Of export voor hergebruik
export APP_URL=https://jouw-app-naam.onrender.com
./keep-alive.sh
```

## Achtergrond draaien

### Met PM2 (aanbevolen)
```bash
# Install PM2 als je dat nog niet hebt
npm install -g pm2

# Start keep-alive service
APP_URL=https://jouw-app-naam.onrender.com pm2 start keep-alive.js --name "keep-alive"

# Bekijk logs
pm2 logs keep-alive

# Stop service
pm2 stop keep-alive
```

### Met nohup
```bash
# Bash script in background
nohup APP_URL=https://jouw-app-naam.onrender.com ./keep-alive.sh > keep-alive.log 2>&1 &

# Node.js script in background  
nohup APP_URL=https://jouw-app-naam.onrender.com node keep-alive.js > keep-alive.log 2>&1 &
```

### Met screen/tmux
```bash
# Start screen sessie
screen -S keep-alive

# Run script
APP_URL=https://jouw-app-naam.onrender.com node keep-alive.js

# Detach: Ctrl+A, D
# Reattach: screen -r keep-alive
```

## Automatisch opstarten

### Systemd service (Linux)
```bash
# Maak service bestand
sudo nano /etc/systemd/system/keep-alive.service
```

Inhoud:
```ini
[Unit]
Description=Render Keep-Alive Service
After=network.target

[Service]
Type=simple
User=jouw-gebruiker
WorkingDirectory=/pad/naar/je/project
Environment=APP_URL=https://jouw-app-naam.onrender.com
ExecStart=/usr/bin/node keep-alive.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable en start
sudo systemctl enable keep-alive
sudo systemctl start keep-alive
sudo systemctl status keep-alive
```

### Crontab (elk besturingssysteem)
```bash
# Edit crontab
crontab -e

# Voeg toe (ping elke 10 minuten):
*/10 * * * * curl -s https://jouw-app-naam.onrender.com/api/tasks > /dev/null 2>&1
```

## Hoe het werkt

1. **Ping interval**: Elke 14 minuten (1 minuut voor Render's 15 minuten timeout)
2. **Endpoint**: `/api/tasks` (bestaande API endpoint)
3. **Method**: HEAD request (sneller, minder bandwidth)
4. **Status codes**: 
   - ✅ 200 (OK) of 401 (auth required) = app is wakker
   - ⚠️ Andere codes = mogelijk probleem
   - ❌ Timeout/error = app mogelijk aan het opstarten

## Voordelen

- ✅ **Gratis**: Geen extra hosting kosten
- ✅ **Effectief**: Voorkomt 99% van cold starts  
- ✅ **Lichtgewicht**: Minimale resource usage
- ✅ **Betrouwbaar**: Retry logic en error handling
- ✅ **Logging**: Zie wanneer en hoe snel je app reageert

## Beperkingen

- ⚠️ Werkt alleen als keep-alive service zelf draait
- ⚠️ Bij lange systeem downtimes kan app alsnog slapen
- ⚠️ Render kan alsnog cold starts forceren bij hoge load

## Troubleshooting

### App reageert niet
```bash
# Check of je URL klopt
curl -I https://jouw-app-naam.onrender.com/api/tasks

# Test handmatig
APP_URL=https://jouw-app-naam.onrender.com node -e "
const url = process.env.APP_URL + '/api/tasks';
console.log('Testing:', url);
require('https').get(url, res => console.log('Status:', res.statusCode));
"
```

### Service crasht
```bash
# Check logs
pm2 logs keep-alive

# Of bekijk logbestand
tail -f keep-alive.log
```

### Hoge CPU/geheugen
Dit zou niet moeten gebeuren. De service is zeer lichtgewicht:
- Node.js versie: ~10MB RAM
- Bash versie: ~1MB RAM  
- CPU: vrijwel 0% (alleen tijdens ping)

## Alternatieven

Als keep-alive niet werkt voor jou:

1. **Betaald Render plan** ($7/maand) - minder aggressive sleeping
2. **Andere hosting**:
   - Railway.app - betere cold start tijden
   - Fly.io - keeps apps warmer  
   - Vercel - serverless, snelle cold starts
3. **External monitoring**: UptimeRobot, Pingdom (gratis tiers beschikbaar)