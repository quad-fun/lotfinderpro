import os
import argparse
import pandas as pd

def prepare_and_split_csv(file_path: str, output_dir: str, num_splits: int):
    # Read the CSV file (set low_memory=False to suppress dtype warnings)
    print("Starting to read CSV...")
    df = pd.read_csv(file_path, low_memory=False)
    print(f"CSV read complete. Number of rows: {len(df)}")

    # Clean the data:
    # Standardize column names: remove extra spaces, convert to lowercase, replace spaces with underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    
    # Drop duplicate rows if any
    df = df.drop_duplicates()
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
        description="Clean and split a large PLUTO CSV file into smaller files for manual upload"
    )
    parser.add_argument("file_path", help="Path to the original PLUTO CSV file")
    parser.add_argument("--output_dir", default="splits", help="Directory to save split CSV files")
    parser.add_argument("--splits", type=int, default=4, help="Number of files to split into (default: 4)")
    args = parser.parse_args()
    
    prepare_and_split_csv(args.file_path, args.output_dir, args.splits)

if __name__ == "__main__":
    main()