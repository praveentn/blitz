# backend/start.py
"""
Blitz AI Framework Backend Startup Script
This script handles the complete startup process including dependency checks,
environment validation, database setup, and server launch.
"""

import os
import sys
import subprocess
import importlib.util
from pathlib import Path

def check_python_version():
    """Check Python version compatibility"""
    print("🐍 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    print("📦 Checking dependencies...")
    
    required_packages = [
        'flask',
        'flask_sqlalchemy', 
        'flask_jwt_extended',
        'flask_cors',
        'openai',
        'requests',
        'werkzeug',
        'pydantic'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        if importlib.util.find_spec(package) is None:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n💡 Install missing packages with:")
        print("   pip install -r requirements.txt")
        return False
    
    print("✅ All required dependencies installed")
    return True

def check_environment():
    """Check environment configuration"""
    print("🔍 Checking environment configuration...")
    
    # Check if .env file exists
    env_file = Path('.env')
    if not env_file.exists():
        print("⚠️  .env file not found")
        print("💡 Copy .env.example to .env and configure your settings")
        
        # Try to copy .env.example if it exists
        env_example = Path('.env.example')
        if env_example.exists():
            try:
                import shutil
                shutil.copy('.env.example', '.env')
                print("✅ Created .env from .env.example")
                print("📝 Please edit .env with your Azure OpenAI credentials")
            except Exception as e:
                print(f"❌ Could not create .env file: {e}")
        return False
    
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("⚠️  python-dotenv not installed, skipping .env file loading")
    
    # Check critical environment variables
    critical_vars = ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT']
    missing_vars = []
    
    for var in critical_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Missing critical environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 Set these in your .env file for full functionality")
        print("   The application will start but some features may not work")
        return False
    
    print("✅ Environment configuration looks good")
    return True

def setup_directories():
    """Create required directories"""
    print("📁 Setting up directories...")
    
    directories = [
        'logs',
        'uploads', 
        'temp',
        'data',
        'backups'
    ]
    
    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"✅ Created directory: {directory}")
            except Exception as e:
                print(f"⚠️  Could not create directory {directory}: {e}")
        else:
            print(f"✅ Directory exists: {directory}")
    
    return True

def check_database():
    """Check database status and setup if needed"""
    print("🗄️ Checking database...")
    
    db_file = Path('blitz.db')
    
    if not db_file.exists():
        print("❌ Database not found")
        print("🔧 Setting up database...")
        
        try:
            # Import and run database setup
            import setup_database
            success = setup_database.setup_database()
            
            if success:
                print("✅ Database setup completed")
                return True
            else:
                print("❌ Database setup failed")
                return False
                
        except Exception as e:
            print(f"❌ Database setup error: {e}")
            return False
    else:
        print("✅ Database file exists")
        
        # Quick database connectivity test
        try:
            import sqlite3
            conn = sqlite3.connect('blitz.db')
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            
            if len(tables) > 0:
                print(f"✅ Database contains {len(tables)} tables")
                return True
            else:
                print("⚠️  Database exists but appears empty")
                print("🔧 Running database setup...")
                
                import setup_database
                success = setup_database.setup_database()
                return success
                
        except Exception as e:
            print(f"❌ Database connectivity test failed: {e}")
            return False

def start_server():
    """Start the Flask development server"""
    print("🚀 Starting Blitz AI Framework Backend...")
    print("="*60)
    
    try:
        # Import and create the app
        from app import create_app
        app = create_app()
        
        # Get configuration
        host = os.environ.get('SERVER_HOST', os.environ.get('FLASK_RUN_HOST', '0.0.0.0'))
        port = int(os.environ.get('SERVER_PORT', os.environ.get('FLASK_RUN_PORT', 5123)))
        debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
        
        print(f"🌐 Server URL: http://localhost:{port}")
        print(f"📊 API Health: http://localhost:{port}/api/health")
        print(f"🔍 Debug Mode: {'Enabled' if debug else 'Disabled'}")
        print()
        print("Default Accounts:")
        print("👤 Admin: admin@blitz.com / admin123")
        print("👤 User: user@blitz.com / user123")
        print("👤 Demo: demo@blitz.com / demo123")
        print()
        print("🧪 Test with: python test_backend.py (in another terminal)")
        print("="*60)
        print("Press Ctrl+C to stop the server")
        print()
        
        # Start the server
        app.run(
            host=host,
            port=port,
            debug=debug,
            use_reloader=debug,
            threaded=True
        )
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        return False
    
    return True

def run_tests():
    """Run the test suite"""
    print("🧪 Running backend tests...")
    
    try:
        # Run the test script
        result = subprocess.run([sys.executable, 'test_backend.py'], 
                              capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return False

def main():
    """Main startup function"""
    print("🚀 Blitz AI Framework Backend Startup")
    print("="*60)
    
    # Pre-flight checks
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment", check_environment),
        ("Directories", setup_directories),
        ("Database", check_database)
    ]
    
    print("🔍 Running pre-flight checks...")
    print()
    
    failed_checks = []
    
    for check_name, check_func in checks:
        try:
            success = check_func()
            if not success:
                failed_checks.append(check_name)
        except Exception as e:
            print(f"❌ {check_name} check failed with exception: {e}")
            failed_checks.append(check_name)
        print()
    
    # Summary
    if failed_checks:
        print("⚠️  Pre-flight check summary:")
        print(f"   ✅ Passed: {len(checks) - len(failed_checks)}")
        print(f"   ❌ Failed: {len(failed_checks)}")
        print(f"   Failed checks: {', '.join(failed_checks)}")
        print()
        
        if 'Dependencies' in failed_checks or 'Database' in failed_checks:
            print("❌ Critical checks failed. Cannot start server.")
            print("💡 Please fix the issues above and try again.")
            return False
        else:
            print("⚠️  Some checks failed but server can still start.")
            print("💡 Some features may not work properly.")
            print()
    else:
        print("✅ All pre-flight checks passed!")
        print()
    
    # Ask user what to do
    while True:
        print("What would you like to do?")
        print("1. Start the server")
        print("2. Run tests")
        print("3. Setup database only")
        print("4. Exit")
        
        try:
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == '1':
                start_server()
                break
            elif choice == '2':
                if run_tests():
                    print("✅ All tests passed!")
                else:
                    print("❌ Some tests failed. Check output above.")
                break
            elif choice == '3':
                import setup_database
                if setup_database.setup_database():
                    print("✅ Database setup completed!")
                else:
                    print("❌ Database setup failed!")
                break
            elif choice == '4':
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please enter 1, 2, 3, or 4.")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Startup cancelled by user")
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        sys.exit(1)