# pluto-loader/pluto_supabase_loader.py
import os
import argparse
import pandas as pd
import numpy as np
import math
from supabase import create_client, Client
from dotenv import load_dotenv

def convert_float_to_int_if_possible(x):
    """
    If x is a float that is mathematically an integer, return it as an int.
    Otherwise, return x unchanged.
    """
    try:
        if pd.notnull(x) and float(x).is_integer():
            return int(x)
    except Exception:
        return x
    return x

def sanitize_record(record: dict) -> dict:
    """
    Recursively sanitize a record (dictionary) by replacing any non-finite float 
    (NaN, inf, -inf) with None.
    """
    for key, value in record.items():
        if isinstance(value, float):
            # Check for NaN or infinite values
            if math.isnan(value) or math.isinf(value):
                record[key] = None
        elif isinstance(value, dict):
            record[key] = sanitize_record(value)
        elif isinstance(value, list):
            record[key] = [sanitize_record(item) if isinstance(item, dict) else item for item in value]
    return record

def prepare_dataframe(file_path: str) -> pd.DataFrame:
    print("Starting to read CSV...")
    # Read CSV with low_memory disabled
    df = pd.read_csv(file_path, low_memory=False)
    print(f"CSV read complete. Number of rows: {len(df)}")
    
    # Standardize column names: strip, lowercase, replace spaces with underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    df = df.drop_duplicates()

    # --- Rename columns to match your properties table schema ---
    rename_dict = {
        "tax_block": "block",
        "tax_lot": "lot",
        "postcode": "zipcode",
        "spdist1": "special_district1",
        "spdist2": "special_district2",
        "spdist3": "special_district3",
        "ltdheight": "limited_height_district",
        "ownername": "ownernames",
        "histdist": "historic_district"
    }
    df.rename(columns=rename_dict, inplace=True)

    # --- Convert columns that should be integers ---
    int_columns = ['block', 'lot', 'numbldgs', 'unitstotal', 'unitsres', 'yearbuilt', 'yearalter1', 'yearalter2']
    for col in int_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')

    # --- Convert zipcode to string (remove trailing decimal) ---
    if 'zipcode' in df.columns:
        df['zipcode'] = df['zipcode'].apply(lambda x: str(int(x)) if pd.notnull(x) else None)

    # --- Convert other numeric fields to remove trailing decimals when possible ---
    float_cols = [
        'lotarea', 'bldgarea', 'comarea', 'resarea', 'officearea', 'retailarea', 
        'garagearea', 'strgearea', 'factryarea', 'otherarea', 'lotfront', 'lotdepth', 
        'bldgfront', 'bldgdepth', 'assessland', 'assesstot', 'exempttot'
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = df[col].apply(convert_float_to_int_if_possible)

    # --- Ensure landuse is treated as string ---
    if 'landuse' in df.columns:
        df['landuse'] = df['landuse'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)

    # --- Convert ownernames to an array (list) if not null ---
    if 'ownernames' in df.columns:
        df['ownernames'] = df['ownernames'].apply(lambda x: [x] if pd.notnull(x) else None)

    # --- Process census tract columns for opportunity zones ---
    # Handle BCT2020 (7-character format: borough + 6-digit tract)
    if 'bct2020' in df.columns:
        df['bct2020'] = df['bct2020'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    # Handle BCTCB2020 (11-character format: borough + 6-digit tract + 4-digit block)
    if 'bctcb2020' in df.columns:
        df['bctcb2020'] = df['bctcb2020'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    # Handle legacy 2010 census tract fields
    if 'ct2010' in df.columns:
        df['ct2010'] = df['ct2010'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    if 'cb2010' in df.columns:
        df['cb2010'] = df['cb2010'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)

    # --- Add computed vacant lot indicator ---
    # Primary method: building class starts with 'V'
    df['is_vacant'] = df['bldgclass'].apply(
        lambda x: True if pd.notnull(x) and str(x).upper().startswith('V') else False
    )
    
    # Secondary method: land use category 11 (vacant land)
    if 'landuse' in df.columns:
        df['is_vacant'] = df['is_vacant'] | (df['landuse'] == '11')

    # --- Define allowed columns (updated with census tract columns) ---
    allowed_columns = {
        "bbl",
        "borough",
        "block",
        "lot",
        "address",
        "zipcode",
        "zonedist1",
        "zonedist2",
        "zonedist3",
        "zonedist4",
        "overlay1",
        "overlay2",
        "special_district1",
        "special_district2",
        "special_district3",
        "limited_height_district",
        "bldgclass",
        "landuse",
        "ownertype",
        "ownernames",
        "lotarea",
        "bldgarea",
        "lotfront",
        "lotdepth",
        "bldgfront",
        "bldgdepth",
        "comarea",
        "resarea",
        "officearea",
        "retailarea",
        "garagearea",
        "strgearea",
        "factryarea",
        "otherarea",
        "numfloors",
        "numbldgs",
        "unitstotal",
        "unitsres",
        "yearbuilt",
        "yearalter1",
        "yearalter2",
        "builtfar",
        "residfar",
        "commfar",
        "facilfar",
        "assessland",
        "assesstot",
        "exemptland",
        "exempttot",
        "landmark",
        "historic_district",
        "built_status",
        "latitude",
        "longitude",
        "is_vacant",
        # Census tract columns for opportunity zones
        "bct2020",        # 2020 Census Tract (7 characters)
        "bctcb2020",      # 2020 Census Block (11 characters) 
        "ct2010",         # 2010 Census Tract
        "cb2010",         # 2010 Census Block
    }
    
    current_columns = set(df.columns)
    columns_to_drop = current_columns - allowed_columns
    if columns_to_drop:
        print("Dropping columns not in target schema:", columns_to_drop)
        df = df.drop(columns=list(columns_to_drop))
    
    print("Data cleaning complete.")
    print(f"Final columns: {list(df.columns)}")
    return df

def upsert_chunks(df: pd.DataFrame, table_name: str, chunk_size: int, supabase: Client):
    total_rows = len(df)
    num_chunks = (total_rows // chunk_size) + (1 if total_rows % chunk_size else 0)
    print(f"Uploading data in {num_chunks} chunks of up to {chunk_size} rows each.")

    for i in range(num_chunks):
        start = i * chunk_size
        end = start + chunk_size
        chunk = df.iloc[start:end]
        
        # Replace non-finite values with None
        chunk = chunk.replace([np.inf, -np.inf], None)
        chunk = chunk.where(pd.notnull(chunk), None)
        
        # Convert chunk to list of dictionaries and sanitize each record
        data = chunk.to_dict(orient="records")
        data = [sanitize_record(record) for record in data]
        
        print(f"Upserting chunk {i+1}/{num_chunks} with {len(data)} records...")
        # Upsert using on_conflict key "bbl"
        response = supabase.table(table_name).upsert(data, on_conflict="bbl").execute()
        print(f"Chunk {i+1} upsert response: {len(response.data) if response.data else 0} records processed")

def main():
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Clean, split, and upsert a large PLUTO CSV file into Supabase in chunks"
    )
    parser.add_argument("file_path", help="Path to the original PLUTO CSV file")
    parser.add_argument("--table", default="properties", help="Supabase table name (default: properties)")
    parser.add_argument("--chunk_size", type=int, default=5000, help="Number of rows per upsert chunk (default: 5000)")
    args = parser.parse_args()

    df = prepare_dataframe(args.file_path)

    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Please set the SUPABASE_URL and SUPABASE_KEY environment variables")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Print summary before uploading
    print(f"\n{'='*60}")
    print("PLUTO DATA LOADING SUMMARY")
    print(f"{'='*60}")
    print(f"Total properties to load: {len(df):,}")
    print(f"Columns included: {len(df.columns)}")
    print(f"Census tract data available: {df['bct2020'].notna().sum():,} properties")
    print(f"Vacant lots identified: {df['is_vacant'].sum():,} properties")
    
    # Borough breakdown
    print(f"\nBorough breakdown:")
    borough_counts = df['borough'].value_counts()
    for borough, count in borough_counts.items():
        print(f"  {borough}: {count:,} properties")
    
    print(f"\n{'='*60}")
    
    upsert_chunks(df, args.table, args.chunk_size, supabase)
    
    print(f"\n{'='*60}")
    print("LOADING COMPLETE!")
    print(f"{'='*60}")
    print("Next steps:")
    print("1. Run opportunity zone migration: supabase db push")
    print("2. Verify census tract data: SELECT COUNT(*) FROM properties WHERE bct2020 IS NOT NULL;")
    print("3. Check vacant lot detection: SELECT COUNT(*) FROM properties WHERE is_vacant = true;")

if __name__ == "__main__":
    main()