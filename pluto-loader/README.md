# NYC PLUTO Data Loader for LotFinder Pro

This tool imports NYC PLUTO (Property Land Use Tax Lot Output) data into your Supabase database for use with the LotFinder Pro application.

## Overview

The NYC PLUTO dataset contains extensive information about every property (tax lot) in New York City, including:
- Geographic data (location, boundaries)
- Zoning information
- Building characteristics
- Assessment values
- And much more

This script:
1. Connects directly to the NYC Open Data API
2. Fetches PLUTO data in manageable batches
3. Transforms the data to match the LotFinder Pro database schema
4. Loads the data into your Supabase PostgreSQL database

## Prerequisites

- Python 3.7 or higher
- Supabase project with the LotFinder Pro database schema already set up
- Database connection credentials (host, database name, username, password)

## Setup

1. Clone this repository or download the script files:
   ```
   git clone <repository-url>
   cd pluto-loader
   ```

2. Run the setup script:
   ```
   python setup.py
   ```
   
   This will:
   - Install required dependencies
   - Create a `.env` file with your database connection details
   - Create a run script for easy execution

## Usage

### Basic Usage

To perform a full load of all NYC property data:

```bash
./run_pluto_loader.sh
```

This will:
- Truncate the existing properties table
- Download and process all properties from all five boroughs
- Insert them into your database

### Incremental Loading

To only load properties that have been updated since the last run:

```bash
./run_pluto_loader.sh --incremental
```

### Processing Specific Boroughs

To process only a specific borough:

```bash
./run_pluto_loader.sh --borough 1  # Manhattan
./run_pluto_loader.sh --borough 2  # Bronx
./run_pluto_loader.sh --borough 3  # Brooklyn
./run_pluto_loader.sh --borough 4  # Queens
./run_pluto_loader.sh --borough 5  # Staten Island
```

You can combine this with incremental loading:

```bash
./run_pluto_loader.sh --incremental --borough 3  # Load only updated Brooklyn properties
```

## Performance Notes

- A full data load will take several hours due to API rate limits and the size of the dataset
- The NYC PLUTO dataset contains over 800,000 properties
- Processing is done in batches of 500 records with a delay between requests to avoid API rate limits
- Spatial data processing (converting geometry formats) is computationally intensive

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:
1. Check that your `.env` file contains the correct connection details
2. Ensure your Supabase database allows connections from your IP address
3. Verify that the database schema has been properly set up

### API Rate Limiting

If you encounter rate limiting from the NYC Open Data API:
1. Increase the `REQUEST_DELAY` constant in the script (default is 1 second)
2. Run the script for individual boroughs instead of all at once

### Memory Issues

If the script runs out of memory:
1. Decrease the `BATCH_SIZE` constant (default is 500)
2. Process one borough at a time

## Scheduling Regular Updates

For regular data updates, you can set up a cron job:

```bash
# Example cron entry to run incremental updates weekly
0 0 * * 0 cd /path/to/pluto-loader && ./run_pluto_loader.sh --incremental >> pluto_update.log 2>&1
```

## Advanced Configuration

You can modify the following constants in `pluto_loader.py`:

- `BATCH_SIZE`: Number of records to process at once (default: 500)
- `REQUEST_DELAY`: Seconds between API requests (default: 1)
- `PLUTO_API_BASE_URL`: The NYC Open Data API endpoint

## License

This tool is released under the MIT License. See the LICENSE file for details.