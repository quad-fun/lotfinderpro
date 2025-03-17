-- supabase/seed/02_opportunity_types.sql
INSERT INTO opportunity_types (name, description, criteria) VALUES
(
  'Vacant Residential Lots',
  'Find vacant lots in residential zones with good development potential',
  'built_status = ''vacant'' AND zonedist1 LIKE ''R%'' AND lotarea > 2500'
),
(
  'Underbuilt Commercial Properties',
  'Commercial properties with significant unused FAR',
  'zonedist1 LIKE ''C%'' AND builtfar < commfar * 0.5 AND builtfar > 0 AND lotarea > 5000'
),
(
  'High Land Value Ratio Properties',
  'Properties where land value makes up a high percentage of total value',
  'assessland > 0 AND assesstot > 0 AND value_ratio > 0.7 AND built_status = ''built'' AND yearbuilt < 1970'
),
(
  'Development Rights Transfer Candidates',
  'Properties that may be suitable for selling air rights',
  'residfar > 0 AND builtfar < residfar * 0.5 AND lotarea > 5000 AND assesstot > 1000000'
);