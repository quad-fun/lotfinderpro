# pluto_loader_robust.py
import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def clean_and_transform_pluto_data(file_path):
    """
    Clean and transform PLUTO CSV to match the new database schema
    with robust parsing
    """
    print("Reading PLUTO CSV file...")
    
    # Enhanced CSV reading with robust parsing
    try:
        df = pd.read_csv(
            file_path, 
            low_memory=False,
            dtype=str,  # Read all columns as strings initially
            encoding='utf-8',  # Specify encoding
            on_bad_lines='warn',  # Report bad lines but continue
            engine='python',  # Use Python parsing engine for more flexibility
            quotechar='"',  # Specify quote character
            skipinitialspace=True  # Skip spaces after delimiter
        )
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        print("Attempting alternative parsing method...")
        
        # Alternative parsing method
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            # Read lines, replacing problematic characters
            lines = f.readlines()
            lines = [line.replace('\0', '').replace('\x00', '') for line in lines]
        
        # Write cleaned lines to a temporary file
        temp_file = file_path + '.cleaned'
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        # Try reading the cleaned file
        df = pd.read_csv(
            temp_file, 
            low_memory=False,
            dtype=str,
            on_bad_lines='warn',
            engine='python',
            quotechar='"',
            skipinitialspace=True
        )
        
        # Remove temporary file
        os.remove(temp_file)
    
    # Print initial diagnostics
    print(f"Total rows read: {len(df)}")
    print(f"Columns detected: {list(df.columns)}")
    
    # Standardize column names
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
    
    # Diagnostic: print first few column names to verify
    print("Standardized columns:", list(df.columns)[:10])
    
    # Create mapping dictionary to match our new schema
    column_mapping = {
        # Match your column names from the actual CSV
        # You may need to adjust these based on the exact column names in your file
        'bbl': 'bbl',
        'borough': 'borough',
        'block': 'block',
        'lot': 'lot',
        'address': 'address',
        'zipcode': 'zipcode',
        'zonedist1': 'zonedist1',
        # Add other mappings as needed
    }
    
    # Select and rename columns that exist
    existing_columns = [col for col in column_mapping.keys() if col in df.columns]
    df_transformed = df[existing_columns].rename(columns=column_mapping)
    
    print("Columns after transformation:", list(df_transformed.columns))
    
    # Data type conversions and cleaning
    numeric_columns = [
        'bbl', 'block', 'lot', 'lotarea', 'bldgarea', 'numfloors', 
        'numbldgs', 'unitstotal', 'unitsres', 'yearbuilt', 'yearalter1', 
        'yearalter2', 'builtfar', 'residfar', 'commfar', 'facilfar', 
        'assessland', 'assesstot', 'exemptland', 'exempttot',
        'latitude', 'longitude'
    ]
    
    # Convert to numeric, coercing errors to NaN
    for col in numeric_columns:
        if col in df_transformed.columns:
            df_transformed[col] = pd.to_numeric(df_transformed[col], errors='coerce')
    
    # Determine built status
    def get_built_status(row):
        bldgclass = row.get('bldgclass', '')
        yearbuilt = row.get('yearbuilt', 0)
        bldgarea = row.get('bldgarea', 0)
        
        if str(bldgclass).startswith('V'):
            return 'vacant'
        elif yearbuilt == 0:
            return 'vacant'
        elif bldgarea == 0:
            return 'vacant'
        return 'built'
    
    # Only add built_status if we have necessary columns
    if all(col in df_transformed.columns for col in ['bldgclass', 'yearbuilt', 'bldgarea']):
        df_transformed['built_status'] = df_transformed.apply(get_built_status, axis=1)
    
    return df_transformed

def upload_to_supabase(df, table_name='properties'):
    """
    Upload dataframe to Supabase with advanced error handling and batching
    """
    # Get Supabase credentials
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase URL or Key not found in environment")
    
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Batch size for uploads
    BATCH_SIZE = 250
    
    # Replace infinite/NaN values with None
    df = df.replace([np.inf, -np.inf], np.nan)
    
    # Remove rows with NaN in critical columns
    df = df.dropna(subset=['bbl'])
    
    # Convert to records for bulk upload
    records = df.to_dict('records')
    
    # Batch upload with detailed error tracking
    total_uploaded = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i+BATCH_SIZE]
        
        try:
            # Upsert based on BBL
            response = (supabase.table(table_name)
                .upsert(batch, on_conflict='bbl')
                .execute())
            
            # Check response for any errors
            if hasattr(response, 'data'):
                uploaded_count = len(batch)
                total_uploaded += uploaded_count
                print(f"Uploaded batch {i//BATCH_SIZE + 1}: {uploaded_count} records")
            else:
                print(f"Potential issue with batch {i//BATCH_SIZE + 1}")
                
        except Exception as e:
            print(f"Error uploading batch {i//BATCH_SIZE + 1}: {e}")
            # Optional: log problematic records
            for record in batch:
                print(f"Problematic record: {record.get('bbl', 'No BBL')}")
    
    print(f"Total records uploaded: {total_uploaded}")

def main():
    """
    Main function to process and upload PLUTO data
    """
    if len(sys.argv) < 2:
        print("Usage: python pluto_loader_robust.py <path_to_pluto_csv>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    try:
        # Clean and transform data
        df_transformed = clean_and_transform_pluto_data(csv_path)
        
        # Diagnostics before upload
        print("\nDataframe Diagnostics:")
        print(f"Total rows after transformation: {len(df_transformed)}")
        print("Columns in transformed dataframe:", list(df_transformed.columns))
        
        # Upload to Supabase
        upload_to_supabase(df_transformed)
    
    except Exception as e:
        print(f"Critical error processing PLUTO data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()