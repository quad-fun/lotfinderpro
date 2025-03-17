-- supabase/migrations/01_initial_schema.sql

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Properties table (based on NYC PLUTO dataset)
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    bbl BIGINT UNIQUE NOT NULL,  -- Borough, Block, and Lot identifier
    borough TEXT NOT NULL,
    block INTEGER NOT NULL,
    lot INTEGER NOT NULL,
    address TEXT,
    zipcode TEXT,
    zonedist1 TEXT, -- Primary zoning district
    bldgclass TEXT, -- Building class
    landuse TEXT,   -- Land use category
    ownertype TEXT, -- Owner type
    lotarea NUMERIC, -- Lot area in square feet
    bldgarea NUMERIC, -- Building area in square feet
    comarea NUMERIC, -- Commercial area
    resarea NUMERIC, -- Residential area
    officearea NUMERIC, -- Office area
    retailarea NUMERIC, -- Retail area
    garagearea NUMERIC, -- Garage area
    strgearea NUMERIC, -- Storage area
    factryarea NUMERIC, -- Factory area
    numfloors NUMERIC, -- Number of floors
    unitstotal INTEGER, -- Total units
    unitsres INTEGER,  -- Residential units
    yearbuilt INTEGER, -- Year built
    yearalter1 INTEGER, -- First alteration year
    yearalter2 INTEGER, -- Second alteration year
    builtfar NUMERIC,  -- Built FAR (Floor Area Ratio)
    residfar NUMERIC,  -- Maximum residential FAR
    commfar NUMERIC,   -- Maximum commercial FAR
    facilfar NUMERIC,  -- Maximum facility FAR
    assessland NUMERIC, -- Assessed land value
    assesstot NUMERIC,  -- Total assessed value
    exemptland NUMERIC, -- Exempt land value
    exempttot NUMERIC,  -- Total exempt value
    landmark TEXT,     -- Landmark status
    built_status TEXT, -- Built status (e.g., vacant)
    geom GEOMETRY(POLYGON, 4326), -- Geographic boundary
    centroid GEOMETRY(POINT, 4326), -- Center point
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create spatial indexes
CREATE INDEX properties_geom_idx ON properties USING GIST (geom);
CREATE INDEX properties_centroid_idx ON properties USING GIST (centroid);

-- Regular indexes
CREATE INDEX properties_bbl_idx ON properties (bbl);
CREATE INDEX properties_zonedist1_idx ON properties (zonedist1);
CREATE INDEX properties_borough_idx ON properties (borough);
CREATE INDEX properties_block_idx ON properties (block);
CREATE INDEX properties_lot_idx ON properties (lot);

-- Set up derived metrics
ALTER TABLE properties ADD COLUMN development_potential NUMERIC 
    GENERATED ALWAYS AS ((residfar - COALESCE(builtfar, 0)) * lotarea) STORED;
    
ALTER TABLE properties ADD COLUMN value_ratio NUMERIC 
    GENERATED ALWAYS AS (CASE WHEN assesstot > 0 THEN assessland / assesstot ELSE NULL END) STORED;
    
ALTER TABLE properties ADD COLUMN zoning_efficiency NUMERIC 
    GENERATED ALWAYS AS (CASE WHEN residfar > 0 THEN builtfar / residfar ELSE NULL END) STORED;

-- Query templates table
CREATE TABLE query_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sql_template TEXT NOT NULL,
    parameter_schema JSONB NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved searches table
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query_type TEXT NOT NULL, -- 'template' or 'nlp'
    template_id INTEGER REFERENCES query_templates(id),
    parameters JSONB,
    nlp_query TEXT,
    processed_sql TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opportunity types table
CREATE TABLE opportunity_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    criteria TEXT NOT NULL, -- SQL WHERE clause
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add row-level security (RLS) policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties are viewable by everyone" ON properties FOR SELECT USING (true);

ALTER TABLE query_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Query templates are viewable by everyone" ON query_templates FOR SELECT USING (true);

ALTER TABLE opportunity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunity types are viewable by everyone" ON opportunity_types FOR SELECT USING (true);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own saved searches" ON saved_searches
    USING (auth.uid() = user_id);

-- Triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_properties
BEFORE UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_query_templates
BEFORE UPDATE ON query_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_saved_searches
BEFORE UPDATE ON saved_searches
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_opportunity_types
BEFORE UPDATE ON opportunity_types
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();