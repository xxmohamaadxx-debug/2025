Applying `APPLY_INVENTORY_FUEL_UPDATES.sql`

This short guide explains how to safely apply the consolidated migration `APPLY_INVENTORY_FUEL_UPDATES.sql` that was added to the project root.

Important safety notes:
- Run inside a maintenance window.
- Take a full database backup before running.
- The script may alter existing tables and add triggers/functions. Review the SQL before applying.

Files added:
- `APPLY_INVENTORY_FUEL_UPDATES.sql` (project root) — consolidated migration SQL.
- `scripts/apply_migrations.ps1` — PowerShell wrapper to run the SQL via `psql`.

Recommended usage (PowerShell):

1) Set a connection string in an environment variable (example, replace values):

```
$env:PG_CONN = 'postgresql://username:password@host:5432/dbname?sslmode=require'
```

2) From the repository root run (will prompt for confirmation):

```
cd C:\Users\SANAD\Desktop\6
.\scripts\apply_migrations.ps1
```

3) If you prefer to pass the connection string directly:

```
.\scripts\apply_migrations.ps1 -ConnectionString 'postgresql://user:pass@host:5432/dbname?sslmode=require'
```

4) To skip the single-transaction wrapper (not recommended):

```
.\scripts\apply_migrations.ps1 -NoTransaction
```

Alternative: using `psql` directly (example):

```
psql "postgresql://user:pass@host:5432/dbname?sslmode=require" --single-transaction -v ON_ERROR_STOP=1 -f "APPLY_INVENTORY_FUEL_UPDATES.sql"
```

Using Neon CLI: consult Neon docs; you can pipe the SQL into `psql` connected via Neon if you have project credentials.

Arabic summary (ملخص بالعربية):
- احتفظ بنسخة احتياطية من قاعدة البيانات قبل التشغيل.
- شغّل السكربت أثناء نافذة صيانة.
- استخدم `psql` أو السكربت `scripts/apply_migrations.ps1` المذكور، وأدخل `YES` عند طلب التأكيد.

If you want, I can also:
- Add a script variant that uses the Neon CLI explicitly.
- Produce a small rollback checklist (manual steps to revert changes).
