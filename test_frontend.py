# test_frontend.py
"""
Frontend Connectivity Test Script
Tests the frontend-backend integration and API endpoints
Run this after starting both backend and frontend servers
"""

import requests
import json
import time
from datetime import datetime

class FrontendTester:
    def __init__(self):
        self.backend_url = "http://localhost:5123"
        self.frontend_url = "http://localhost:3000"
        self.token = None
        self.user = None
        
    def print_section(self, title):
        print(f"\n{'='*60}")
        print(f"🧪 {title}")
        print(f"{'='*60}")
    
    def print_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
    
    def test_backend_connectivity(self):
        """Test if backend is running and accessible"""
        self.print_section("BACKEND CONNECTIVITY")
        
        try:
            # Test health endpoint
            response = requests.get(f"{self.backend_url}/api/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                self.print_test("Backend Health Check", True, 
                              f"Status: {health_data.get('status', 'Unknown')}")
                return True
            else:
                self.print_test("Backend Health Check", False, 
                              f"Status Code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_test("Backend Health Check", False, f"Connection Error: {str(e)}")
            return False
    
    def test_authentication(self):
        """Test authentication endpoints"""
        self.print_section("AUTHENTICATION TESTS")
        
        # Test login with admin credentials
        try:
            login_data = {
                "email": "admin@blitz.com",
                "password": "admin123"
            }
            
            response = requests.post(f"{self.backend_url}/api/auth/login", 
                                   json=login_data, timeout=10)
            
            if response.status_code == 200:
                auth_data = response.json()
                self.token = auth_data.get('access_token')
                self.user = auth_data.get('user')
                
                self.print_test("Admin Login", True, 
                              f"User: {self.user.get('username')} ({self.user.get('role')})")
                return True
            else:
                self.print_test("Admin Login", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.print_test("Admin Login", False, f"Request Error: {str(e)}")
            return False
    
    def get_headers(self):
        """Get headers with authorization token"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    def test_dashboard_api(self):
        """Test dashboard API endpoints"""
        self.print_section("DASHBOARD API TESTS")
        
        if not self.token:
            self.print_test("Dashboard Stats", False, "No authentication token")
            return False
        
        try:
            response = requests.get(f"{self.backend_url}/api/dashboard/stats", 
                                  headers=self.get_headers(), timeout=10)
            
            if response.status_code == 200:
                stats = response.json()
                self.print_test("Dashboard Stats", True, 
                              f"Models: {stats.get('models', 0)}, "
                              f"Agents: {stats.get('agents', 0)}, "
                              f"Cost: ${stats.get('total_cost', 0):.2f}")
                return True
            else:
                self.print_test("Dashboard Stats", False, 
                              f"Status: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.print_test("Dashboard Stats", False, f"Request Error: {str(e)}")
            return False
    
    def test_crud_endpoints(self):
        """Test basic CRUD endpoints"""
        self.print_section("CRUD ENDPOINTS TESTS")
        
        if not self.token:
            self.print_test("CRUD Operations", False, "No authentication token")
            return False
        
        headers = self.get_headers()
        
        # Test various GET endpoints
        endpoints = [
            ("Models", "/api/models"),
            ("Prompts", "/api/prompts"),
            ("Tools", "/api/tools"),
            ("Agents", "/api/agents"),
            ("Workflows", "/api/workflows"),
            ("Executions", "/api/executions")
        ]
        
        for name, endpoint in endpoints:
            try:
                response = requests.get(f"{self.backend_url}{endpoint}", 
                                      headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else "N/A"
                    self.print_test(f"Get {name}", True, f"Count: {count}")
                else:
                    self.print_test(f"Get {name}", False, 
                                  f"Status: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.print_test(f"Get {name}", False, f"Request Error: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        self.print_section("ADMIN ENDPOINTS TESTS")
        
        if not self.token:
            self.print_test("Admin Access", False, "No authentication token")
            return False
        
        if self.user.get('role') != 'admin':
            self.print_test("Admin Access", False, "User is not admin")
            return False
        
        headers = self.get_headers()
        
        # Test SQL executor with a simple query
        try:
            sql_data = {
                "query": "SELECT name FROM sqlite_master WHERE type='table' LIMIT 5;",
                "page": 1,
                "per_page": 10,
                "allow_dangerous": False
            }
            
            response = requests.post(f"{self.backend_url}/api/admin/sql", 
                                   json=sql_data, headers=headers, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    row_count = result.get('row_count', 0)
                    exec_time = result.get('execution_time', 0)
                    self.print_test("SQL Executor", True, 
                                  f"Rows: {row_count}, Time: {exec_time}s")
                else:
                    self.print_test("SQL Executor", False, 
                                  f"Query failed: {result.get('error', 'Unknown')}")
            else:
                self.print_test("SQL Executor", False, 
                              f"Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.print_test("SQL Executor", False, f"Request Error: {str(e)}")
        
        # Test database tables endpoint
        try:
            response = requests.get(f"{self.backend_url}/api/admin/sql/tables", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                tables_data = response.json()
                if tables_data.get('success'):
                    table_count = len(tables_data.get('tables', []))
                    self.print_test("Database Tables", True, f"Tables: {table_count}")
                else:
                    self.print_test("Database Tables", False, "Failed to get tables")
            else:
                self.print_test("Database Tables", False, 
                              f"Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.print_test("Database Tables", False, f"Request Error: {str(e)}")
    
    def test_frontend_accessibility(self):
        """Test if frontend is running"""
        self.print_section("FRONTEND ACCESSIBILITY")
        
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200:
                self.print_test("Frontend Server", True, 
                              f"Available at {self.frontend_url}")
                return True
            else:
                self.print_test("Frontend Server", False, 
                              f"Status Code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_test("Frontend Server", False, 
                          f"Connection Error: {str(e)}")
            return False
    
    def test_cors_configuration(self):
        """Test CORS configuration"""
        self.print_section("CORS CONFIGURATION")
        
        try:
            # Simulate a preflight request
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
            
            response = requests.options(f"{self.backend_url}/api/auth/login", 
                                      headers=headers, timeout=5)
            
            cors_headers = response.headers
            
            if 'Access-Control-Allow-Origin' in cors_headers:
                allowed_origin = cors_headers['Access-Control-Allow-Origin']
                self.print_test("CORS Headers", True, 
                              f"Allowed Origin: {allowed_origin}")
            else:
                self.print_test("CORS Headers", False, "No CORS headers found")
                
        except requests.exceptions.RequestException as e:
            self.print_test("CORS Configuration", False, f"Request Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"🚀 BLITZ AI FRAMEWORK - FRONTEND CONNECTIVITY TEST")
        print(f"📅 Test Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Backend URL: {self.backend_url}")
        print(f"🖥️  Frontend URL: {self.frontend_url}")
        
        # Run tests in sequence
        backend_ok = self.test_backend_connectivity()
        if not backend_ok:
            print("\n❌ Backend is not accessible. Please start the backend server first.")
            print("   Run: python backend/app.py")
            return False
        
        auth_ok = self.test_authentication()
        if not auth_ok:
            print("\n❌ Authentication failed. Check backend configuration.")
            return False
        
        self.test_dashboard_api()
        self.test_crud_endpoints()
        self.test_admin_endpoints()
        
        frontend_ok = self.test_frontend_accessibility()
        if not frontend_ok:
            print("\n⚠️  Frontend is not running. Start it with:")
            print("   cd frontend && npm start")
        
        self.test_cors_configuration()
        
        # Summary
        self.print_section("TEST SUMMARY")
        
        if backend_ok and auth_ok:
            print("✅ Backend integration: READY")
        else:
            print("❌ Backend integration: FAILED")
        
        if frontend_ok:
            print("✅ Frontend server: READY")
        else:
            print("❌ Frontend server: NOT RUNNING")
        
        print(f"\n🎯 Next Steps:")
        if not frontend_ok:
            print("   1. Start frontend: cd frontend && npm start")
        print("   2. Open browser: http://localhost:3000")
        print("   3. Login with: admin@blitz.com / admin123")
        print("   4. Test SQL Executor in Admin Panel")
        
        return backend_ok and auth_ok

def main():
    """Main test function"""
    tester = FrontendTester()
    
    try:
        success = tester.run_all_tests()
        exit_code = 0 if success else 1
        exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n⚠️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()