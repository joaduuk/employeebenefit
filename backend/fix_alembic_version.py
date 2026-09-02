from app.core.database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(
    text("UPDATE alembic_version SET version_num = 'ce7c5746998f' WHERE version_num = '349f09cc98b6'")
)
conn.commit()
conn.close()
print(f"Rows updated: {result.rowcount}")