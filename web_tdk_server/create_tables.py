from database.connection import engine, Base
from models import user, school, announcement, document, grade, subject, schedule

from sqlalchemy import inspect, text
from sqlalchemy import types as sqltypes


def ensure_schema():
    # create any missing tables
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    def map_col_type(col):
        t = col.type
        # common type mapping for MySQL/MariaDB
        if isinstance(t, sqltypes.Integer):
            return 'INTEGER'
        if isinstance(t, sqltypes.String):
            # String may have length
            length = getattr(t, 'length', None)
            return f'VARCHAR({length})' if length else 'TEXT'
        if isinstance(t, sqltypes.DateTime):
            return 'DATETIME'
        if isinstance(t, sqltypes.Text):
            return 'TEXT'
        if isinstance(t, sqltypes.Boolean):
            return 'BOOLEAN'
        if isinstance(t, sqltypes.Float):
            return 'FLOAT'
        if isinstance(t, sqltypes.Numeric):
            prec = getattr(t, 'precision', None)
            scale = getattr(t, 'scale', None)
            if prec and scale:
                return f'DECIMAL({prec},{scale})'
            if prec:
                return f'DECIMAL({prec})'
            return 'DECIMAL'
        # fallback: NULLABLE TEXT
        return None

    # Iterate over metadata tables and add any missing columns
    for table_name, table_obj in Base.metadata.tables.items():
        if table_name not in existing_tables:
            print(f"Table '{table_name}' not found in DB; create_all should have created it.")
            continue
        existing_cols = [c['name'] for c in inspector.get_columns(table_name)]
        for col in table_obj.columns:
            if col.name in existing_cols:
                continue
            sql_type = map_col_type(col)
            if not sql_type:
                print(f"Skipping column '{col.name}' on '{table_name}': unsupported type {type(col.type)}")
                continue
            nullable = 'NULL' if col.nullable else 'NOT NULL'
            # Attempt to set a simple default if present
            default_clause = ''
            try:
                alter_sql = text(f'ALTER TABLE {table_name} ADD COLUMN {col.name} {sql_type} {nullable} {default_clause}')
                print(f"Adding column '{col.name}' to '{table_name}' as {sql_type} {nullable}...")
                with engine.connect() as conn:
                    conn.execute(alter_sql)
                    conn.commit()
                print(f"Added column '{col.name}' to '{table_name}'.")
            except Exception as e:
                print(f"Failed to add column '{col.name}' to '{table_name}': {e}")


if __name__ == "__main__":
    ensure_schema()
    print("Schema check complete.")
