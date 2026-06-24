-- Natural-language query examples captured against canonical_entities
-- via Snowflake Cortex (snowflake.cortex.complete, model: llama3.1-8b).
-- Cortex translated each question into the SQL below; both the SQL
-- and the real result rows were captured by
-- cortex/generate_nl_query_examples.py and are replayed by the
-- dashboard precomputed (see nl_query_examples.json), not called live.

-- Q: Show me claimants appearing across more than one carrier
SELECT entity_id, carrier, first_name, last_name, carrier_count FROM canonical_entities WHERE carrier_count > 1;

-- Result (4 row(s)):
-- {'ENTITY_ID': '1b78a85b989eeca5de849088065d532d', 'CARRIER': 'atlas_underwriters', 'FIRST_NAME': 'Margaret', 'LAST_NAME': 'Chen', 'CARRIER_COUNT': 2}
-- {'ENTITY_ID': '1b78a85b989eeca5de849088065d532d', 'CARRIER': 'meridian_mutual', 'FIRST_NAME': 'Margaret', 'LAST_NAME': 'Chen', 'CARRIER_COUNT': 2}
-- {'ENTITY_ID': 'c391a2cf6070318880c23e63edc1bfce', 'CARRIER': 'coastal_premier', 'FIRST_NAME': 'Jonathon', 'LAST_NAME': 'Myers', 'CARRIER_COUNT': 2}
-- {'ENTITY_ID': 'c391a2cf6070318880c23e63edc1bfce', 'CARRIER': 'meridian_mutual', 'FIRST_NAME': 'Jonathan', 'LAST_NAME': 'Meyer', 'CARRIER_COUNT': 2}

-- Q: Which matched entities have the lowest confidence scores?
SELECT entity_id, first_name, last_name, match_confidence FROM canonical_entities WHERE match_confidence IS NOT NULL ORDER BY match_confidence LIMIT 5;

-- Result (4 row(s)):
-- {'ENTITY_ID': 'c391a2cf6070318880c23e63edc1bfce', 'FIRST_NAME': 'Jonathon', 'LAST_NAME': 'Myers', 'MATCH_CONFIDENCE': '0.97'}
-- {'ENTITY_ID': '1b78a85b989eeca5de849088065d532d', 'FIRST_NAME': 'Margaret', 'LAST_NAME': 'Chen', 'MATCH_CONFIDENCE': '1.00'}
-- {'ENTITY_ID': '1b78a85b989eeca5de849088065d532d', 'FIRST_NAME': 'Margaret', 'LAST_NAME': 'Chen', 'MATCH_CONFIDENCE': '1.00'}
-- {'ENTITY_ID': 'c391a2cf6070318880c23e63edc1bfce', 'FIRST_NAME': 'Jonathan', 'LAST_NAME': 'Meyer', 'MATCH_CONFIDENCE': '1.00'}

-- Q: What is the total claim amount by claim type across all carriers?
SELECT claim_type ,  SUM(claim_amount) FROM canonical_entities GROUP BY claim_type;

-- Result (2 row(s)):
-- {'CLAIM_TYPE': 'auto', 'SUM(CLAIM_AMOUNT)': '262221.42'}
-- {'CLAIM_TYPE': 'property', 'SUM(CLAIM_AMOUNT)': '664649.12'}

