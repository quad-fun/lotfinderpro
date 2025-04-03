-- supabase/seed/02_opportunity_types.sql
INSERT INTO opportunity_types (name, description, criteria) VALUES
(
  'Vacant Residential Lots',
  'Find vacant lots in residential zones with good development potential. These properties present opportunities for new construction in established residential areas.',
  'built_status = ''vacant'' AND zonedist1 LIKE ''R%'' AND lotarea > 2500'
),
(
  'Underbuilt Commercial Properties',
  'Commercial properties with significant unused FAR represent opportunities for vertical expansion or complete redevelopment to maximize the site''s allowed density.',
  'zonedist1 LIKE ''C%'' AND builtfar < commfar * 0.5 AND builtfar > 0 AND lotarea > 5000'
),
(
  'High Land Value Ratio Properties',
  'Properties where land value makes up a high percentage of total value. These sites often indicate buildings that are economically obsolete relative to their location value.',
  'assessland > 0 AND assesstot > 0 AND assessland / assesstot > 0.7 AND built_status = ''built'' AND yearbuilt < 1970'
),
(
  'Development Rights Transfer Candidates',
  'Properties with significant unused development rights that may be suitable for zoning lot mergers or transferable development rights (TDR) arrangements.',
  'residfar > 0 AND builtfar < residfar * 0.5 AND lotarea > 5000 AND assesstot > 1000000'
),
(
  'Corner Lot Opportunities',
  'Corner lots often offer premium visibility and flexible design options. These properties frequently command higher values for retail and mixed-use development.',
  'built_status = ''vacant'' AND lotfront > 25 AND lotdepth > 60 AND assessland > 500000'
),
(
  'Transit-Adjacent Development Sites',
  'Properties within close proximity to transit stations that are currently underutilized. Transit-oriented development typically commands premium values.',
  'builtfar < residfar * 0.6 AND lotarea > 4000 AND (zonedist1 LIKE ''R6%'' OR zonedist1 LIKE ''R7%'' OR zonedist1 LIKE ''R8%'' OR zonedist1 LIKE ''C%'')'
);