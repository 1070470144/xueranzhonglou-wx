# coturn Voice Relay Deployment

This project keeps the current browser WebRTC P2P voice path and uses coturn
only as a STUN/TURN fallback. Direct P2P is still preferred; TURN relays audio
when two browsers cannot connect directly.

The production site is Docker deployed on Linux. Code updates can keep using:

```bash
APP_DIR=/opt/townsquare/xueranzhonglou-wx/townsquare-develop BRANCH=master bash scripts/update.sh
```

## 1. Cloudflare DNS

In Cloudflare, add a DNS record:

```text
Type: A
Name: turn
IPv4 address: your server public IPv4
Proxy status: DNS only
```

The proxy status must be **DNS only**. Do not use the orange cloud for TURN,
because TURN needs raw UDP/TCP traffic and Cloudflare's normal HTTP proxy does
not proxy those ports.

After it propagates:

```text
turn.xuerantools.org -> your server public IPv4
```

## 2. Firewall

Open these ports in both places:

- The cloud provider security group.
- The Linux server firewall, if `ufw` or another firewall is enabled.

```text
3478/tcp         TURN/STUN TCP
3478/udp         TURN/STUN UDP
5349/tcp         TURN over TLS
49160-49260/udp  TURN relay media ports
```

For `ufw`:

```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 49160:49260/udp
```

## 3. Certificate

Install Certbot on the Linux server and issue a free Let's Encrypt certificate:

```bash
sudo apt update
sudo apt install -y certbot
sudo certbot certonly --standalone -d turn.xuerantools.org
```

The certificate files should be created here:

```text
/etc/letsencrypt/live/turn.xuerantools.org/fullchain.pem
/etc/letsencrypt/live/turn.xuerantools.org/privkey.pem
```

If port 80 is already used by another service on the host, use your existing
Nginx or server panel to issue the certificate instead, then point the coturn
Docker volume to the same certificate paths.

## 4. Run coturn With Docker

Create a config directory:

```bash
sudo mkdir -p /opt/townsquare/coturn
```

Create `/opt/townsquare/coturn/turnserver.conf`:

```bash
sudo tee /opt/townsquare/coturn/turnserver.conf >/dev/null <<'EOF'
listening-port=3478
tls-listening-port=5349

listening-ip=0.0.0.0
relay-ip=YOUR_PUBLIC_IP
external-ip=YOUR_PUBLIC_IP

min-port=49160
max-port=49260

fingerprint
lt-cred-mech
user=voice-user:replace-with-a-strong-password
realm=turn.xuerantools.org

cert=/etc/letsencrypt/live/turn.xuerantools.org/fullchain.pem
pkey=/etc/letsencrypt/live/turn.xuerantools.org/privkey.pem

no-multicast-peers
no-cli
simple-log
log-file=stdout
EOF
```

Replace these before starting:

```text
YOUR_PUBLIC_IP
voice-user
replace-with-a-strong-password
```

Start coturn:

```bash
docker run -d \
  --name townsquare-coturn \
  --restart unless-stopped \
  --network host \
  -v /opt/townsquare/coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  coturn/coturn:latest \
  -c /etc/coturn/turnserver.conf
```

Check logs:

```bash
docker logs townsquare-coturn
```

Restart after config changes:

```bash
docker restart townsquare-coturn
```

## 5. Frontend Build Environment

The update script loads build variables from:

```text
/opt/townsquare/config/townsquare.env
```

Add these values to that file:

```env
VUE_APP_VOICE_STUN_URLS=stun:turn.xuerantools.org:3478
VUE_APP_VOICE_TURN_URLS=turn:turn.xuerantools.org:3478?transport=udp,turn:turn.xuerantools.org:3478?transport=tcp,turns:turn.xuerantools.org:5349?transport=tcp
VUE_APP_VOICE_TURN_USERNAME=voice-user
VUE_APP_VOICE_TURN_CREDENTIAL=replace-with-a-strong-password
```

Use the same username and password from `turnserver.conf`.

Then rebuild and restart the site:

```bash
APP_DIR=/opt/townsquare/xueranzhonglou-wx/townsquare-develop BRANCH=master bash scripts/update.sh
```

## 6. Smoke Test

1. Join one room from two different networks, for example home Wi-Fi and mobile
   data.
2. Enable voice for both users.
3. Open browser WebRTC internals:
   - Chrome: `chrome://webrtc-internals`
   - Edge: `edge://webrtc-internals`
4. Direct P2P candidates show as `host`, `srflx`, or `prflx`.
5. TURN fallback candidates show as `relay`.
6. If relay is used, `docker logs townsquare-coturn` should show allocations.

## Notes

- TURN credentials are visible in the frontend bundle with this static setup.
  That is acceptable for a first low-cost deployment, but rotate the password
  if it leaks or abuse appears.
- For stronger protection later, add a backend endpoint that returns temporary
  TURN credentials.
