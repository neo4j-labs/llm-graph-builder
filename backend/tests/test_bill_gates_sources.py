#!/usr/bin/env python3
"""
Test Bill Gates Risk Assessment Sources

This script specifically tests the Bill Gates risk assessment to see if
the enhanced source extraction is working and showing document names
instead of "Chunk X" references.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.risk_assessment import analyze_risk
from src.shared.common_fn import create_graph_database_connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_bill_gates_risk_assessment():
    """
    Test Bill Gates risk assessment with enhanced source extraction.
    """
    
    # Load environment variables
    load_dotenv()
    
    # Get database connection details
    uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    username = os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD', 'password')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    try:
        print("🔍 TESTING BILL GATES RISK ASSESSMENT SOURCES")
        print("=" * 60)
        
        # Define risk indicators (same as your example)
        risk_indicators = {
            "Foreign State Influence": 80,
            "Dual-Use Technology Exposure": 70,
            "Compliance with Canadian Research Security Policies": 60,
            "International Collaboration Patterns": 50,
            "Funding Sources Transparency": 40,
            "Export Control Compliance": 45,
            "Intellectual Property Protection": 35,
            "Research Data Security": 30
        }
        
        print(f"📋 Risk Assessment Parameters:")
        print(f"   Entity: Bill Gates (Person)")
        print(f"   Risk Indicators: {len(risk_indicators)}")
        print(f"   Depth: 4")
        print(f"   Max Results: 10")
        print()
        
        # Run risk assessment
        print("🔄 Running risk assessment...")
        result = analyze_risk(
            uri=uri,
            username=username,
            password=password,
            database=database,
            entity_name="Bill Gates",
            entity_type="Person",
            risk_indicators=risk_indicators,
            depth=4,
            max_results=10
        )
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return
        
        # Display results
        print("\n📊 RISK ASSESSMENT RESULTS")
        print("=" * 60)
        
        # Overall assessment
        overall_score = result.get('calculation', {}).get('overallScore', 'N/A')
        traffic_light = result.get('finalAssessment', {}).get('trafficLight', 'N/A')
        
        print(f"🎯 Overall Score: {overall_score}")
        print(f"🚦 Status: {traffic_light}")
        print()
        
        # Risk indicators with sources
        risk_assessments = result.get('riskAssessments', [])
        
        print("📋 RISK INDICATORS AND SOURCES")
        print("-" * 60)
        
        for assessment in risk_assessments:
            indicator = assessment.get('indicator', 'Unknown')
            score = assessment.get('score', 'N/A')
            weight = assessment.get('weight', 'N/A')
            sources = assessment.get('sources', [])
            
            print(f"🔍 {indicator}")
            print(f"   Score: {score}/5")
            print(f"   Weight: {weight}")
            print(f"   Sources: {sources}")
            print()
        
        # Analysis metadata
        metadata = result.get('analysis_metadata', {})
        chunks_analyzed = metadata.get('chunks_analyzed', 0)
        search_method = metadata.get('search_method', 'Unknown')
        
        print("📊 ANALYSIS METADATA")
        print("-" * 60)
        print(f"   Chunks Analyzed: {chunks_analyzed}")
        print(f"   Search Method: {search_method}")
        
        # Source analysis
        print("\n🔍 SOURCE ANALYSIS")
        print("-" * 60)
        
        source_types = {}
        total_sources = 0
        
        for assessment in risk_assessments:
            sources = assessment.get('sources', [])
            for source in sources:
                total_sources += 1
                if source == 'nil':
                    source_types['nil'] = source_types.get('nil', 0) + 1
                elif source.startswith('Chunk'):
                    source_types['Chunk Reference'] = source_types.get('Chunk Reference', 0) + 1
                elif source.startswith('http'):
                    source_types['URL'] = source_types.get('URL', 0) + 1
                elif source.startswith('Document:'):
                    source_types['Document Name'] = source_types.get('Document Name', 0) + 1
                else:
                    source_types['Other'] = source_types.get('Other', 0) + 1
        
        print(f"📊 Total Sources: {total_sources}")
        for source_type, count in source_types.items():
            percentage = (count / total_sources * 100) if total_sources > 0 else 0
            print(f"   {source_type}: {count} ({percentage:.1f}%)")
        
        # Summary
        print("\n📈 SUMMARY")
        print("=" * 60)
        
        if source_types.get('Document Name', 0) > 0:
            print("✅ Enhanced source extraction is working!")
            print("   Document names are being shown instead of 'Chunk X'")
        elif source_types.get('URL', 0) > 0:
            print("✅ Enhanced source extraction is working!")
            print("   Actual URLs are being shown")
        elif source_types.get('Chunk Reference', 0) > 0:
            print("⚠️  Still showing 'Chunk X' references")
            print("   This suggests chunks don't have URL properties")
        else:
            print("ℹ️  Mostly 'nil' sources (no evidence found)")
        
        if source_types.get('nil', 0) > 0:
            print(f"   {source_types['nil']} indicators have 'nil' sources (no evidence)")
        
    except Exception as e:
        logger.error(f"Error testing Bill Gates risk assessment: {str(e)}")
        print(f"❌ Error: {str(e)}")
    finally:
        if 'graph' in locals():
            graph.close()

if __name__ == "__main__":
    test_bill_gates_risk_assessment()
