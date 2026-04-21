from sqlalchemy import text
from database import engine

migrations = [
    """
    ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS session_id UUID 
    REFERENCES chat_sessions(id);
    """,
    """
    ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS diagrams_json JSONB;
    """,
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"Ran: {sql.strip()[:60]}...")
    conn.commit()
    print("Migration complete.")
