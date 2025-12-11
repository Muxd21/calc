#!/usr/bin/env python3
"""
Combine all data sources into a single JSON file for the frontend
"""

import json
import os
from datetime import datetime

def combine_data():
    """Combine inflation, news, and AI insights into one file"""
    print("🔄 Combining data...")
    
    # Load all data
    try:
        with open('data/inflation.json', 'r', encoding='utf-8') as f:
            inflation = json.load(f)
    except:
        inflation = {'current': 0, 'change': 0}
    
    try:
        with open('data/news.json', 'r', encoding='utf-8') as f:
            news = json.load(f)
    except:
        news = []
    
    try:
        with open('data/insights.json', 'r', encoding='utf-8') as f:
            insights = json.load(f)
    except:
        insights = {'summary': 'No insights available yet'}
    
    # Combine into single object
    combined = {
        'inflation': inflation,
        'news': news,
        'insights': insights,
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }
    
    # Save combined data
    os.makedirs('data', exist_ok=True)
    with open('data/latest.json', 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Data combined successfully")
    print(f"   - Inflation: {inflation.get('current', 0)}%")
    print(f"   - News articles: {len(news)}")
    print(f"   - AI insights: {len(insights.get('summary', ''))} chars")
    
    return combined

if __name__ == '__main__':
    combine_data()
