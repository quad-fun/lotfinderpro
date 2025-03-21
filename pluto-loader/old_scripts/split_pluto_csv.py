import os
import argparse
import pandas as pd

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

def prepare_and_split_csv(file_path: str, output_dir: str, num_splits: int):
    print("Starting to read CSV...")
    # Read the CSV file with low_memory disabled
    df = pd.read_csv(file_path, low_memory=False)
    print(f"CSV read complete. Number of rows: {len(df)}")

    # Standardize column names: strip extra spaces, lowercase, replace spaces with underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    
    # Drop duplicate rows
    df = df.drop_duplicates()

    # --- Rename columns to match your properties table schema ---
    rename_dict = {
        "tax_block": "block",
        "tax_lot": "lot",
        # "borough" remains the same
        "postcode": "zipcode",
        "spdist1": "special_district1",
        "spdist2": "special_district2",
        "spdist3": "special_district3",
        "ltdheight": "limited_height_district",
        "ownername": "ownernames",
        "histdist": "historic_district"
        # Add additional mappings as needed.
    }
    df.rename(columns=rename_dict, inplace=True)

    # --- Convert columns that should be integers ---
    int_columns = ['block', 'lot', 'numbldgs', 'unitstotal', 'unitsres', 'yearbuilt', 'yearalter1', 'yearalter2']
    for col in int_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')

    # --- Convert zipcode (a text field) so it does not include a decimal ---
    if 'zipcode' in df.columns:
        df['zipcode'] = df['zipcode'].apply(lambda x: str(int(x)) if pd.notnull(x) else None)
    
    # --- For numeric fields that are meant to be whole numbers, remove trailing decimals ---
    float_cols = [
        'lotarea', 'bldgarea', 'comarea', 'resarea', 'officearea', 'retailarea', 
        'garagearea', 'strgearea', 'factryarea', 'otherarea', 'lotfront', 'lotdepth', 
        'bldgfront', 'bldgdepth', 'assessland', 'assesstot', 'exempttot'
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = df[col].apply(convert_float_to_int_if_possible)
    
    # For fields like "landuse" that are text, ensure they are strings.
    if 'landuse' in df.columns:
        df['landuse'] = df['landuse'].apply(lambda x: str(x).strip() if pd.notnull(x) else None)

    # --- Define allowed columns (those that exist in your migration) ---
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
        "longitude"
    }
    
    # Keep only the allowed columns (drop any others)
    current_columns = set(df.columns)
    columns_to_drop = current_columns - allowed_columns
    if columns_to_drop:
        print("Dropping columns not in target schema:", columns_to_drop)
        df = df.drop(columns=list(columns_to_drop))
    
    print("Data cleaning complete.")
    
    # Determine the approximate number of rows per split
    total_rows = len(df)
    split_size = total_rows // num_splits
    print(f"Splitting data into {num_splits} parts (~{split_size} rows each)")

    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Split the DataFrame and write to CSV files
    for i in range(num_splits):
        start = i * split_size
        # Last file gets any remaining rows
        if i == num_splits - 1:
            sub_df = df.iloc[start:]
        else:
            sub_df = df.iloc[start:start + split_size]
        output_file = os.path.join(output_dir, f"pluto_part_{i+1}.csv")
        sub_df.to_csv(output_file, index=False)
        print(f"Written {len(sub_df)} rows to {output_file}")

def main():
    parser = argparse.ArgumentParser(
        description="Clean and split a large PLUTO CSV file into smaller files for manual upload to Supabase"
    )
    parser.add_argument("file_path", help="Path to the original PLUTO CSV file")
    parser.add_argument("--output_dir", default="splits", help="Directory to save split CSV files")
    parser.add_argument("--splits", type=int, default=4, help="Number of files to split into (default: 4)")
    args = parser.parse_args()
    
    prepare_and_split_csv(args.file_path, args.output_dir, args.splits)

if __name__ == "__main__":
    main()