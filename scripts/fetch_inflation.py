#!/usr/bin/env python3
"""
Fetch inflation data from World Bank API (Free, no API key needed)
"""

import json
import os
import sys
from datetime import datetime
import urllib.request
import urllib.error

def fetch_inflation(country_code='SAU'):
    """
    Fetch inflation data from World Bank API
    Country codes: SAU (Saudi Arabia), ARE (UAE), EGY (Egypt), etc.
    """
    print(f"📊 Fetching inflation data for {country_code}...")
    
    # World Bank API endpoint for CPI (Consumer Price Index) - Inflation indicator
    # Format: Annual % change
    url = f"https://api.worldbank.org/v2/country/{country_code}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5&date=2020:2024"
    
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            if len(data) < 2 or not data[1]:
                print("⚠️ No inflation data available")
                return create_fallback_data()
            
            # Get the most recent two data points
            records = data[1]
            if len(records) == 0:
                return create_fallback_data()
            
            # Most recent data
            latest = records[0]
            current_inflation = latest.get('value', 0) or 0
            
            # Previous period for comparison
            previous_inflation = records[1].get('value', 0) if len(records) > 1 else current_inflation
            change = current_inflation - previous_inflation
            
            result = {
                'current': round(current_inflation, 2),
                'change': round(change, 2),
                'year': latest.get('date', datetime.now().year),
                'country': country_code,
                'source': 'World Bank',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            print(f"✅ Inflation: {result['current']}% (Change: {result['change']:+.2f}%)")
            
            # Save to file
            os.makedirs('data', exist_ok=True)
            with open('data/inflation.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            return result
            
    except urllib.error.URLError as e:
        print(f"❌ Error fetching inflation data: {e}")
        return create_fallback_data()
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return create_fallback_data()

def create_fallback_data():
    """Create fallback data if API fails"""
    print("⚠️ Using fallback inflation data")
    return {
        'current': 2.5,
        'change': 0.0,
        'year': datetime.now().year,
        'country': 'N/A',
        'source': 'Fallback',
        'timestamp': datetime.utcnow().isoformat()
    }

if __name__ == '__main__':
    country = os.getenv('COUNTRY_CODE', 'SAU')
    fetch_inflation(country)
