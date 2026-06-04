# Docker Deployment

This project is developed locally without Docker and deployed on Linux with Docker.

## Local development

```bash
npm install
npm run serve
```

Before pushing production changes, it is recommended to run:

```bash
npm run build
```

## First deployment on Linux

Install Docker and Git first:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

Clone the repository to the default deployment path:

```bash
sudo mkdir -p /opt/townsquare
sudo chown -R $USER:$USER /opt/townsquare
cd /opt/townsquare
git clone <your-github-repo-url> townsquare-develop
cd townsquare-develop
```

Start the site:

```bash
docker compose up -d --build
```

Create the build environment file before running `scripts/update.sh` or building
on the server. The default path is `/opt/townsquare/config/townsquare.env`.
These values must point to the shared uniCloud space used by `xueran` and
`xueran-admin`.

```bash
sudo mkdir -p /opt/townsquare/config
sudo tee /opt/townsquare/config/townsquare.env >/dev/null <<'EOF'
VUE_APP_UNICLOUD_PROVIDER=aliyun
VUE_APP_UNICLOUD_SPACE_ID=your-space-id
VUE_APP_UNICLOUD_CLIENT_SECRET=your-client-secret
VUE_APP_UNICLOUD_ENDPOINT=https://api.next.bspapp.com
VUE_APP_TOWNSQUARE_WS_URL=wss://www.xuerantools.org/ws/
TOWNSQUARE_ALLOWED_ORIGINS=https://www.xuerantools.org,https://xuerantools.org,http://localhost:8080,http://localhost:8081
EOF
```

The default service port is:

```text
http://server-ip:8080
```

## One-command update

After pushing local changes to GitHub, update the Linux server with:

```bash
cd /opt/townsquare/townsquare-develop
bash scripts/update.sh
```

The update script uses these defaults:

```text
APP_DIR=/opt/townsquare/townsquare-develop
BRANCH=main
```

Override them when needed:

```bash
APP_DIR=/your/project/path BRANCH=master bash scripts/update.sh
```

## Useful commands

```bash
docker compose ps
docker logs townsquare-web
docker logs townsquare-live
docker compose down
docker compose up -d --build
```

## Notes

- Local development does not require Docker.
- The server does not need a manual `npm install`; Docker builds the frontend inside the image.
- Do not edit server code directly. `scripts/update.sh` resets the server copy to `origin/$BRANCH`.
- If your production branch is not `main`, set `BRANCH` when running the update script or edit it in `scripts/update.sh`.
