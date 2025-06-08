# filter_nyc_oz_geojson.py

import json
import os
from pathlib import Path

# NYC County FIPS codes (state code 36 for New York)
NYC_COUNTY_CODES = {
    '36061': 'Manhattan (New York County)',
    '36005': 'Bronx County', 
    '36047': 'Brooklyn (Kings County)',
    '36081': 'Queens County',
    '36085': 'Staten Island (Richmond County)'
}

def filter_nyc_oz_from_geojson(input_file, output_file=None):
    """
    Filter GeoJSON to include only NYC Opportunity Zone tracts
    
    Args:
        input_file (str): Path to the input GeoJSON file
        output_file (str): Path for output file (optional)
    
    Returns:
        dict: Filtered GeoJSON with only NYC tracts
    """
    
    # Read the input GeoJSON
    with open(input_file, 'r') as f:
        geojson_data = json.load(f)
    
    print(f"Original GeoJSON contains {len(geojson_data['features'])} features")
    
    # Filter features for NYC
    nyc_features = []
    tract_summary = {
        'Manhattan': [],
        'Bronx': [],
        'Brooklyn': [],
        'Queens': [],
        'Staten_Island': []
    }
    
    borough_mapping = {
        '36061': 'Manhattan',
        '36005': 'Bronx', 
        '36047': 'Brooklyn',
        '36081': 'Queens',
        '36085': 'Staten_Island'
    }
    
    for feature in geojson_data['features']:
        properties = feature.get('properties', {})
        
        # Common property names to check for tract ID
        possible_tract_fields = [
            'GEOID', 'geoid', 'TRACTCE', 'tractce', 'FIPS', 'fips',
            'TRACT_ID', 'tract_id', 'GEOID10', 'geoid10', 'GEOID20', 'geoid20'
        ]
        
        tract_id = None
        for field in possible_tract_fields:
            if field in properties:
                tract_id = str(properties[field])
                break
        
        if not tract_id:
            # Print available properties to help identify the correct field
            print("Available properties in first feature:", list(properties.keys())[:10])
            print("Please check the GeoJSON structure and update the field names")
            break
        
        # Check if this tract is in NYC (first 5 digits are state+county)
        if len(tract_id) >= 5:
            county_code = tract_id[:5]
            
            if county_code in NYC_COUNTY_CODES:
                nyc_features.append(feature)
                borough = borough_mapping[county_code]
                tract_summary[borough].append(tract_id)
    
    # Create new GeoJSON with only NYC features
    nyc_geojson = {
        "type": "FeatureCollection",
        "features": nyc_features,
        "metadata": {
            "description": "NYC Opportunity Zone Tracts",
            "total_tracts": len(nyc_features),
            "boroughs": {k: len(v) for k, v in tract_summary.items() if v}
        }
    }
    
    # Save filtered GeoJSON
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(nyc_geojson, f, indent=2)
        print(f"NYC Opportunity Zones saved to: {output_file}")
    
    # Print summary
    print_summary(tract_summary, len(nyc_features))
    
    return nyc_geojson, tract_summary

def print_summary(tract_summary, total_features):
    """Print summary of filtered tracts"""
    print("\n" + "="*60)
    print("NYC OPPORTUNITY ZONE TRACTS SUMMARY")
    print("="*60)
    print(f"Total NYC OZ Tracts: {total_features}")
    print()
    
    for borough, tracts in tract_summary.items():
        if tracts:
            print(f"{borough:15}: {len(tracts):3} tracts")
            print(f"{'':15}   Examples: {', '.join(tracts[:3])}")
            if len(tracts) > 3:
                print(f"{'':15}   ... and {len(tracts) - 3} more")
            print()

def generate_supabase_migration(tract_summary, output_file="add_opportunity_zones.sql"):
    """
    Generate a Supabase migration file to add opportunity zone data
    """
    
    # Collect all NYC tract IDs
    all_nyc_tracts = []
    for borough_tracts in tract_summary.values():
        all_nyc_tracts.extend(borough_tracts)
    
    if not all_nyc_tracts:
        print("No NYC tracts found to generate migration")
        return
    
    with open(output_file, 'w') as f:
        f.write("-- NYC Opportunity Zone Migration\n")
        f.write("-- Generated from GeoJSON opportunity zone data\n\n")
        
        # Add column if it doesn't exist
        f.write("-- Add opportunity zone column\n")
        f.write("ALTER TABLE properties \n")
        f.write("ADD COLUMN IF NOT EXISTS is_opportunity_zone BOOLEAN DEFAULT FALSE;\n\n")
        
        # Create index for performance
        f.write("-- Create index for opportunity zone queries\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_properties_opportunity_zone \n")
        f.write("ON properties(is_opportunity_zone) WHERE is_opportunity_zone = TRUE;\n\n")
        
        # Update query - group by borough for better organization
        f.write("-- Mark properties in opportunity zones as TRUE\n")
        f.write("UPDATE properties SET is_opportunity_zone = TRUE WHERE\n")
        
        conditions = []
        borough_codes = {
            '36061': 'MN',  # Manhattan
            '36005': 'BX',  # Bronx  
            '36047': 'BK',  # Brooklyn
            '36081': 'QN',  # Queens
            '36085': 'SI'   # Staten Island
        }
        
        for county_fips, borough_code in borough_codes.items():
            # Get tracts for this borough
            borough_tracts = [t for t in all_nyc_tracts if t.startswith(county_fips)]
            
            if borough_tracts:
                # Convert 11-digit GEOID to 6-digit tract number
                tract_numbers = []
                for tract in borough_tracts:
                    # Remove state+county (first 5 digits) to get tract number
                    tract_num = tract[5:]
                    tract_numbers.append(f"'{tract_num}'")
                
                # Create condition for this borough
                condition = f"  (borough = '{borough_code}' AND bct2020 IN ({', '.join(tract_numbers)}))"
                conditions.append(condition)
        
        # Write all conditions
        f.write(" OR\n".join(conditions))
        f.write(";\n\n")
        
        # Add summary comments
        f.write(f"-- Total opportunity zone tracts: {len(all_nyc_tracts)}\n")
        for borough, tracts in tract_summary.items():
            if tracts:
                f.write(f"-- {borough}: {len(tracts)} tracts\n")
        
        f.write("\n-- Verify the update\n")
        f.write("SELECT borough, COUNT(*) as oz_properties\n")
        f.write("FROM properties \n")
        f.write("WHERE is_opportunity_zone = TRUE \n")
        f.write("GROUP BY borough\n")
        f.write("ORDER BY borough;\n")
    
    print(f"Supabase migration saved to: {output_file}")

def analyze_geojson_structure(input_file):
    """
    Analyze the structure of the GeoJSON file to understand available properties
    """
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print("GEOJSON STRUCTURE ANALYSIS")
    print("="*50)
    print(f"Type: {data.get('type')}")
    print(f"Total features: {len(data.get('features', []))}")
    
    if data.get('features'):
        first_feature = data['features'][0]
        print(f"\nFirst feature type: {first_feature.get('type')}")
        print(f"Geometry type: {first_feature.get('geometry', {}).get('type')}")
        
        properties = first_feature.get('properties', {})
        print(f"\nAvailable properties ({len(properties)} total):")
        for key, value in list(properties.items())[:15]:  # Show first 15 properties
            print(f"  {key}: {str(value)[:50]}")
        
        if len(properties) > 15:
            print(f"  ... and {len(properties) - 15} more properties")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Filter NYC Opportunity Zones from GeoJSON")
    parser.add_argument("input_file", help="Path to input GeoJSON file")
    parser.add_argument("--output", "-o", help="Output GeoJSON file path")
    parser.add_argument("--analyze", "-a", action="store_true", 
                       help="Just analyze the GeoJSON structure")
    parser.add_argument("--migration", "-m", help="Generate Supabase migration file")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: Input file '{args.input_file}' not found")
        exit(1)
    
    if args.analyze:
        analyze_geojson_structure(args.input_file)
    else:
        # Set default output filename if not provided
        if not args.output:
            input_path = Path(args.input_file)
            args.output = input_path.parent / f"nyc_oz_{input_path.name}"
        
        # Filter the GeoJSON
        nyc_geojson, tract_summary = filter_nyc_oz_from_geojson(
            args.input_file, 
            args.output
        )
        
        # Generate migration file if requested
        migration_file = args.migration or "add_opportunity_zones.sql"
        generate_supabase_migration(tract_summary, migration_file)

# Example usage:
# python filter_nyc_oz_geojson.py opportunity_zones.geojson
# python filter_nyc_oz_geojson.py --analyze opportunity_zones.geojson
# python filter_nyc_oz_geojson.py opportunity_zones.geojson -o nyc_oz.geojson -m migration.sql