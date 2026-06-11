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
