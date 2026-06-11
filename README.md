# OneAria
Oracle FY27 SKO Hackathon

## Local app

Run a local static server from the repo root:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Production server

Run the bundled Node server:

```bash
npm start
```

The server reads `HOST` and `PORT` from the environment and exposes a health check at `/healthz`.

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

The `deploy/onearia.service` file is a systemd template for running the app from `/opt/onearia` as the `ubuntu` user.

The public HTTPS entry point is:

```text
https://129.159.121.17.sslip.io
```

The `deploy/Caddyfile` reverse proxies that hostname to the local Node service on `127.0.0.1:8080`. Ports `80` and `443` must be open in both the VM firewall and the OCI security list or network security group so Caddy can issue and renew the certificate.
