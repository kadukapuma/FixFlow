# Deploying FixFlow to a server

This covers taking the current setup (Laravel backend + Vite/React frontend,
multi-tenant with a database per company) from your dev machine to a real
server. Follow it top to bottom on a fresh box; skip to the relevant section
for routine updates.

## 1. What's actually being deployed

- **Backend** (`backend/`) — Laravel API. Needs PHP-FPM + MySQL.
- **Frontend** (`frontend/`) — a Vite/React SPA. In dev, Vite serves it and
  proxies `/api` to the backend. In production there's no Vite server —
  you build static files once (`npm run build`) and a web server serves
  them directly, proxying `/api` to PHP-FPM instead.
- **A queue worker** — since the async-approval change, tenant provisioning
  (`ProvisionTenantCompany`) runs on a queue, not inline. **If nothing is
  running `php artisan queue:work`, approvals will sit in "provisioning"
  forever.** This has to run permanently, managed by Supervisor or systemd.
- **MySQL** — one central database (companies, admin users) plus one
  database per approved tenant, created automatically at approval time.

## 2. Server prerequisites

- PHP 8.2+ with extensions: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`,
  `xml`, `ctype`, `json`, `bcmath`, `fileinfo`
- Composer
- MySQL 8+ (or MariaDB) — the same server needs enough headroom for one
  database per tenant; see the earlier scaling notes if you expect
  hundreds of tenants
- Node.js 18+ and npm (build-time only — not needed at runtime)
- nginx (or Apache) + PHP-FPM
- Supervisor (or systemd) — to keep the queue worker alive
- A registered domain with DNS access

## 3. DNS — wildcard, before anything else

Two records, both pointing at your server's IP:

| Type | Host | Value |
|---|---|---|
| A | `@` | server IP |
| A | `*` | server IP |

The wildcard (`*`) is what lets `acme.fixflow.com`, `bolt.fixflow.com`, and
every future tenant resolve automatically — you never touch DNS again after
this. `IdentifyCompany` middleware already reads the subdomain from the
`Host` header, so no per-tenant DNS entry is ever needed.

## 4. Get the code on the server

```bash
git clone <your-repo-url> fixflow
cd fixflow
```

## 5. Backend setup

```bash
cd backend
composer install --no-dev --optimize-autoloader

cp .env.example .env
php artisan key:generate
```

Edit `.env` for production:

```
APP_NAME=FixFlow
APP_ENV=production
APP_DEBUG=false
APP_URL=https://fixflow.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fixflow_central
DB_USERNAME=<a real user, not root>
DB_PASSWORD=<a real password>

QUEUE_CONNECTION=database
SESSION_DRIVER=database
```

**`APP_DEBUG=false` is not optional** — with it `true`, unhandled errors
dump stack traces (including `.env` values) straight into API responses.

Create the central database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE fixflow_central CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --force
```

Create your platform admin — **don't** run the full demo seeder in
production (`CompanySeeder` creates fake `company01`/`company02` tenants
with blank passwords). Just seed the admin, then log in and treat that as
a real account:

```bash
php artisan db:seed --class=AdminSeeder --force
```

That creates `admin@fixflow.test` / `password` — change the password
immediately (there's no "forgot password" flow yet, so do this via
`php artisan tinker`):

```bash
php artisan tinker
>>> $u = App\Models\User::where('email', 'admin@fixflow.test')->first();
>>> $u->update(['email' => 'you@yourcompany.com', 'password' => Hash::make('a-real-password')]);
```

File permissions (the web server user needs to write logs/cache):

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

Production performance caches (re-run these after every `.env` or config
change — they bake current values in, so a stale cache silently serves old
config):

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 6. Frontend build

```bash
cd frontend
npm ci
npm run build
```

This produces static files in `frontend/dist/`. There is no frontend
server process in production — nginx serves these files directly.

## 7. nginx — one server block handles every tenant

Because tenants are resolved from the `Host` header, one nginx block
(matching the root domain and the wildcard) serves everyone:

```nginx
server {
    listen 443 ssl http2;
    server_name fixflow.com *.fixflow.com;

    ssl_certificate     /etc/letsencrypt/live/fixflow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fixflow.com/privkey.pem;

    # Serve the built SPA for everything except /api
    root /var/www/fixflow/frontend/dist;
    index index.html;

    location /api {
        root /var/www/fixflow/backend/public;
        try_files $uri /index.php?$query_string;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_pass unix:/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        }
    }

    location / {
        try_files $uri /index.html;
    }
}

server {
    listen 80;
    server_name fixflow.com *.fixflow.com;
    return 301 https://$host$request_uri;
}
```

Adjust the `fastcgi_pass` socket path and PHP version to match your
install (`php -v`).

## 8. TLS — needs a wildcard certificate

A normal Let's Encrypt HTTP challenge can't issue for `*.fixflow.com` — it
needs a DNS challenge instead. Easiest paths:

- **Certbot with your DNS provider's plugin** (fully automated renewal):
  ```bash
  sudo certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d fixflow.com -d '*.fixflow.com'
  ```
  (swap `cloudflare` for your provider's certbot DNS plugin — Route53,
  DigitalOcean, etc. all have one)
- **Move DNS to Cloudflare** and turn on proxying — its free "Universal
  SSL" covers one level of wildcard automatically, no certbot needed.

## 9. Queue worker — must run permanently

Supervisor config (`/etc/supervisor/conf.d/fixflow-worker.conf`):

```ini
[program:fixflow-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/fixflow/backend/artisan queue:work --sleep=1 --tries=1 --max-time=3600
directory=/var/www/fixflow/backend
autostart=true
autorestart=true
numprocs=2
user=www-data
stdout_logfile=/var/www/fixflow/backend/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start fixflow-worker:*
```

`numprocs=2` gives you two workers processing provisioning jobs in
parallel — bump it if approvals start queueing up visibly.

## 10. Verify it's alive

```bash
curl -I https://fixflow.com/up
```

Then walk the real flow once by hand: register a company at
`https://fixflow.com`, approve it from `https://fixflow.com/admin`, confirm
it flips from "provisioning" to "approved" within a few seconds, and log in
at `https://<subdomain>.fixflow.com`.

## 11. Deploying updates (routine)

```bash
git pull
cd backend && composer install --no-dev --optimize-autoloader
php artisan migrate --force          # central schema changes
php artisan migrate:companies        # propagate schema changes to every tenant DB
php artisan config:cache
sudo supervisorctl restart fixflow-worker:*
sudo systemctl reload php8.2-fpm

cd ../frontend && npm ci && npm run build
```

## 12. Backups

Dumping 500+ individual tenant databases with `mysqldump` one at a time
gets slow and easy to forget. Prefer either:
- A scripted loop that dumps every database in parallel (a few at a time),
  or
- A filesystem/binary-level backup of the whole MySQL data directory
  (e.g. Percona XtraBackup), which backs up everything — central and every
  tenant — in one pass regardless of how many databases exist.

## 13. Security checklist before going live

- [ ] `APP_DEBUG=false`
- [ ] Real, non-blank MySQL password (not `root`/empty like local dev)
- [ ] `.env` is not committed and not web-accessible
- [ ] Changed the seeded admin password
- [ ] HTTPS enforced (the nginx config above redirects `:80` → `:443`)
- [ ] Consider rate-limiting `/api/register-company`, `/api/login-lookup`,
  `/api/admin/login`, and `/api/login` (Laravel's `throttle` middleware) —
  none of these are currently rate-limited
