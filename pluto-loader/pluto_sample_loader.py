# pluto-loader/pluto_sample_loader.py
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
            if math.isnan(value) or math.isinf(value):
                record[key] = None
        elif isinstance(value, dict):
            record[key] = sanitize_record(value)
        elif isinstance(value, list):
            record[key] = [sanitize_record(item) if isinstance(item, dict) else item for item in value]
    return record

def create_strategic_sample(df: pd.DataFrame, target_size: int = 50000) -> pd.DataFrame:
    """
    Create a strategic sample that includes diverse property types for testing
    """
    print(f"Creating strategic sample of ~{target_size:,} properties...")
    
    samples = []
    remaining_target = target_size
    
    # 1. ALL Manhattan properties (smaller borough, high value for testing)
    manhattan = df[df['borough'] == 'MN'].copy()
    if len(manhattan) > 0:
        sample_size = min(len(manhattan), int(target_size * 0.3))  # 30% allocation
        samples.append(manhattan.sample(n=sample_size, random_state=42))
        remaining_target -= sample_size
        print(f"  - Manhattan sample: {sample_size:,} properties")
    
    # 2. Vacant lots from all boroughs (important for opportunity zones)
    vacant_lots = df[df['bldgclass'].str.startswith('V', na=False)].copy()
    if len(vacant_lots) > 0 and remaining_target > 0:
        sample_size = min(len(vacant_lots), int(target_size * 0.15))  # 15% allocation
        # Remove any Manhattan properties already sampled
        vacant_lots = vacant_lots[vacant_lots['borough'] != 'MN']
        if len(vacant_lots) > 0:
            samples.append(vacant_lots.sample(n=min(sample_size, len(vacant_lots)), random_state=42))
            remaining_target -= min(sample_size, len(vacant_lots))
            print(f"  - Vacant lots sample: {min(sample_size, len(vacant_lots)):,} properties")
    
    # 3. High-value properties (good for testing development potential)
    high_value = df[df['assesstot'] > df['assesstot'].quantile(0.9)].copy()
    if len(high_value) > 0 and remaining_target > 0:
        sample_size = min(len(high_value), int(target_size * 0.1))  # 10% allocation
        # Remove any already sampled
        high_value = high_value[~high_value['bbl'].isin(pd.concat(samples)['bbl'] if samples else [])]
        if len(high_value) > 0:
            samples.append(high_value.sample(n=min(sample_size, len(high_value)), random_state=42))
            remaining_target -= min(sample_size, len(high_value))
            print(f"  - High-value properties: {min(sample_size, len(high_value)):,} properties")
    
    # 4. Properties with high development potential
    dev_potential = df[(df['residfar'] > 0) & (df['builtfar'] < df['residfar'])].copy()
    if len(dev_potential) > 0 and remaining_target > 0:
        sample_size = min(len(dev_potential), int(target_size * 0.1))  # 10% allocation
        # Remove any already sampled
        existing_bbls = pd.concat(samples)['bbl'].tolist() if samples else []
        dev_potential = dev_potential[~dev_potential['bbl'].isin(existing_bbls)]
        if len(dev_potential) > 0:
            samples.append(dev_potential.sample(n=min(sample_size, len(dev_potential)), random_state=42))
            remaining_target -= min(sample_size, len(dev_potential))
            print(f"  - Development potential: {min(sample_size, len(dev_potential)):,} properties")
    
    # 5. Random sample from remaining boroughs to fill quota
    if remaining_target > 0:
        existing_bbls = pd.concat(samples)['bbl'].tolist() if samples else []
        remaining_df = df[~df['bbl'].isin(existing_bbls)].copy()
        
        if len(remaining_df) > 0:
            # Stratified sample by borough for remaining quota
            borough_samples = []
            for borough in ['BK', 'QN', 'BX', 'SI']:
                borough_df = remaining_df[remaining_df['borough'] == borough]
                if len(borough_df) > 0:
                    sample_size = min(len(borough_df), remaining_target // 4)
                    if sample_size > 0:
                        borough_samples.append(borough_df.sample(n=sample_size, random_state=42))
                        print(f"  - {borough} random sample: {sample_size:,} properties")
            
            if borough_samples:
                samples.extend(borough_samples)
    
    # Combine all samples
    if samples:
        final_sample = pd.concat(samples, ignore_index=True)
        final_sample = final_sample.drop_duplicates(subset=['bbl'])  # Remove any duplicates
        print(f"\nFinal sample size: {len(final_sample):,} properties")
        
        # Print borough breakdown
        print("\nBorough distribution in sample:")
        borough_counts = final_sample['borough'].value_counts()
        for borough, count in borough_counts.items():
            print(f"  {borough}: {count:,} properties ({count/len(final_sample)*100:.1f}%)")
        
        return final_sample
    else:
        print("Warning: No samples created, returning random sample")
        return df.sample(n=min(target_size, len(df)), random_state=42)

def prepare_dataframe(file_path: str, sample_size: int = 50000) -> pd.DataFrame:
    print("Starting to read CSV...")
    
    # For very large files, read in chunks to get a sample faster
    chunk_size = 100000
    chunks = []
    rows_read = 0
    target_rows = sample_size * 3  # Read 3x target to ensure good sampling
    
    print(f"Reading first {target_rows:,} rows for sampling...")
    
    for chunk in pd.read_csv(file_path, low_memory=False, chunksize=chunk_size):
        chunks.append(chunk)
        rows_read += len(chunk)
        print(f"  Read {rows_read:,} rows...")
        
        if rows_read >= target_rows:
            break
    
    # Combine chunks
    df = pd.concat(chunks, ignore_index=True)
    print(f"Total rows loaded for sampling: {len(df):,}")
    
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

    # Create strategic sample BEFORE heavy processing
    df = create_strategic_sample(df, sample_size)

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
    if 'bct2020' in df.columns:
        df['bct2020'] = df['bct2020'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    if 'bctcb2020' in df.columns:
        df['bctcb2020'] = df['bctcb2020'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    if 'ct2010' in df.columns:
        df['ct2010'] = df['ct2010'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)
    
    if 'cb2010' in df.columns:
        df['cb2010'] = df['cb2010'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)

    # --- Add computed vacant lot indicator ---
    df['is_vacant'] = df['bldgclass'].apply(
        lambda x: True if pd.notnull(x) and str(x).upper().startswith('V') else False
    )
    
    if 'landuse' in df.columns:
        df['is_vacant'] = df['is_vacant'] | (df['landuse'] == '11')

    # --- Define allowed columns ---
    allowed_columns = {
        "bbl", "borough", "block", "lot", "address", "zipcode",
        "zonedist1", "zonedist2", "zonedist3", "zonedist4",
        "overlay1", "overlay2", "special_district1", "special_district2", "special_district3",
        "limited_height_district", "bldgclass", "landuse", "ownertype", "ownernames",
        "lotarea", "bldgarea", "lotfront", "lotdepth", "bldgfront", "bldgdepth",
        "comarea", "resarea", "officearea", "retailarea", "garagearea", "strgearea", 
        "factryarea", "otherarea", "numfloors", "numbldgs", "unitstotal", "unitsres",
        "yearbuilt", "yearalter1", "yearalter2", "builtfar", "residfar", "commfar", "facilfar",
        "assessland", "assesstot", "exemptland", "exempttot", "landmark", "historic_district",
        "built_status", "latitude", "longitude", "is_vacant",
        "bct2020", "bctcb2020", "ct2010", "cb2010"
    }
    
    current_columns = set(df.columns)
    columns_to_drop = current_columns - allowed_columns
    if columns_to_drop:
        print("Dropping columns not in target schema:", list(columns_to_drop)[:10], "..." if len(columns_to_drop) > 10 else "")
        df = df.drop(columns=list(columns_to_drop))
    
    print("Data cleaning complete.")
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
        
        # Remove generated columns that can't be inserted
        generated_columns = ['is_vacant', 'development_potential', 'value_ratio', 'zoning_efficiency']
        for record in data:
            for col in generated_columns:
                if col in record:
                    del record[col]
        
        print(f"Upserting chunk {i+1}/{num_chunks} with {len(data)} records...")
        response = supabase.table(table_name).upsert(data, on_conflict="bbl").execute()
        print(f"Chunk {i+1} upsert response: {len(response.data) if response.data else 0} records processed")

def main():
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Load a strategic sample of PLUTO data for development/testing"
    )
    parser.add_argument("file_path", help="Path to the original PLUTO CSV file")
    parser.add_argument("--sample_size", type=int, default=50000, 
                       help="Target sample size (default: 50000 for ~400MB)")
    parser.add_argument("--table", default="properties", help="Supabase table name (default: properties)")
    parser.add_argument("--chunk_size", type=int, default=2000, help="Number of rows per upsert chunk (default: 2000)")
    
    args = parser.parse_args()

    # Estimate database size
    estimated_size_mb = (args.sample_size * 8) / 1000  # Rough estimate: 8KB per property
    print(f"\n{'='*60}")
    print("PLUTO SAMPLE LOADER")
    print(f"{'='*60}")
    print(f"Target sample size: {args.sample_size:,} properties")
    print(f"Estimated database size: ~{estimated_size_mb:.0f}MB")
    print(f"Supabase free tier limit: 500MB")
    print(f"{'='*60}\n")

    if estimated_size_mb > 450:
        print("⚠️  Warning: Estimated size may exceed free tier limit")
        confirm = input("Continue? (y/n): ")
        if confirm.lower() != 'y':
            print("Aborted.")
            return

    df = prepare_dataframe(args.file_path, args.sample_size)

    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Please set the SUPABASE_URL and SUPABASE_KEY environment variables")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Print final summary
    print(f"\n{'='*60}")
    print("SAMPLE SUMMARY")
    print(f"{'='*60}")
    print(f"Properties to load: {len(df):,}")
    print(f"Census tract data available: {df['bct2020'].notna().sum():,} properties")
    print(f"Vacant lots: {df['is_vacant'].sum():,} properties")
    print(f"Properties with development potential: {((df['residfar'] > 0) & (df['builtfar'] < df['residfar'])).sum():,}")
    
    # Zoning distribution
    print(f"\nTop zoning districts in sample:")
    zoning_counts = df['zonedist1'].value_counts().head(10)
    for zone, count in zoning_counts.items():
        if pd.notna(zone):
            print(f"  {zone}: {count:,} properties")
    
    print(f"\n{'='*60}")
    
    upsert_chunks(df, args.table, args.chunk_size, supabase)
    
    print(f"\n{'='*60}")
    print("SAMPLE LOADING COMPLETE!")
    print(f"{'='*60}")
    print("Your database now contains a representative sample perfect for development!")
    print("\nNext steps:")
    print("1. Apply opportunity zone migration: supabase db push")
    print("2. Test your application features")
    print("3. When ready for production, use the full loader")

if __name__ == "__main__":
    main()