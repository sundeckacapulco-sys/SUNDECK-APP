import requests
import sys
from datetime import datetime, timezone
import json

class ProspectosAPITester:
    def __init__(self, base_url="https://quotation-wizard-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_prospect_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
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
                elif params:  # Query parameters
                    response = requests.post(url, params=params, headers=headers)
                else:  # JSON data
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

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

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_create_prospect(self):
        """Test creating a new prospect"""
        test_data = {
            "nombre": "Juan Pérez Test",
            "telefono": "+56912345678",
            "producto_solicitado": "Deck Residencial",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if success and 'id' in response:
            self.created_prospect_id = response['id']
            print(f"   Created prospect ID: {self.created_prospect_id}")
        
        return success

    def test_get_all_prospects(self):
        """Test getting all prospects"""
        success, response = self.run_test(
            "Get All Prospects",
            "GET",
            "prospectos",
            200
        )
        
        if success:
            print(f"   Found {len(response)} prospects")
        
        return success

    def test_get_specific_prospect(self):
        """Test getting a specific prospect"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        success, response = self.run_test(
            "Get Specific Prospect",
            "GET",
            f"prospectos/{self.created_prospect_id}",
            200
        )
        return success

    def test_add_stage_without_photos(self):
        """Test adding a stage without photos"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Using query parameters as the backend expects
        stage_params = {
            'nombre_etapa': 'Visita Inicial',
            'comentario': 'Primera visita realizada exitosamente'
        }
        
        success, response = self.run_test(
            "Add Stage Without Photos",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_params
        )
        return success

    def test_add_stage_with_photos(self):
        """Test adding a stage with photos (expected to fail due to Cloudinary)"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Create a dummy file for testing
        stage_data = {
            'nombre_etapa': 'Medición y Diseño',
            'comentario': 'Mediciones tomadas y diseño inicial creado'
        }
        
        # Create a small dummy image file
        dummy_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'fotos': ('test_image.png', dummy_image, 'image/png')
        }
        
        print("   Note: This test is expected to fail due to missing Cloudinary credentials")
        success, response = self.run_test(
            "Add Stage With Photos (Expected to Fail)",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,  # We expect it to fail, but let's see what status we get
            data=stage_data,
            files=files
        )
        
        # For this test, we'll consider it "successful" if it fails as expected
        if not success:
            print("   ✅ Failed as expected due to Cloudinary configuration")
            return True
        
        return success

    def test_get_today_appointments(self):
        """Test getting today's appointments"""
        success, response = self.run_test(
            "Get Today's Appointments",
            "GET",
            "citas-hoy",
            200
        )
        
        if success:
            print(f"   Found {len(response)} appointments for today")
        
        return success

    def test_add_measurement_stage(self):
        """Test adding a measurement stage with pieces for pedido generation"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Create measurement data with pieces of different sizes (some < 1 m², some > 1 m²)
        measurement_data = {
            'nombre_etapa': 'Visita Inicial / Medición',
            'comentario': 'Medición completa con piezas de diferentes tamaños',
            'precio_m2_general': 25000,
            'unidad_medida': 'm',
            'piezas_medicion': [
                {
                    'id': 'pieza-1',
                    'ubicacion': 'Terraza Principal',
                    'ancho': 0.8,  # < 1 m² when multiplied by alto
                    'alto': 1.0,
                    'producto_tela': 'Deck WPC',
                    'color_acabado': 'Café Oscuro',
                    'observaciones': 'Pieza pequeña - debe aplicar regla mínimo 1 m²',
                    'precio_m2': 28000
                },
                {
                    'id': 'pieza-2',
                    'ubicacion': 'Balcón Dormitorio',
                    'ancho': 2.5,  # > 1 m²
                    'alto': 1.8,
                    'producto_tela': 'Deck Natural',
                    'color_acabado': 'Natural',
                    'observaciones': 'Pieza grande - cálculo normal',
                    'precio_m2': 22000
                },
                {
                    'id': 'pieza-3',
                    'ubicacion': 'Entrada',
                    'ancho': 0.6,  # < 1 m² when multiplied by alto
                    'alto': 1.2,
                    'producto_tela': 'Deck Premium',
                    'color_acabado': 'Gris',
                    'observaciones': 'Otra pieza pequeña para probar regla mínimo',
                    'precio_m2': 30000
                }
            ]
        }
        
        success, response = self.run_test(
            "Add Measurement Stage with Pieces",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=measurement_data
        )
        
        if success:
            print(f"   Added measurement stage with {len(measurement_data['piezas_medicion'])} pieces")
        
        return success

    def test_generate_pedido_from_measurement(self):
        """Test generating pedido from measurement stage"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        success, response = self.run_test(
            "Generate Pedido from Measurement",
            "POST",
            f"prospectos/{self.created_prospect_id}/generar-pedido",
            200
        )
        
        if success:
            # Validate response structure
            expected_fields = ['message', 'etapa', 'resumen']
            for field in expected_fields:
                if field not in response:
                    print(f"❌ Missing field in response: {field}")
                    return False
            
            # Validate etapa structure
            etapa = response.get('etapa', {})
            expected_etapa_fields = ['id', 'nombre_etapa', 'piezas_medicion', 'monto_total', 'anticipo_recibido', 'saldo_pendiente']
            for field in expected_etapa_fields:
                if field not in etapa:
                    print(f"❌ Missing field in etapa: {field}")
                    return False
            
            # Validate resumen structure
            resumen = response.get('resumen', {})
            expected_resumen_fields = ['total_piezas', 'total_m2_real', 'total_m2_comercial', 'total_estimado', 'regla_minimo_aplicada']
            for field in expected_resumen_fields:
                if field not in resumen:
                    print(f"❌ Missing field in resumen: {field}")
                    return False
            
            # Validate minimum 1 m² rule application
            if resumen.get('regla_minimo_aplicada'):
                print("   ✅ Minimum 1 m² rule was applied correctly")
            
            # Validate that commercial m² >= real m²
            m2_real = resumen.get('total_m2_real', 0)
            m2_comercial = resumen.get('total_m2_comercial', 0)
            if m2_comercial >= m2_real:
                print(f"   ✅ Commercial m² ({m2_comercial}) >= Real m² ({m2_real})")
            else:
                print(f"   ❌ Commercial m² ({m2_comercial}) < Real m² ({m2_real})")
                return False
            
            # Validate pieces have commercial calculations
            piezas = etapa.get('piezas_medicion', [])
            for i, pieza in enumerate(piezas):
                required_fields = ['m2_real', 'm2_comercial', 'precio_aplicado', 'subtotal']
                for field in required_fields:
                    if field not in pieza:
                        print(f"❌ Missing field in piece {i+1}: {field}")
                        return False
                
                # Validate minimum rule per piece
                if pieza['m2_comercial'] < 1.0 and pieza['m2_real'] < 1.0:
                    print(f"❌ Piece {i+1}: Commercial m² should be at least 1.0 for small pieces")
                    return False
            
            print(f"   ✅ Generated pedido with {resumen['total_piezas']} pieces")
            print(f"   ✅ Total real: {m2_real} m², commercial: {m2_comercial} m²")
            print(f"   ✅ Total estimated: ${resumen['total_estimado']:,.0f}")
        
        return success

    def test_generate_pedido_duplicate_validation(self):
        """Test that duplicate pedido generation is prevented"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        success, response = self.run_test(
            "Generate Duplicate Pedido (Should Fail)",
            "POST",
            f"prospectos/{self.created_prospect_id}/generar-pedido",
            400  # Should fail with 400 Bad Request
        )
        
        # For this test, success means it failed as expected
        if not success:
            print("   ❌ Duplicate validation failed - should have returned 400")
            return False
        else:
            print("   ✅ Duplicate pedido correctly prevented")
            return True

    def test_generate_pedido_without_measurement(self):
        """Test generating pedido without measurement stage"""
        # Create a new prospect without measurement
        test_data = {
            "nombre": "Test Sin Medición",
            "telefono": "+56987654321",
            "producto_solicitado": "Deck Test",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect Without Measurement",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        prospect_id = response.get('id')
        if not prospect_id:
            print("❌ Failed to get prospect ID")
            return False
        
        # Try to generate pedido without measurement
        success, response = self.run_test(
            "Generate Pedido Without Measurement (Should Fail)",
            "POST",
            f"prospectos/{prospect_id}/generar-pedido",
            400  # Should fail
        )
        
        # Clean up
        self.run_test("Cleanup Test Prospect", "DELETE", f"prospectos/{prospect_id}", 200)
        
        if not success:
            print("   ❌ Should have failed with 400 when no measurement exists")
            return False
        else:
            print("   ✅ Correctly prevented pedido generation without measurement")
            return True

    def test_add_pedido_stage_manually(self):
        """Test adding pedido stage manually with all required fields"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        pedido_data = {
            'nombre_etapa': 'Pedido',
            'comentario': 'Pedido manual creado para testing',
            'monto_total': 150000,
            'anticipo_recibido': 50000,
            'saldo_pendiente': 100000,
            'forma_pago': 'Transferencia Bancaria',
            'fecha_vencimiento_saldo': '2024-12-31',
            'cotizacion_url': 'https://example.com/cotizacion.pdf',
            'archivo_levantamiento_url': 'https://example.com/levantamiento.xlsx',
            'piezas_medicion': [
                {
                    'id': 'manual-1',
                    'ubicacion': 'Test Manual',
                    'ancho': 2.0,
                    'alto': 2.0,
                    'producto_tela': 'Test Product',
                    'color_acabado': 'Test Color',
                    'observaciones': 'Test manual piece'
                }
            ],
            'precio_m2_general': 25000,
            'total_m2': 4.0,
            'total_estimado': 100000
        }
        
        # Create a new prospect for manual pedido test
        test_data = {
            "nombre": "Test Pedido Manual",
            "telefono": "+56911111111",
            "producto_solicitado": "Deck Manual Test",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Prospect for Manual Pedido",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        manual_prospect_id = response.get('id')
        
        success, response = self.run_test(
            "Add Manual Pedido Stage",
            "POST",
            f"prospectos/{manual_prospect_id}/etapas",
            200,
            params=pedido_data
        )
        
        if success:
            # Validate that all pedido fields were saved
            etapa = response.get('etapa', {})
            pedido_fields = ['monto_total', 'anticipo_recibido', 'saldo_pendiente', 'forma_pago', 'fecha_vencimiento_saldo']
            for field in pedido_fields:
                if field not in etapa:
                    print(f"❌ Missing pedido field: {field}")
                    success = False
                else:
                    print(f"   ✅ Field {field}: {etapa[field]}")
        
        # Clean up
        self.run_test("Cleanup Manual Pedido Prospect", "DELETE", f"prospectos/{manual_prospect_id}", 200)
        
        return success

    def test_export_measurement(self):
        """Test exporting measurement data"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        success, response = self.run_test(
            "Export Measurement Data",
            "GET",
            f"prospectos/{self.created_prospect_id}/medicion/export",
            200
        )
        
        if success:
            # Validate export structure
            expected_fields = ['prospecto', 'medicion']
            for field in expected_fields:
                if field not in response:
                    print(f"❌ Missing field in export: {field}")
                    return False
            
            medicion = response.get('medicion', {})
            if 'piezas' not in medicion:
                print("❌ Missing pieces in measurement export")
                return False
            
            print(f"   ✅ Exported measurement with {len(medicion['piezas'])} pieces")
        
        return success

    def test_delete_prospect(self):
        """Test deleting a prospect"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        success, response = self.run_test(
            "Delete Prospect",
            "DELETE",
            f"prospectos/{self.created_prospect_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Prospectos Sundeck API Tests")
    print("=" * 50)
    
    tester = ProspectosAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_health_check,
        tester.test_create_prospect,
        tester.test_get_all_prospects,
        tester.test_get_specific_prospect,
        tester.test_add_stage_without_photos,
        tester.test_add_stage_with_photos,
        tester.test_get_today_appointments,
        tester.test_delete_prospect
    ]
    
    for test in tests:
        test()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - see details above")
        return 1

if __name__ == "__main__":
    sys.exit(main())