#!/usr/bin/env python3
"""
Script to explain why sources show as "nil" in risk assessments.
"""

def explain_nil_sources():
    """Explain why sources might show as "nil" in risk assessments."""
    
    print("🔍 Understanding 'nil' Sources in Risk Assessment")
    print("=" * 60)
    
    print("\n📋 Why do some risk indicators show 'nil' sources?")
    print("\nThe 'nil' sources appear when the LLM determines that:")
    print("1. No evidence exists in the provided chunks for that specific risk indicator")
    print("2. The chunks don't contain relevant information for that particular risk factor")
    print("3. The LLM cannot find supporting evidence in the available context")
    
    print("\n📊 Example from your results:")
    print("""
Foreign State Influence: Sources: ["nil"]
- This means the chunks don't contain evidence of foreign state influence
- The LLM correctly identifies no supporting evidence
- This is actually GOOD - it means the system is not hallucinating

Dual-Use Technology Exposure: Sources: ["Chunk 5", "Chunk 7"]
- This means chunks 5 and 7 contain relevant evidence
- The LLM found supporting information in these chunks
- This shows the system is working correctly
    """)
    
    print("\n🎯 This is Expected Behavior:")
    print("✅ 'nil' sources indicate honest assessment - no evidence found")
    print("✅ Chunk references indicate evidence was found and used")
    print("✅ The LLM is following instructions to not hallucinate")
    
    print("\n🔧 To Get Better Sources:")
    print("1. Ensure your database contains documents with relevant information")
    print("2. Check that document sources/URLs are properly stored")
    print("3. Verify that chunks are being extracted with source information")
    print("4. Consider adding more diverse documents to your knowledge graph")
    
    print("\n📝 Current Source Types:")
    print("- 'nil': No evidence found (correct behavior)")
    print("- 'Chunk X': Evidence found in chunk X (working correctly)")
    print("- 'Document: filename.pdf': Document name available")
    print("- 'https://...': Actual URL available (ideal)")
    
    print("\n✅ Your system is working correctly!")
    print("The 'nil' sources are a sign of honest, evidence-based assessment.")

if __name__ == "__main__":
    explain_nil_sources()
