# Database Backup & Recovery

## Automated Backups (Render PostgreSQL)

Render's free-tier PostgreSQL includes automatic daily backups with 7-day retention. No manual setup required.

## Manual Backup via pg_dump

```bash
# Backup to file
pg_dump "$DATABASE_URL" > billing_backup_$(date +%Y%m%d).sql

# Restore from file
psql "$DATABASE_URL" < billing_backup_20260101.sql
```

On Render, you can download a backup from the Dashboard:
1. Go to Dashboard → **free-db** → **Backups**
2. Click **Download** on any backup
3. For on-demand backup, click **Create Backup**

## Scheduled Backup (Optional)

Add a cron job (or Render Cron Job) to run daily:

```bash
# ~/backup.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" > /backups/billing_$TIMESTAMP.sql
find /backups -name "billing_*.sql" -mtime +30 -delete
```

## Export via Vite Frontend

The Reports section allows exporting sales/stock/products to Excel format.

## Important

- Backups contain ALL data including user credentials (password hashes)
- Store backup files in a secure, encrypted location
- Test restore periodically to verify backup integrity
