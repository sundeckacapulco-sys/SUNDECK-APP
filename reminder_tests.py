import requests
import sys
from datetime import datetime, timezone
import json
import time

class ReminderSystemTester:
    def __init__(self, base_url="https://sunflow-crm.preview.emergentagent.com/api"):
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=json_data, headers=headers)

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

    def test_templates_whatsapp_initialization(self):
        """Test that default WhatsApp templates were initialized on startup"""
        print("\n🔍 Testing Reminder System - WhatsApp Templates Initialization")
        
        success, response = self.run_test(
            "Get WhatsApp Templates - Check Initialization",
            "GET",
            "templates-whatsapp",
            200
        )
        
        if success:
            templates = response if isinstance(response, list) else []
            
            # Check that we have the expected default templates
            expected_types = [
                "confirmacion_recepcion",
                "seguimiento_3_dias", 
                "seguimiento_cierre",
                "recontacto_sin_respuesta",
                "cobro_anticipo"
            ]
            
            found_types = [t.get('tipo') for t in templates]
            
            missing_types = []
            for expected_type in expected_types:
                if expected_type not in found_types:
                    missing_types.append(expected_type)
            
            if missing_types:
                print(f"   ❌ Missing template types: {missing_types}")
                success = False
            else:
                print(f"   ✅ All {len(expected_types)} default template types found")
            
            # Validate template structure
            if templates:
                first_template = templates[0]
                required_fields = ['id', 'tipo', 'nombre', 'mensaje', 'variables', 'activo', 'created_at', 'updated_at']
                
                for field in required_fields:
                    if field not in first_template:
                        print(f"   ❌ Missing field in template: {field}")
                        success = False
                
                if success:
                    print("   ✅ Template structure is valid")
                    print(f"   ✅ Found {len(templates)} total templates")
                    
                    # Check that templates have proper variables
                    for template in templates:
                        variables = template.get('variables', [])
                        mensaje = template.get('mensaje', '')
                        
                        # Check that variables in message match variables array
                        for var in variables:
                            if f"{{{var}}}" not in mensaje:
                                print(f"   ⚠️  Variable '{var}' not found in message for template {template.get('nombre')}")
        
        return success

    def test_recordatorios_dashboard(self):
        """Test dashboard endpoint for pending tasks"""
        print("\n🔍 Testing Reminder System - Dashboard Endpoint")
        
        success, response = self.run_test(
            "Get Recordatorios Dashboard",
            "GET",
            "recordatorios/dashboard",
            200
        )
        
        if success:
            # Validate dashboard structure
            required_fields = ['tareas_pendientes', 'tareas_vencidas', 'tareas_hoy', 'resumen_por_tipo']
            
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing field in dashboard: {field}")
                    success = False
                else:
                    print(f"   ✅ Dashboard field present: {field}")
            
            if success:
                # Validate numeric fields
                numeric_fields = ['tareas_pendientes', 'tareas_vencidas', 'tareas_hoy']
                for field in numeric_fields:
                    value = response.get(field, 0)
                    if not isinstance(value, int):
                        print(f"   ❌ Field {field} should be integer, got {type(value)}")
                        success = False
                    else:
                        print(f"   ✅ {field}: {value}")
                
                # Validate resumen_por_tipo structure
                resumen = response.get('resumen_por_tipo', {})
                if not isinstance(resumen, dict):
                    print("   ❌ resumen_por_tipo should be a dictionary")
                    success = False
                else:
                    print(f"   ✅ resumen_por_tipo has {len(resumen)} types")
        
        return success

    def test_automatic_reminder_creation_medicion(self):
        """Test automatic reminder creation when adding 'Visita Inicial / Medición' stage"""
        print("\n🔍 Testing Reminder System - Automatic Creation for Medición")
        
        # Create test prospect
        test_data = {
            "nombre": "Test Recordatorio Medición",
            "telefono": "+56900001111",
            "producto_solicitado": "Deck Recordatorio Test",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect for Reminder Test",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        prospect_id = response.get('id')
        
        # Add "Visita Inicial / Medición" stage - should create automatic reminder
        medicion_data = {
            "nombre_etapa": "Visita Inicial / Medición",
            "comentario": "Medición completada - debe crear recordatorio automático",
            "precio_m2_general": 25000,
            "unidad_medida": "m",
            "total_m2": 3.0,
            "total_estimado": 75000,
            "piezas_medicion": [
                {
                    "id": "reminder-test-1",
                    "ubicacion": "Test Area",
                    "ancho": 1.5,
                    "alto": 2.0,
                    "producto_tela": "Deck Test",
                    "color_acabado": "Natural",
                    "observaciones": "Test piece for reminder"
                }
            ]
        }
        
        success, response = self.run_test(
            "Add Medición Stage (Should Create Reminder)",
            "POST",
            f"prospectos/{prospect_id}/etapas-json",
            200,
            json_data=medicion_data
        )
        
        if not success:
            self.run_test("Cleanup Reminder Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
            return False
        
        # Wait a moment for async reminder creation
        time.sleep(2)
        
        # Check if reminder was created
        success, response = self.run_test(
            "Get Recordatorios for Prospect",
            "GET",
            "recordatorios",
            200,
            params={"prospecto_id": prospect_id}
        )
        
        if success:
            recordatorios = response.get('recordatorios', [])
            
            # Should have 1 reminder for cotización (24h)
            if len(recordatorios) >= 1:
                print(f"   ✅ Found {len(recordatorios)} recordatorio(s) created")
                
                # Find the cotización reminder
                cotizacion_reminder = None
                for r in recordatorios:
                    if r.get('tipo') == 'cotizacion_24h':
                        cotizacion_reminder = r
                        break
                
                if cotizacion_reminder:
                    print("   ✅ Cotización 24h reminder created correctly")
                    
                    # Validate reminder structure
                    required_fields = ['id', 'prospecto_id', 'tipo', 'fecha_limite', 'estado', 'mensaje_sugerido', 'etapa_relacionada']
                    
                    for field in required_fields:
                        if field not in cotizacion_reminder:
                            print(f"   ❌ Missing field in reminder: {field}")
                            success = False
                    
                    if success:
                        # Validate specific values
                        if cotizacion_reminder.get('prospecto_id') == prospect_id:
                            print("   ✅ Reminder linked to correct prospect")
                        else:
                            print("   ❌ Reminder not linked to correct prospect")
                            success = False
                        
                        if cotizacion_reminder.get('estado') == 'pendiente':
                            print("   ✅ Reminder status is 'pendiente'")
                        else:
                            print(f"   ❌ Expected status 'pendiente', got '{cotizacion_reminder.get('estado')}'")
                            success = False
                        
                        if cotizacion_reminder.get('etapa_relacionada') == 'Visita Inicial / Medición':
                            print("   ✅ Reminder linked to correct stage")
                        else:
                            print("   ❌ Reminder not linked to correct stage")
                            success = False
                else:
                    print("   ❌ Cotización 24h reminder not found")
                    success = False
            else:
                print("   ❌ No recordatorios created for Medición stage")
                success = False
        
        # Clean up
        self.run_test("Cleanup Reminder Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
        
        return success

    def test_automatic_reminder_creation_cotizacion(self):
        """Test automatic reminder creation when adding 'Cotización Aprobada' stage"""
        print("\n🔍 Testing Reminder System - Automatic Creation for Cotización Aprobada")
        
        # Create test prospect
        test_data = {
            "nombre": "Test Recordatorio Cotización",
            "telefono": "+56900002222",
            "producto_solicitado": "Deck Cotización Test",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect for Cotización Reminder Test",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        prospect_id = response.get('id')
        
        # Add "Cotización Aprobada" stage - should create 3 automatic reminders
        cotizacion_data = {
            "nombre_etapa": "Cotización Aprobada",
            "comentario": "Cotización aprobada - debe crear 3 recordatorios automáticos",
            "monto_total": 150000,
            "anticipo_recibido": 50000,
            "saldo_pendiente": 100000
        }
        
        success, response = self.run_test(
            "Add Cotización Aprobada Stage (Should Create 3 Reminders)",
            "POST",
            f"prospectos/{prospect_id}/etapas-json",
            200,
            json_data=cotizacion_data
        )
        
        if not success:
            self.run_test("Cleanup Cotización Reminder Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
            return False
        
        # Wait a moment for async reminder creation
        time.sleep(2)
        
        # Check if reminders were created
        success, response = self.run_test(
            "Get Recordatorios for Cotización Prospect",
            "GET",
            "recordatorios",
            200,
            params={"prospecto_id": prospect_id}
        )
        
        if success:
            recordatorios = response.get('recordatorios', [])
            
            # Should have 3 reminders: immediate, 3 days, 7 days
            expected_types = ['primer_seguimiento', 'segundo_seguimiento', 'tercer_seguimiento']
            
            if len(recordatorios) >= 3:
                print(f"   ✅ Found {len(recordatorios)} recordatorio(s) created")
                
                found_types = [r.get('tipo') for r in recordatorios]
                missing_types = []
                
                for expected_type in expected_types:
                    if expected_type not in found_types:
                        missing_types.append(expected_type)
                
                if missing_types:
                    print(f"   ❌ Missing reminder types: {missing_types}")
                    success = False
                else:
                    print("   ✅ All 3 expected reminder types created")
                    
                    # Validate timing - check that reminders have different dates
                    fechas_limite = [r.get('fecha_limite') for r in recordatorios if r.get('fecha_limite')]
                    unique_fechas = set(fechas_limite)
                    
                    if len(unique_fechas) >= 2:  # At least immediate and future dates should be different
                        print("   ✅ Reminders have different due dates")
                    else:
                        print("   ❌ Reminders should have different due dates")
                        success = False
                    
                    # Check that all reminders are linked to correct prospect and stage
                    for recordatorio in recordatorios:
                        if recordatorio.get('prospecto_id') != prospect_id:
                            print("   ❌ Reminder not linked to correct prospect")
                            success = False
                        if recordatorio.get('etapa_relacionada') != 'Cotización Aprobada':
                            print("   ❌ Reminder not linked to correct stage")
                            success = False
                        if recordatorio.get('estado') != 'pendiente':
                            print("   ❌ Reminder should be in 'pendiente' state")
                            success = False
                    
                    if success:
                        print("   ✅ All reminders properly configured")
            else:
                print(f"   ❌ Expected 3 recordatorios, got {len(recordatorios)}")
                success = False
        
        # Clean up
        self.run_test("Cleanup Cotización Reminder Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
        
        return success

    def test_get_recordatorios_endpoint(self):
        """Test GET /api/recordatorios endpoint with filters"""
        print("\n🔍 Testing Reminder System - Get Recordatorios Endpoint")
        
        # Test basic endpoint
        success, response = self.run_test(
            "Get All Recordatorios",
            "GET",
            "recordatorios",
            200
        )
        
        if success:
            # Validate response structure
            required_fields = ['recordatorios', 'resumen']
            
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing field in recordatorios response: {field}")
                    success = False
                else:
                    print(f"   ✅ Field present: {field}")
            
            if success:
                recordatorios = response.get('recordatorios', [])
                resumen = response.get('resumen', {})
                
                print(f"   ✅ Found {len(recordatorios)} recordatorios")
                
                # Validate resumen structure
                resumen_fields = ['total', 'pendientes', 'vencidos']
                for field in resumen_fields:
                    if field not in resumen:
                        print(f"   ❌ Missing field in resumen: {field}")
                        success = False
                    elif not isinstance(resumen[field], int):
                        print(f"   ❌ Field {field} should be integer")
                        success = False
                    else:
                        print(f"   ✅ {field}: {resumen[field]}")
                
                # If we have recordatorios, validate structure
                if recordatorios:
                    first_recordatorio = recordatorios[0]
                    required_fields = ['id', 'prospecto_id', 'tipo', 'fecha_limite', 'estado', 'mensaje_sugerido', 'etapa_relacionada']
                    
                    for field in required_fields:
                        if field not in first_recordatorio:
                            print(f"   ❌ Missing field in recordatorio: {field}")
                            success = False
                    
                    if success:
                        print("   ✅ Recordatorio structure is valid")
        
        # Test with estado filter
        success2, response2 = self.run_test(
            "Get Recordatorios - Filter by Estado 'pendiente'",
            "GET",
            "recordatorios",
            200,
            params={"estado": "pendiente"}
        )
        
        if success2:
            recordatorios = response2.get('recordatorios', [])
            # All should be pendiente
            non_pendiente = [r for r in recordatorios if r.get('estado') != 'pendiente']
            if non_pendiente:
                print(f"   ❌ Found {len(non_pendiente)} non-pendiente recordatorios in filtered results")
                success2 = False
            else:
                print(f"   ✅ Estado filter working - all {len(recordatorios)} are 'pendiente'")
        
        # Test with tipo filter
        success3, response3 = self.run_test(
            "Get Recordatorios - Filter by Tipo 'cotizacion_24h'",
            "GET",
            "recordatorios",
            200,
            params={"tipo": "cotizacion_24h"}
        )
        
        if success3:
            recordatorios = response3.get('recordatorios', [])
            wrong_type = [r for r in recordatorios if r.get('tipo') != 'cotizacion_24h']
            if wrong_type:
                print(f"   ❌ Found {len(wrong_type)} wrong-type recordatorios in filtered results")
                success3 = False
            else:
                print(f"   ✅ Tipo filter working - all {len(recordatorios)} are 'cotizacion_24h'")
        
        return success and success2 and success3

    def test_template_message_generation(self):
        """Test template message generation with dynamic variables"""
        print("\n🔍 Testing Reminder System - Template Message Generation")
        
        # Create test prospect with specific data for variable replacement
        test_data = {
            "nombre": "María González",
            "telefono": "+56900005555",
            "producto_solicitado": "Deck Premium Residencial",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect for Template Test",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        prospect_id = response.get('id')
        
        # Add stage to create recordatorio with template message
        medicion_data = {
            "nombre_etapa": "Visita Inicial / Medición",
            "comentario": "Medición para test template",
            "precio_m2_general": 30000,
            "total_m2": 4.0,
            "total_estimado": 120000
        }
        
        success, response = self.run_test(
            "Add Stage for Template Test",
            "POST",
            f"prospectos/{prospect_id}/etapas-json",
            200,
            json_data=medicion_data
        )
        
        if not success:
            self.run_test("Cleanup Template Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
            return False
        
        # Wait for recordatorio creation
        time.sleep(2)
        
        # Get the created recordatorio
        success, response = self.run_test(
            "Get Recordatorio for Template Test",
            "GET",
            "recordatorios",
            200,
            params={"prospecto_id": prospect_id}
        )
        
        if success:
            recordatorios = response.get('recordatorios', [])
            
            if recordatorios:
                recordatorio = recordatorios[0]
                mensaje = recordatorio.get('mensaje_sugerido', '')
                
                print(f"   ✅ Generated message: {mensaje[:100]}...")
                
                # Check that variables were replaced
                if "María González" in mensaje:
                    print("   ✅ Name variable replaced correctly")
                else:
                    print("   ❌ Name variable not replaced")
                    success = False
                
                if "Deck Premium Residencial" in mensaje:
                    print("   ✅ Product variable replaced correctly")
                else:
                    print("   ❌ Product variable not replaced")
                    success = False
                
                # Check that no unreplaced variables remain
                if "{nombre}" in mensaje or "{producto}" in mensaje:
                    print("   ❌ Found unreplaced variables in message")
                    success = False
                else:
                    print("   ✅ All variables properly replaced")
                
                # Check message is not empty and has reasonable length
                if len(mensaje) > 50:
                    print("   ✅ Message has reasonable length")
                else:
                    print("   ❌ Message seems too short")
                    success = False
            else:
                print("   ❌ No recordatorio found for template test")
                success = False
        
        # Test template endpoint directly
        success2, response2 = self.run_test(
            "Get Template Message Directly",
            "GET",
            "templates-whatsapp",
            200
        )
        
        if success2:
            templates = response2 if isinstance(response2, list) else []
            if templates:
                # Test getting a specific template message
                template_id = templates[0].get('id')
                
                # Create a test prospect for template message generation
                template_test_data = {
                    "nombre": "Juan Pérez",
                    "telefono": "+56900006666",
                    "producto_solicitado": "Pergola Moderna",
                    "fecha_cita": datetime.now(timezone.utc).isoformat()
                }
                
                success_prospect, response_prospect = self.run_test(
                    "Create Prospect for Template Message Test",
                    "POST",
                    "prospectos",
                    200,
                    data=template_test_data
                )
                
                if success_prospect:
                    template_prospect_id = response_prospect.get('id')
                    
                    success3, response3 = self.run_test(
                        "Get Specific Template Message",
                        "GET",
                        f"templates-whatsapp/{template_id}/mensaje",
                        200,
                        params={
                            "prospecto_id": template_prospect_id
                        }
                    )
                    
                    # Clean up template test prospect
                    self.run_test("Cleanup Template Message Test Prospect", "DELETE", f"prospectos/{template_prospect_id}", 200)
                else:
                    success3 = False
                
                if success3:
                    mensaje_template = response3.get('mensaje', '')
                    if "Juan Pérez" in mensaje_template and "Pergola Moderna" in mensaje_template:
                        print("   ✅ Direct template message generation working")
                    else:
                        print("   ❌ Direct template message generation failed")
                        success2 = False
                else:
                    success2 = False
        
        # Clean up
        self.run_test("Cleanup Template Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
        
        return success and success2

    def run_all_tests(self):
        """Run all reminder system tests"""
        print("🚀 Starting Reminder System Tests...")
        print(f"   Base URL: {self.base_url}")
        
        # Run all reminder system tests
        self.test_templates_whatsapp_initialization()
        self.test_recordatorios_dashboard()
        self.test_automatic_reminder_creation_medicion()
        self.test_automatic_reminder_creation_cotizacion()
        self.test_get_recordatorios_endpoint()
        self.test_template_message_generation()
        
        # Summary
        print(f"\n📊 Reminder System Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All reminder system tests passed!")
        else:
            print("❌ Some tests failed. Check the output above for details.")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = ReminderSystemTester()
    tester.run_all_tests()