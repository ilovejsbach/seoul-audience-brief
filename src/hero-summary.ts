/**
 * Number of market-area boundaries we hold (public/data/market-areas.geojson features,
 * equal to market-sales.json `areas`). It is NOT the number observed in the latest
 * quarter. The other three hero figures are computed at run time from files the app
 * already loads; this one would need the 6MB/46MB market files, which the start screen
 * must not preload. tests/hero-summary.test.mjs recounts it from the boundary file and
 * fails on mismatch. 데이터 manifest 도입 시 교체 (replace with a manifest field).
 */
export const MARKET_AREA_COUNT=1650;
