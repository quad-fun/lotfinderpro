#!/usr/bin/env python3
"""
NYC PLUTO Data Loader for LotFinder Pro

This script downloads, processes, and imports NYC PLUTO data into a Supabase database.
It handles the ETL (Extract, Transform, Load) process for property data needed by the 
LotFinder Pro application.

Requirements:
- Python 3.7+
- Libraries: requests, psycopg2, pandas, tqdm
- Supabase database credentials

Usage:
- Set environment variables for Supabase connection
- Run script: python pluto_loader.py [--incremental] [--borough BOROUGH]
"""

import os
import sys
import time
import json
import argparse
import traceback
from datetime import datetime
from urllib.parse import quote

import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm

# Configuration
PLUTO_API_BASE_URL = "https://data.cityofnewyork.us/resource/64uk-42ks.json"
BATCH_SIZE = 500  # Number of records to process at once
REQUEST_DELAY = 1  # Seconds between API requests to avoid rate limiting
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

def get_last_update_date(conn):
    """Get the last update date from the database."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_settings WHERE key = 'last_pluto_update'")
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return datetime.fromisoformat(result[0].replace('Z', '+00:00'))
        return datetime.fromtimestamp(0)  # Default to epoch if no date found
    except Exception as e:
        print(f"Error getting last update date: {e}")
        return datetime.fromtimestamp(0)

def update_last_update_date(conn):
    """Update the last update timestamp in the database."""
    try:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES ('last_pluto_update', %s)
            ON CONFLICT (key) DO UPDATE SET value = %s
        """, (now, now))
        
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"Error updating last update date: {e}")
        conn.rollback()

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

def fetch_pluto_data(offset=0, limit=BATCH_SIZE, where_clause=None):
    """Fetch a batch of data from the NYC PLUTO API."""
    url = f"{PLUTO_API_BASE_URL}?$limit={limit}&$offset={offset}"
    
    if where_clause:
        url += f"&$where={quote(where_clause)}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from PLUTO API: {e}")
        return []

def get_built_status(record):
    """Determine the built status of a property."""
    if record.get('bldgclass', '').startswith('V'):
        return 'vacant'
    elif int(record.get('yearbuilt', '0') or '0') == 0:
        return 'vacant'
    elif int(record.get('bldgarea', '0') or '0') == 0:
        return 'vacant'
    return 'built'

def transform_record(record):
    """Transform a PLUTO record to match our database schema."""
    try:
        # Handle required fields with appropriate type conversions
        bbl = int(record.get('bbl', '0') or '0')
        borough = BOROUGH_CODES.get(record.get('borough', ''), record.get('borough', ''))
        block = int(record.get('block', '0') or '0')
        lot = int(record.get('lot', '0') or '0')
        
        # Handle optional fields
        address = record.get('address', '')
        zipcode = record.get('zipcode', '')
        zonedist1 = record.get('zonedist1', '')
        bldgclass = record.get('bldgclass', '')
        landuse = record.get('landuse', '')
        ownertype = record.get('ownertype', '')
        
        # Convert numeric fields with error handling
        def safe_float(value, default=0.0):
            try:
                return float(value) if value else default
            except (ValueError, TypeError):
                return default
                
        def safe_int(value, default=0):
            try:
                return int(value) if value else default
            except (ValueError, TypeError):
                return default
        
        lotarea = safe_float(record.get('lotarea'))
        bldgarea = safe_float(record.get('bldgarea'))
        comarea = safe_float(record.get('comarea'))
        resarea = safe_float(record.get('resarea'))
        officearea = safe_float(record.get('officearea'))
        retailarea = safe_float(record.get('retailarea'))
        garagearea = safe_float(record.get('garagearea'))
        strgearea = safe_float(record.get('strgearea'))
        factryarea = safe_float(record.get('factryarea'))
        numfloors = safe_float(record.get('numfloors'))
        unitstotal = safe_int(record.get('unitstotal'))
        unitsres = safe_int(record.get('unitsres'))
        yearbuilt = safe_int(record.get('yearbuilt'))
        yearalter1 = safe_int(record.get('yearalter1'))
        yearalter2 = safe_int(record.get('yearalter2'))
        builtfar = safe_float(record.get('builtfar'))
        residfar = safe_float(record.get('residfar'))
        commfar = safe_float(record.get('commfar'))
        facilfar = safe_float(record.get('facilfar'))
        assessland = safe_float(record.get('assessland'))
        assesstot = safe_float(record.get('assesstot'))
        exemptland = safe_float(record.get('exemptland'))
        exempttot = safe_float(record.get('exempttot'))
        
        # Other fields
        landmark = record.get('landmark', '')
        built_status = get_built_status(record)
        
        # Spatial data
        geom = None
        centroid = None
        
        if record.get('the_geom'):
            geom = f"SRID=4326;{record['the_geom'].replace('MULTIPOLYGON', 'POLYGON')}"
        
        if record.get('the_geom_centroid'):
            centroid = f"SRID=4326;{record['the_geom_centroid']}"
        
        # Generate a transformed record
        return {
            'bbl': bbl,
            'borough': borough,
            'block': block,
            'lot': lot,
            'address': address,
            'zipcode': zipcode,
            'zonedist1': zonedist1,
            'bldgclass': bldgclass,
            'landuse': landuse,
            'ownertype': ownertype,
            'lotarea': lotarea,
            'bldgarea': bldgarea,
            'comarea': comarea,
            'resarea': resarea,
            'officearea': officearea,
            'retailarea': retailarea,
            'garagearea': garagearea,
            'strgearea': strgearea,
            'factryarea': factryarea,
            'numfloors': numfloors,
            'unitstotal': unitstotal,
            'unitsres': unitsres,
            'yearbuilt': yearbuilt,
            'yearalter1': yearalter1,
            'yearalter2': yearalter2,
            'builtfar': builtfar,
            'residfar': residfar,
            'commfar': commfar,
            'facilfar': facilfar,
            'assessland': assessland,
            'assesstot': assesstot,
            'exemptland': exemptland,
            'exempttot': exempttot,
            'landmark': landmark,
            'built_status': built_status,
            'geom': geom,
            'centroid': centroid
        }
    except Exception as e:
        print(f"Error transforming record: {e}")
        return None

def insert_properties(conn, properties):
    """Insert a batch of properties into the database."""
    if not properties:
        return 0
    
    # Define the columns to insert
    columns = [
        'bbl', 'borough', 'block', 'lot', 'address', 'zipcode', 'zonedist1', 
        'bldgclass', 'landuse', 'ownertype', 'lotarea', 'bldgarea', 'comarea',
        'resarea', 'officearea', 'retailarea', 'garagearea', 'strgearea', 
        'factryarea', 'numfloors', 'unitstotal', 'unitsres', 'yearbuilt',
        'yearalter1', 'yearalter2', 'builtfar', 'residfar', 'commfar', 
        'facilfar', 'assessland', 'assesstot', 'exemptland', 'exempttot',
        'landmark', 'built_status', 'geom', 'centroid'
    ]
    
    # Convert properties to a list of tuples for batch insert
    values = []
    for prop in properties:
        value = tuple(prop.get(column, None) for column in columns)
        values.append(value)
    
    try:
        cursor = conn.cursor()
        
        # Prepare the query for batch insert
        insert_query = f"""
            INSERT INTO properties ({', '.join(columns)})
            VALUES %s
            ON CONFLICT (bbl) DO UPDATE SET
                {', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'bbl'])}
        """
        
        # Execute batch insert
        execute_values(cursor, insert_query, values)
        conn.commit()
        inserted = len(values)
        cursor.close()
        return inserted
    except Exception as e:
        conn.rollback()
        print(f"Error inserting properties: {e}")
        print(traceback.format_exc())
        return 0

def process_borough(conn, borough_code, incremental=False):
    """Process all properties for a specific borough."""
    borough_name = BOROUGH_CODES.get(borough_code, f"Borough {borough_code}")
    print(f"Processing {borough_name}...")
    
    offset = 0
    total_processed = 0
    batch_count = 0
    
    # Build the where clause for API filtering
    where_clause = f"borough='{borough_code}'"
    
    if incremental:
        last_update = get_last_update_date(conn)
        where_clause += f" AND last_status_date>'{last_update.isoformat()}'"
    
    # Initialize progress bar placeholder
    progress = tqdm(desc=f"Loading {borough_name}", unit="records")
    
    while True:
        # Fetch a batch of data
        data = fetch_pluto_data(offset, BATCH_SIZE, where_clause)
        
        if not data:
            break
        
        # Transform records
        transformed_records = []
        for record in data:
            transformed = transform_record(record)
            if transformed:
                transformed_records.append(transformed)
        
        # Insert records into database
        inserted = insert_properties(conn, transformed_records)
        total_processed += inserted
        batch_count += 1
        
        # Update progress
        progress.update(len(data))
        
        # Break if we've reached the end
        if len(data) < BATCH_SIZE:
            break
        
        # Move to next batch
        offset += BATCH_SIZE
        
        # Add delay to avoid rate limiting
        time.sleep(REQUEST_DELAY)
    
    progress.close()
    print(f"Completed {borough_name}: {total_processed} properties processed in {batch_count} batches")
    return total_processed

def full_load(conn, specific_borough=None):
    """Perform a full load of PLUTO data."""
    print("Starting full load of PLUTO data...")
    
    # Truncate the properties table
    truncate_properties_table(conn)
    
    total_properties = 0
    
    if specific_borough:
        # Process only the specified borough
        borough_code = specific_borough
        total_properties += process_borough(conn, borough_code)
    else:
        # Process all boroughs
        for borough_code in BOROUGH_CODES:
            total_properties += process_borough(conn, borough_code)
    
    # Update the last update timestamp
    update_last_update_date(conn)
    
    print(f"Full load completed. Total properties processed: {total_properties}")
    return total_properties

def incremental_load(conn, specific_borough=None):
    """Perform an incremental load of PLUTO data updated since last load."""
    print("Starting incremental load of PLUTO data...")
    
    last_update = get_last_update_date(conn)
    print(f"Loading updates since: {last_update.isoformat()}")
    
    total_properties = 0
    
    if specific_borough:
        # Process only the specified borough
        borough_code = specific_borough
        total_properties += process_borough(conn, borough_code, incremental=True)
    else:
        # Process all boroughs
        for borough_code in BOROUGH_CODES:
            total_properties += process_borough(conn, borough_code, incremental=True)
    
    # Update the last update timestamp
    update_last_update_date(conn)
    
    print(f"Incremental load completed. Total properties processed: {total_properties}")
    return total_properties

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
        
        cursor.close()
        return True
    except Exception as e:
        print(f"Error checking database setup: {e}")
        return False

def main():
    """Main function to handle command-line arguments and run the loader."""
    parser = argparse.ArgumentParser(description='NYC PLUTO Data Loader for LotFinder Pro')
    parser.add_argument('--incremental', action='store_true', help='Perform incremental load instead of full load')
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
        
        if args.incremental:
            total_properties = incremental_load(conn, args.borough)
        else:
            total_properties = full_load(conn, args.borough)
        
        elapsed_time = time.time() - start_time
        print(f"Import completed in {elapsed_time:.2f} seconds")
        print(f"Imported {total_properties} properties")
        
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Partial data may have been loaded.")
    except Exception as e:
        print(f"Error during import: {e}")
        print(traceback.format_exc())
    finally:
        conn.close()

if __name__ == "__main__":
    main()