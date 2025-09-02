#!/usr/bin/env python3
"""
Simple debug script to check database contents
"""

import os
import sys

def simple_debug():
    """Simple database debugging without complex imports."""
    print("🔍 Simple Database Debug")
    print("=" * 50)
    
    # Check environment variables
    print("\n📋 Environment Check:")
    neo4j_uri = os.environ.get('NEO4J_URI', 'Not set')
    neo4j_username = os.environ.get('NEO4J_USERNAME', 'Not set')
    neo4j_database = os.environ.get('NEO4J_DATABASE', 'Not set')
    
    print(f"   NEO4J_URI: {neo4j_uri}")
    print(f"   NEO4J_USERNAME: {neo4j_username}")
    print(f"   NEO4J_DATABASE: {neo4j_database}")
    
    # Check if we can access the database connection from score.py
    print("\n🔌 Database Connection Check:")
    try:
        # Try to import the database connection function
        sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
        from src.shared.common_fn import create_graph_database_connection
        print("   ✅ Database connection function imported successfully")
        
        # Try to create a connection
        uri = "neo4j+s://9379df68.databases.neo4j.io:7687"
        username = "neo4j"
        password = "your_password_here"  # You need to update this
        
        print(f"   🔗 Attempting connection to: {uri}")
        print(f"   👤 Username: {username}")
        print(f"   🗄️  Database: {database}")
        print("   ⚠️  Note: Update password in script to test connection")
        
    except ImportError as e:
        print(f"   ❌ Import error: {e}")
        print("   💡 This suggests missing dependencies")
    except Exception as e:
        print(f"   ❌ Other error: {e}")
    
    # Check what files exist in the database directory
    print("\n📁 File System Check:")
    current_dir = os.getcwd()
    print(f"   Current directory: {current_dir}")
    
    # Check for database-related files
    db_files = []
    for root, dirs, files in os.walk(current_dir):
        for file in files:
            if any(keyword in file.lower() for keyword in ['neo4j', 'database', 'graph', 'chunk']):
                db_files.append(os.path.join(root, file))
    
    if db_files:
        print(f"   Found {len(db_files)} database-related files:")
        for file in db_files[:10]:  # Show first 10
            print(f"     - {file}")
        if len(db_files) > 10:
            print(f"     ... and {len(db_files) - 10} more")
    else:
        print("   No obvious database files found")
    
    # Check for environment setup
    print("\n⚙️  Environment Setup:")
    python_path = sys.executable
    print(f"   Python executable: {python_path}")
    
    # Check if we're in a virtual environment
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("   ✅ Running in virtual environment")
    else:
        print("   ❌ Not running in virtual environment")
    
    print("\n💡 Next Steps:")
    print("   1. Update the password in the script")
    print("   2. Install required dependencies: pip install langchain-neo4j")
    print("   3. Run the full debug script")
    print("   4. Check if the document 'Abiy_Ahmed' exists and has chunks")

if __name__ == "__main__":
    simple_debug()
