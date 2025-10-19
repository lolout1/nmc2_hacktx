#!/bin/bash
# Fetch OpenF1 data for 2023 Singapore Grand Prix - Practice 1

echo "==============================================="
echo "OpenF1 Data Fetcher"
echo "==============================================="
echo ""
echo "Fetching 2023 Singapore GP Practice 1..."
echo "This will take about 60 seconds."
echo ""

python3 scripts/fetch_openf1_data.py --session-key 9161

echo ""
echo "==============================================="
echo "Done! Data saved to .openf1_cache/"
echo "==============================================="
echo ""
echo "Now run: npm run dev"
echo ""

