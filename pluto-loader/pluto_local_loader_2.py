import os
import argparse
import pandas as pd
import numpy as np
import math
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def prepare_pluto_file(file_path: str) -> pd.DataFrame:
    """
    Reads and prepares the PLUTO CSV file.
    
    Cleaning steps include:
      - Standardizing column names (lowercase, no spaces)
      - Dropping duplicate rows
      - Converting specific fields to numeric types based on the PLUTO data dictionary
      - Using low_memory=False to avoid dtype warnings
    """
    print("Starting to read CSV...")
    # Read the CSV file with low_memory disabled
    df = pd.read_csv(file_path, low_memory=False)
    
    print("CSV read complete. Number of rows:", len(df))

    # Standardize column names: strip extra spaces, lowercase, replace spaces with underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    
    # Drop duplicate rows
    df = df.drop_duplicates()
    
    # Convert specific columns to numeric types (adjust list as needed)
    numeric_fields = [
        'block', 'lot', 'cd', 'lotarea', 'bldgarea', 'numbldgs', 'numfloors',
        'unitsres', 'unitstotal', 'lotfront', 'lotdepth', 'bldgfront', 'bldgdepth',
        'yearbuilt', 'yearalter1', 'yearalter2'
    ]
    for field in numeric_fields:
        if field in df.columns:
            df[field] = pd.to_numeric(df[field], errors='coerce')
    
    # Optional: Zero-pad the 'bbl' field to 10 digits if it exists.
    if 'bbl' in df.columns:
        df['bbl'] = df['bbl'].apply(lambda x: f"{int(x):010d}" if pd.notnull(x) else x)
    
    return df

def sanitize_record(record: dict) -> dict:
    """
    Recursively checks a dictionary (record) and replaces any float that is not finite
    (i.e. NaN, inf, -inf) with None.
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

print("Data cleaning complete.")

def import_to_supabase(df: pd.DataFrame, table_name: str) -> None:
    """
    Imports the cleaned DataFrame into a Supabase table.
    
    Before insertion, replaces non-finite values in the data with None so they are JSON compliant.
    """
    # Retrieve Supabase connection details from environment variables.
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Please set the SUPABASE_URL and SUPABASE_KEY environment variables")
    
    # Create a Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Replace infinite values with None and NaNs with None in the DataFrame
    df = df.replace([np.inf, -np.inf], None)
    df = df.where(pd.notnull(df), None)
    
    # Convert the DataFrame to a list of dictionaries
    data = df.to_dict(orient="records")
    
    # Sanitize each record by replacing non-finite float values with None
    data = [sanitize_record(record) for record in data]
    
    # Insert data into the specified Supabase table
    response = supabase.table(table_name).insert(data).execute()
    
    print("Insertion Response:", response)

def main():
    parser = argparse.ArgumentParser(
        description="Prepare PLUTO tax lot data and import it to a Supabase database"
    )
    parser.add_argument("file_path", help="Path to the PLUTO CSV file")
    parser.add_argument(
        "--table",
        default="pluto_data",
        help="Supabase table name where data will be inserted (default: 'pluto_data')"
    )
    args = parser.parse_args()
    
    # Prepare the PLUTO file using the cleaning function
    df = prepare_pluto_file(args.file_path)
    
    # Import the cleaned data into Supabase
    import_to_supabase(df, args.table)

if __name__ == "__main__":
    main()