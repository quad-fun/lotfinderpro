#!/usr/bin/env python3
"""
NYC PLUTO Fast CSV Data Loader for LotFinder Pro

This script processes a local PLUTO CSV file and imports it into a Supabase database.
Optimized for speed using batch inserts while handling null constraints.

Requirements:
- Python 3.7+
- Libraries: pandas, psycopg2, tqdm
- Supabase database credentials
- Local PLUTO CSV file

Usage:
- Set environment variables for Supabase connection
- Run script: python pluto_fast_loader.py path/to/pluto.csv
"""

import os
import sys
import time
import argparse
import traceback
from datetime import datetime
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm

# Configuration
CHUNK_SIZE = 1000  # Smaller chunks for better handling
BOROUGH_CODES = {
    '1': 'Manhattan',
    '2': 'Bronx',
    '3': 'Brooklyn',
    '4': 'Queens',
    '5': 'Staten Island'
}

# Database connection parameters (from environment variables)
DB_HOST = os.environ.get('SUPABASE_DB_HOST')
DB_PORT = os.environ.get('SUPABASE_DB_PORT', '5432')
DB_NAME = os.environ.get('SUPABASE_DB_NAME')
DB_USER = os.environ.get('SUPABASE_DB_USER')
DB_PASSWORD = os.environ.get('SUPABASE_DB_PASSWORD')

def get_db_connection():
    """Create and return a connection to the Supabase PostgreSQL database."""
    try:
        print(f"Connecting to database: {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def truncate_properties_table(conn):
    """Truncate the properties table before a full load."""
    try:
        cursor = conn.cursor()
        print("Truncating properties table...")
        cursor.execute("TRUNCATE TABLE properties RESTART IDENTITY CASCADE")
        conn.commit()
        cursor.close()
        print("Properties table truncated successfully.")
    except Exception as e:
        print(f"Error truncating properties table: {e}")
        conn.rollback()
        sys.exit(1)

def get_built_status(row):
    """Determine the built status of a property based on certain fields."""
    bldgclass = str(row.get('bldgclass', ''))
    yearbuilt = float(row.get('yearbuilt', 0) or 0)
    bldgarea = float(row.get('bldgarea', 0) or 0)
    
    if isinstance(bldgclass, str) and bldgclass.startswith('V'):
        return 'vacant'
    elif yearbuilt == 0:
        return 'vacant'
    elif bldgarea == 0:
        return 'vacant'
    
    return 'built'

def transform_dataframe(df, chunk_index=0):
    """Transform a DataFrame of PLUTO records to match our database schema."""
    try:
        print(f"Transforming chunk {chunk_index}...")
        
        # Make a copy to avoid modifying the original
        df_transformed = df.copy()
        
        # Map borough codes to names
        df_transformed['borough'] = df_transformed['borough'].astype(str).map(BOROUGH_CODES).fillna(df_transformed['borough'])
        
        # Handle required fields that cannot be null
        # Block - critical field that's causing the errors
        if 'block' in df_transformed.columns:
            df_transformed['block'] = pd.to_numeric(df_transformed['block'], errors='coerce').fillna(0).astype('int64')
        else:
            df_transformed['block'] = 0
            
        # Lot - also required
        if 'lot' in df_transformed.columns:
            df_transformed['lot'] = pd.to_numeric(df_transformed['lot'], errors='coerce').fillna(0).astype('int64')
        else:
            df_transformed['lot'] = 0
            
        # BBL - required unique identifier
        if 'bbl' in df_transformed.columns:
            df_transformed['bbl'] = pd.to_numeric(df_transformed['bbl'], errors='coerce').fillna(0).astype('int64')
        else:
            # Generate a unique BBL if missing
            df_transformed['bbl'] = range(1, len(df_transformed) + 1)
        
        # Convert numeric fields
        numeric_columns = [
            'lotarea', 'bldgarea', 'comarea', 'resarea', 'officearea', 'retailarea',
            'garagearea', 'strgearea', 'factryarea', 'numfloors', 'unitstotal',
            'unitsres', 'yearbuilt', 'yearalter1', 'yearalter2', 'builtfar', 
            'residfar', 'commfar', 'facilfar', 'assessland', 'assesstot', 
            'exemptland', 'exempttot'
        ]
        
        for col in numeric_columns:
            if col in df_transformed.columns:
                df_transformed[col] = pd.to_numeric(df_transformed[col], errors='coerce').fillna(0)
        
        # Calculate built status based on criteria
        df_transformed['built_status'] = df_transformed.apply(get_built_status, axis=1)
        
        # Process spatial data if available
        if 'the_geom' in df_transformed.columns:
            df_transformed['geom'] = df_transformed['the_geom'].apply(
                lambda x: f"SRID=4326;{str(x).replace('MULTIPOLYGON', 'POLYGON')}" if pd.notna(x) and x else None
            )
        else:
            df_transformed['geom'] = None
            
        if 'the_geom_centroid' in df_transformed.columns:
            df_transformed['centroid'] = df_transformed['the_geom_centroid'].apply(
                lambda x: f"SRID=4326;{x}" if pd.notna(x) and x else None
            )
        else:
            df_transformed['centroid'] = None
            
        # Make sure all required columns exist
        required_columns = [
            'bbl', 'borough', 'block', 'lot', 'address', 'zipcode', 'zonedist1', 
            'bldgclass', 'landuse', 'ownertype', 'lotarea', 'bldgarea', 'comarea',
            'resarea', 'officearea', 'retailarea', 'garagearea', 'strgearea', 
            'factryarea', 'numfloors', 'unitstotal', 'unitsres', 'yearbuilt',
            'yearalter1', 'yearalter2', 'builtfar', 'residfar', 'commfar', 
            'facilfar', 'assessland', 'assesstot', 'exemptland', 'exempttot',
            'landmark', 'built_status', 'geom', 'centroid'
        ]
        
        for col in required_columns:
            if col not in df_transformed.columns:
                if col in ['bbl', 'block', 'lot']:
                    # Required integer fields
                    df_transformed[col] = 0
                elif col in ['borough']:
                    # Required string fields
                    df_transformed[col] = 'Unknown'
                else:
                    # Optional fields
                    df_transformed[col] = None
        
        return df_transformed
        
    except Exception as e:
        print(f"Error transforming data: {e}")
        print(traceback.format_exc())
        return None

def process_csv_direct(conn, csv_path, truncate=True, specific_borough=None):
    """Process a PLUTO CSV file with direct inserts to the properties table."""
    try:
        csv_path = Path(csv_path)
        if not csv_path.exists():
            print(f"Error: CSV file not found at {csv_path}")
            return 0
            
        print(f"Processing PLUTO CSV: {csv_path}")
        csv_size = csv_path.stat().st_size / (1024 * 1024)  # Size in MB
        print(f"File size: {csv_size:.2f} MB")
        
        # Truncate the properties table if requested
        if truncate:
            truncate_properties_table(conn)
        
        # Process CSV in chunks
        total_inserted = 0
        chunk_index = 0
        
        # Create progress bar for CSV reading
        with tqdm(desc="Processing CSV", unit="records") as progress:
            # Read CSV in chunks
            for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE, low_memory=False):
                # Filter by borough if specified
                if specific_borough:
                    chunk = chunk[chunk['borough'] == specific_borough]
                    
                    if chunk.empty:
                        chunk_index += 1
                        continue
                
                # Transform the data
                transformed_chunk = transform_dataframe(chunk, chunk_index)
                
                # Insert directly into properties table
                if transformed_chunk is not None:
                    inserted = direct_insert_to_properties(conn, transformed_chunk)
                    total_inserted += inserted
                    progress.update(len(chunk))
                    print(f"Inserted {inserted} records from chunk {chunk_index}")
                
                chunk_index += 1
        
        print(f"CSV processing completed.")
        print(f"Inserted {total_inserted} records to properties table")
        
        return total_inserted
        
    except Exception as e:
        print(f"Error processing CSV: {e}")
        print(traceback.format_exc())
        return 0

def direct_insert_to_properties(conn, df):
    """Insert a DataFrame directly to the properties table."""
    if df is None or df.empty:
        return 0
    
    # Get the column list from the properties table
    cursor = conn.cursor()
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'properties'
        AND column_name != 'id'  # Skip auto-incrementing ID
        ORDER BY ordinal_position
    """)
    
    columns = [col[0] for col in cursor.fetchall()]
    
    # Ensure all columns exist in the dataframe
    for col in columns:
        if col not in df.columns and col not in ['created_at', 'updated_at']:
            df[col] = None
    
    # Remove any extra columns not in the properties table
    df = df[[col for col in columns if col in df.columns]]
    
    # Convert DataFrame to list of tuples for batch insert
    values = [tuple(x) for x in df.to_numpy()]
    
    try:
        # Prepare the query for batch insert
        insert_query = f"""
            INSERT INTO properties ({', '.join(df.columns)})
            VALUES %s
            ON CONFLICT (bbl) DO UPDATE SET
            {', '.join([f"{col} = EXCLUDED.{col}" for col in df.columns if col != 'bbl'])}
        """
        
        # Execute batch insert
        execute_values(cursor, insert_query, values, page_size=100)
        conn.commit()
        inserted = len(values)
        cursor.close()
        return inserted
    except Exception as e:
        conn.rollback()
        print(f"Error inserting data to properties table: {e}")
        print(traceback.format_exc())
        return 0

def check_database_setup(conn):
    """Check if the database is properly set up for the import."""
    try:
        cursor = conn.cursor()
        
        # Check if properties table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'properties'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("ERROR: 'properties' table does not exist in the database.")
            print("Please run the database migrations first.")
            return False
        
        # Check if system_settings table exists and create if needed
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'system_settings'
            )
        """)
        
        settings_table_exists = cursor.fetchone()[0]
        
        if not settings_table_exists:
            print("Creating system_settings table...")
            cursor.execute("""
                CREATE TABLE system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            conn.commit()
        
        # Check required columns in properties table
        cursor.execute("""
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'properties'
        """)
        
        required_columns = []
        for col in cursor.fetchall():
            if col[1] == 'NO':  # Not nullable column
                required_columns.append(col[0])
        
        print(f"Required columns in properties table: {', '.join(required_columns)}")
        
        cursor.close()
        return True
    except Exception as e:
        print(f"Error checking database setup: {e}")
        return False

def main():
    """Main function to handle command-line arguments and run the loader."""
    parser = argparse.ArgumentParser(description='NYC PLUTO Fast CSV Data Loader')
    parser.add_argument('csv_file', help='Path to the PLUTO CSV file')
    parser.add_argument('--no-truncate', action='store_true', help='Do not truncate the properties table before loading')
    parser.add_argument('--borough', choices=['1', '2', '3', '4', '5'], help='Process only a specific borough (1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island)')
    
    args = parser.parse_args()
    
    # Check for required environment variables
    required_env_vars = ['SUPABASE_DB_HOST', 'SUPABASE_DB_NAME', 'SUPABASE_DB_USER', 'SUPABASE_DB_PASSWORD']
    missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set these variables before running the script.")
        sys.exit(1)
    
    # Connect to the database
    conn = get_db_connection()
    
    # Check database setup
    if not check_database_setup(conn):
        conn.close()
        sys.exit(1)
    
    try:
        start_time = time.time()
        
        # Use direct insert method instead of temp table
        total_properties = process_csv_direct(
            conn, 
            args.csv_file, 
            truncate=not args.no_truncate,
            specific_borough=args.borough
        )
        
        elapsed_time = time.time() - start_time
        print(f"Import completed in {elapsed_time:.2f} seconds")
        print(f"Imported {total_properties} properties")
        
        # Update last update timestamp
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES ('last_pluto_update', %s)
            ON CONFLICT (key) DO UPDATE SET value = %s
        """, (now, now))
        conn.commit()
        cursor.close()
        
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Partial data may have been loaded.")
    except Exception as e:
        print(f"Error during import: {e}")
        print(traceback.format_exc())
    finally:
        conn.close()

if __name__ == "__main__":
    main()