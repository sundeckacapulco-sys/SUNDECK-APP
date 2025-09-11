import requests
import sys
from datetime import datetime, timezone, timedelta
import json
import uuid

class CriticalEndpointTester:
    def __init__(self, base_url="https://tareas-pendientes-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None, json_data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {}
        
        # Don't set Content-Type for multipart requests, let requests handle it
        if not files and files != []:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files is not None:  # Multipart form data
                    response = requests.post(url, data=data, files=files, params=params)
                elif json_data:  # JSON data for complex structures
                    response = requests.post(url, json=json_data, headers=headers)
                elif params:  # Query parameters
                    response = requests.post(url, params=params, headers=headers)
                else:  # JSON data
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_router_working_endpoint(self):
        """Test the new test endpoint to verify router is working"""
        print("\n🔍 CRITICAL TEST - Router Working Endpoint")
        
        success, response = self.run_test(
            "Test Router Working Endpoint",
            "GET",
            "test-router-working",
            200
        )
        
        if success:
            print("   ✅ Router is working correctly in this section")
        else:
            print("   ❌ Router test endpoint failed - router registration issue")
        
        return success

    def test_specific_prospect_rescheduling(self):
        """Test the specific prospect rescheduling endpoint that was failing"""
        print("\n🔍 CRITICAL TEST - Specific Prospect Rescheduling")
        
        # Use the exact prospect ID that was failing
        prospect_id = "126b8395-e8d6-4db0-a093-517bb3a26f74"
        
        # First verify the prospect exists
        success1, response1 = self.run_test(
            f"Verify Prospect Exists - {prospect_id}",
            "GET",
            f"prospectos/{prospect_id}",
            200
        )
        
        if not success1:
            print(f"   ❌ Prospect {prospect_id} does not exist - cannot test rescheduling")
            return False
        
        print(f"   ✅ Prospect exists: {response1.get('nombre', 'Unknown')}")
        
        # Test the rescheduling endpoint with simplified data
        reschedule_data = {
            "nueva_fecha": "2025-09-13T12:00:00",
            "motivo": "clima_adverso",
            "comentarios": "test",
            "usuario_reagendo": "Usuario Actual"
        }
        
        success2, response2 = self.run_test(
            f"Test Rescheduling Endpoint - {prospect_id}",
            "POST",
            f"prospectos/{prospect_id}/reagendar-cita",
            200,
            json_data=reschedule_data
        )
        
        if success2:
            print("   ✅ Rescheduling endpoint is accessible and working")
            # Validate response structure
            required_fields = ['message', 'reagendamiento_id', 'fecha_original', 'fecha_nueva', 'motivo', 'usuario']
            for field in required_fields:
                if field not in response2:
                    print(f"   ❌ Missing field in response: {field}")
                    success2 = False
                else:
                    print(f"   ✅ Response field present: {field}")
        else:
            print("   ❌ Rescheduling endpoint failed - this is the critical issue")
        
        return success1 and success2

    def test_endpoint_discovery(self):
        """Test basic endpoint discovery to see what's working"""
        print("\n🔍 CRITICAL TEST - Endpoint Discovery")
        
        # Test various endpoints to see which ones are accessible
        endpoints_to_test = [
            ("Root API", "", 200),
            ("Prospectos List", "prospectos", 200),
            ("Kanban", "kanban", 200),
            ("Embudo 360", "embudo-360", 200),
            ("Etapas Disponibles", "etapas-disponibles", 200),
            ("Test Router", "test-router-working", 200)
        ]
        
        working_endpoints = []
        failing_endpoints = []
        
        for name, endpoint, expected_status in endpoints_to_test:
            success, response = self.run_test(
                f"Discover {name}",
                "GET",
                endpoint,
                expected_status
            )
            
            if success:
                working_endpoints.append(name)
                print(f"   ✅ {name} endpoint is accessible")
            else:
                failing_endpoints.append(name)
                print(f"   ❌ {name} endpoint failed")
        
        print(f"\n   📊 Endpoint Discovery Results:")
        print(f"   ✅ Working: {len(working_endpoints)} endpoints")
        print(f"   ❌ Failing: {len(failing_endpoints)} endpoints")
        
        if failing_endpoints:
            print(f"   ❌ Failed endpoints: {', '.join(failing_endpoints)}")
        
        # Return True if most endpoints are working
        return len(working_endpoints) > len(failing_endpoints)

    def test_router_registration_debug(self):
        """Debug router registration issues"""
        print("\n🔍 CRITICAL TEST - Router Registration Debug")
        
        # Test if the router is properly included
        success1, response1 = self.run_test(
            "Test API Root (Router Check)",
            "GET",
            "",
            200
        )
        
        if success1:
            print("   ✅ Main API router is responding")
        else:
            print("   ❌ Main API router is not responding")
            return False
        
        # Test a known working endpoint
        success2, response2 = self.run_test(
            "Test Known Working Endpoint",
            "GET",
            "prospectos",
            200,
            params={"page": 1, "limit": 1}
        )
        
        if success2:
            print("   ✅ Known working endpoint accessible")
        else:
            print("   ❌ Known working endpoint failed")
        
        # Test the problematic endpoint pattern
        success3, response3 = self.run_test(
            "Test Problematic Endpoint Pattern",
            "GET",
            "prospectos/126b8395-e8d6-4db0-a093-517bb3a26f74",
            200
        )
        
        if success3:
            print("   ✅ Prospect-specific endpoint pattern working")
        else:
            print("   ❌ Prospect-specific endpoint pattern failing")
        
        # Test POST endpoint pattern
        test_data = {
            "nueva_fecha": "2025-09-13T12:00:00",
            "motivo": "clima_adverso",
            "comentarios": "router test",
            "usuario_reagendo": "Test User"
        }
        
        success4, response4 = self.run_test(
            "Test POST Endpoint Pattern",
            "POST",
            "prospectos/126b8395-e8d6-4db0-a093-517bb3a26f74/reagendar-cita",
            200,
            json_data=test_data
        )
        
        if success4:
            print("   ✅ POST endpoint pattern working")
        else:
            print("   ❌ POST endpoint pattern failing - this is the critical issue")
        
        return success1 and success2 and success3 and success4

    def test_fastapi_configuration(self):
        """Test FastAPI configuration issues"""
        print("\n🔍 CRITICAL TEST - FastAPI Configuration")
        
        # Test if the /api prefix is working correctly
        success1, response1 = self.run_test(
            "Test API Prefix Configuration",
            "GET",
            "",
            200
        )
        
        if success1:
            print("   ✅ API prefix configuration working")
        else:
            print("   ❌ API prefix configuration issue")
        
        # Test if newer endpoints are accessible vs older ones
        newer_endpoints = [
            ("Reagendar Cita", "prospectos/126b8395-e8d6-4db0-a093-517bb3a26f74/reagendar-cita", "POST"),
            ("Comentarios Supervision", "prospectos/126b8395-e8d6-4db0-a093-517bb3a26f74/comentarios-supervision", "GET"),
            ("Historial Reagendamientos", "prospectos/126b8395-e8d6-4db0-a093-517bb3a26f74/historial-reagendamientos", "GET")
        ]
        
        older_endpoints = [
            ("Prospectos List", "prospectos", "GET"),
            ("Kanban", "kanban", "GET"),
            ("Embudo 360", "embudo-360", "GET")
        ]
        
        newer_working = 0
        older_working = 0
        
        # Test older endpoints
        for name, endpoint, method in older_endpoints:
            if method == "GET":
                success, response = self.run_test(
                    f"Test Older Endpoint - {name}",
                    method,
                    endpoint,
                    200
                )
                if success:
                    older_working += 1
                    print(f"   ✅ Older endpoint working: {name}")
                else:
                    print(f"   ❌ Older endpoint failing: {name}")
        
        # Test newer endpoints
        for name, endpoint, method in newer_endpoints:
            if method == "GET":
                success, response = self.run_test(
                    f"Test Newer Endpoint - {name}",
                    method,
                    endpoint,
                    200
                )
            else:  # POST
                test_data = {
                    "nueva_fecha": "2025-09-13T12:00:00",
                    "motivo": "clima_adverso",
                    "comentarios": "config test",
                    "usuario_reagendo": "Test User"
                }
                success, response = self.run_test(
                    f"Test Newer Endpoint - {name}",
                    method,
                    endpoint,
                    200,
                    json_data=test_data
                )
            
            if success:
                newer_working += 1
                print(f"   ✅ Newer endpoint working: {name}")
            else:
                print(f"   ❌ Newer endpoint failing: {name}")
        
        print(f"\n   📊 Configuration Test Results:")
        print(f"   ✅ Older endpoints working: {older_working}/{len(older_endpoints)}")
        print(f"   ✅ Newer endpoints working: {newer_working}/{len(newer_endpoints)}")
        
        if older_working > 0 and newer_working == 0:
            print("   🚨 ISSUE: Older endpoints work but newer ones don't - possible router registration issue")
        elif older_working == 0 and newer_working == 0:
            print("   🚨 ISSUE: No endpoints working - major configuration problem")
        elif older_working > 0 and newer_working > 0:
            print("   ✅ Both older and newer endpoints working - configuration seems OK")
        
        return older_working > 0 or newer_working > 0

    def run_critical_endpoint_tests(self):
        """Run only the critical endpoint registration tests"""
        print("🚨 CRITICAL ENDPOINT REGISTRATION TESTS")
        print("=" * 60)
        print(f"   Base URL: {self.base_url}")
        print("   Testing specific 404 error issues reported by user")
        
        critical_tests = [
            self.test_router_working_endpoint,
            self.test_endpoint_discovery,
            self.test_router_registration_debug,
            self.test_fastapi_configuration,
            self.test_specific_prospect_rescheduling
        ]
        
        critical_passed = 0
        critical_total = len(critical_tests)
        
        for test in critical_tests:
            try:
                if test():
                    critical_passed += 1
            except Exception as e:
                print(f"❌ Critical test {test.__name__} failed with exception: {str(e)}")
        
        print(f"\n🚨 CRITICAL TEST RESULTS: {critical_passed}/{critical_total} passed")
        print(f"   Success Rate: {(critical_passed/critical_total)*100:.1f}%")
        
        if critical_passed == critical_total:
            print("   ✅ ALL CRITICAL TESTS PASSED - Endpoints are working correctly")
        else:
            print("   ❌ CRITICAL ISSUES FOUND - Some endpoints are not accessible")
        
        return critical_passed == critical_total


if __name__ == "__main__":
    tester = CriticalEndpointTester()
    # Run only critical endpoint tests as requested
    tester.run_critical_endpoint_tests()