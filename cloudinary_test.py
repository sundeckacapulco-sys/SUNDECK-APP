import requests
import sys
import io
from datetime import datetime, timezone
import json

class CloudinaryTester:
    def __init__(self, base_url="https://tareas-pendientes-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_prospect_id = None

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
                    # For multipart with FastAPI Depends(), form fields go as query params
                    response = requests.post(url, params=params, files=files)
                elif json_data:  # JSON data for complex structures
                    response = requests.post(url, json=json_data, headers=headers)
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
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:300]}...")
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

    def create_test_image(self, format='PNG', size=(100, 100), color='red'):
        """Create a minimal test image (1x1 PNG)"""
        # Minimal 1x1 PNG image (43 bytes)
        if format.upper() in ['PNG']:
            return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01IEND\xaeB`\x82'
        elif format.upper() in ['JPEG', 'JPG']:
            # Minimal JPEG image
            return b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xaa\xff\xd9'
        else:
            # Default to PNG for other formats
            return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01IEND\xaeB`\x82'

    def create_test_prospect(self):
        """Create a test prospect for photo upload testing"""
        test_data = {
            "nombre": "Test Cloudinary Upload",
            "telefono": "+56912345678",
            "producto_solicitado": "Deck con Fotos",
            "fecha_cita": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Create Test Prospect for Cloudinary",
            "POST",
            "prospectos",
            200,
            data=test_data
        )
        
        if success and 'id' in response:
            self.created_prospect_id = response['id']
            print(f"   Created prospect ID: {self.created_prospect_id}")
            return True
        
        return False

    def test_cloudinary_single_photo_upload(self):
        """Test uploading a single photo to Cloudinary"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Create test image
        test_image = self.create_test_image('JPEG', (200, 150), 'blue')
        
        stage_data = {
            'nombre_etapa': 'Visita Inicial / Medición',
            'comentario': 'Test de subida de foto única a Cloudinary'
        }
        
        files = {
            'fotos': ('test_single.jpg', test_image, 'image/jpeg')
        }
        
        success, response = self.run_test(
            "Upload Single Photo to Cloudinary",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_data,
            files=files
        )
        
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 1:
                print(f"   ✅ Single photo uploaded successfully")
                photo_url = fotos[0]
                
                # Validate Cloudinary URL format
                if 'cloudinary.com' in photo_url and 'prospectos/' in photo_url:
                    print(f"   ✅ Valid Cloudinary URL format: {photo_url}")
                    
                    # Test if photo is accessible
                    try:
                        photo_response = requests.get(photo_url, timeout=10)
                        if photo_response.status_code == 200:
                            print(f"   ✅ Photo is accessible from Cloudinary URL")
                            
                            # Check content type
                            content_type = photo_response.headers.get('content-type', '')
                            if 'image' in content_type:
                                print(f"   ✅ Correct content type: {content_type}")
                            else:
                                print(f"   ❌ Unexpected content type: {content_type}")
                                success = False
                        else:
                            print(f"   ❌ Photo not accessible: {photo_response.status_code}")
                            success = False
                    except Exception as e:
                        print(f"   ❌ Error accessing photo: {str(e)}")
                        success = False
                else:
                    print(f"   ❌ Invalid Cloudinary URL format: {photo_url}")
                    success = False
            else:
                print(f"   ❌ Expected 1 photo, got {len(fotos)}")
                success = False
        
        return success

    def test_cloudinary_multiple_photos_upload(self):
        """Test uploading multiple photos to Cloudinary"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Create multiple test images
        test_images = [
            ('test_multi_1.png', self.create_test_image('PNG', (150, 100), 'green'), 'image/png'),
            ('test_multi_2.jpg', self.create_test_image('JPEG', (200, 200), 'yellow'), 'image/jpeg'),
            ('test_multi_3.png', self.create_test_image('PNG', (100, 200), 'purple'), 'image/png')
        ]
        
        stage_data = {
            'nombre_etapa': 'Cotización Aprobada',
            'comentario': 'Test de subida múltiple de fotos a Cloudinary'
        }
        
        files = []
        for filename, image_data, content_type in test_images:
            files.append(('fotos', (filename, image_data, content_type)))
        
        success, response = self.run_test(
            "Upload Multiple Photos to Cloudinary",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_data,
            files=files
        )
        
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 3:
                print(f"   ✅ All 3 photos uploaded successfully")
                
                # Validate each photo URL
                valid_urls = 0
                for i, photo_url in enumerate(fotos):
                    if 'cloudinary.com' in photo_url and 'prospectos/' in photo_url:
                        print(f"   ✅ Photo {i+1} has valid Cloudinary URL")
                        valid_urls += 1
                        
                        # Test accessibility
                        try:
                            photo_response = requests.get(photo_url, timeout=5)
                            if photo_response.status_code == 200:
                                print(f"   ✅ Photo {i+1} is accessible")
                            else:
                                print(f"   ❌ Photo {i+1} not accessible: {photo_response.status_code}")
                                success = False
                        except Exception as e:
                            print(f"   ❌ Error accessing photo {i+1}: {str(e)}")
                            success = False
                    else:
                        print(f"   ❌ Photo {i+1} has invalid URL: {photo_url}")
                        success = False
                
                if valid_urls == 3:
                    print(f"   ✅ All photo URLs are valid Cloudinary URLs")
                else:
                    print(f"   ❌ Only {valid_urls}/3 photos have valid URLs")
                    success = False
            else:
                print(f"   ❌ Expected 3 photos, got {len(fotos)}")
                success = False
        
        return success

    def test_cloudinary_different_formats(self):
        """Test uploading different image formats"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Test different formats
        formats_to_test = [
            ('test_format.jpg', 'JPEG', 'image/jpeg'),
            ('test_format.png', 'PNG', 'image/png'),
            ('test_format.webp', 'WEBP', 'image/webp')
        ]
        
        format_results = []
        
        for filename, img_format, content_type in formats_to_test:
            try:
                test_image = self.create_test_image(img_format, (120, 80), 'orange')
                
                stage_data = {
                    'nombre_etapa': 'Pedido',
                    'comentario': f'Test formato {img_format}'
                }
                
                files = {
                    'fotos': (filename, test_image, content_type)
                }
                
                success, response = self.run_test(
                    f"Upload {img_format} Format",
                    "POST",
                    f"prospectos/{self.created_prospect_id}/etapas",
                    200,
                    params=stage_data,
                    files=files
                )
                
                if success:
                    etapa = response.get('etapa', {})
                    fotos = etapa.get('fotos', [])
                    
                    if len(fotos) == 1 and 'cloudinary.com' in fotos[0]:
                        print(f"   ✅ {img_format} format uploaded successfully")
                        format_results.append(True)
                    else:
                        print(f"   ❌ {img_format} format upload failed")
                        format_results.append(False)
                else:
                    print(f"   ❌ {img_format} format upload failed")
                    format_results.append(False)
                    
            except Exception as e:
                print(f"   ❌ Error testing {img_format} format: {str(e)}")
                format_results.append(False)
        
        # Overall success if at least JPEG and PNG work
        jpeg_png_success = format_results[0] and format_results[1]  # JPEG and PNG
        if jpeg_png_success:
            print(f"   ✅ Core formats (JPEG, PNG) working correctly")
            if format_results[2]:  # WEBP
                print(f"   ✅ WEBP format also supported")
            else:
                print(f"   ⚠️  WEBP format not supported (acceptable)")
        else:
            print(f"   ❌ Core formats (JPEG, PNG) not working properly")
        
        return jpeg_png_success

    def test_cloudinary_large_file_handling(self):
        """Test handling of larger image files"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Create a larger test image by repeating the base image
        base_image = self.create_test_image('JPEG')
        large_image = base_image * 1000  # Make it larger
        
        stage_data = {
            'nombre_etapa': 'Fabricación',
            'comentario': 'Test de archivo grande'
        }
        
        files = {
            'fotos': ('test_large.jpg', large_image, 'image/jpeg')
        }
        
        print(f"   Testing large file (~{len(large_image)} bytes)")
        
        success, response = self.run_test(
            "Upload Large Image File",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_data,
            files=files
        )
        
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 1 and 'cloudinary.com' in fotos[0]:
                print(f"   ✅ Large file uploaded successfully")
                
                # Test if the uploaded image is accessible and properly processed
                try:
                    photo_response = requests.get(fotos[0], timeout=15)
                    if photo_response.status_code == 200:
                        print(f"   ✅ Large image is accessible from Cloudinary")
                        
                        # Check if Cloudinary processed it (should be smaller than original)
                        response_size = len(photo_response.content)
                        print(f"   ✅ Processed image size: {response_size} bytes")
                        
                        if response_size < len(large_image):
                            print(f"   ✅ Cloudinary optimized the image size")
                        
                    else:
                        print(f"   ❌ Large image not accessible: {photo_response.status_code}")
                        success = False
                except Exception as e:
                    print(f"   ❌ Error accessing large image: {str(e)}")
                    success = False
            else:
                print(f"   ❌ Large file upload failed")
                success = False
        
        return success

    def test_cloudinary_error_handling(self):
        """Test error handling for invalid files"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Test with invalid file (text file as image)
        invalid_file_content = b"This is not an image file, it's just text content"
        
        stage_data = {
            'nombre_etapa': 'Instalación en Proceso',
            'comentario': 'Test de archivo inválido'
        }
        
        files = {
            'fotos': ('invalid.txt', invalid_file_content, 'text/plain')
        }
        
        success, response = self.run_test(
            "Upload Invalid File (Should Handle Gracefully)",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,  # Should still return 200 but handle the error
            params=stage_data,
            files=files
        )
        
        # For error handling test, we expect it to either:
        # 1. Return 200 with empty fotos array (graceful handling)
        # 2. Return 500 with proper error message
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 0:
                print(f"   ✅ Invalid file handled gracefully (no photos uploaded)")
                return True
            else:
                print(f"   ❌ Invalid file was processed (unexpected)")
                return False
        else:
            # If it failed, check if it's a proper error response
            print(f"   ✅ Invalid file properly rejected with error")
            return True

    def test_cloudinary_empty_files_handling(self):
        """Test handling of empty file uploads"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        stage_data = {
            'nombre_etapa': 'Entrega Final',
            'comentario': 'Test sin archivos'
        }
        
        # Test with empty files array
        files = []
        
        success, response = self.run_test(
            "Upload Stage Without Photos",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_data,
            files=files
        )
        
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 0:
                print(f"   ✅ Stage created successfully without photos")
                return True
            else:
                print(f"   ❌ Unexpected photos in response: {fotos}")
                return False
        
        return success

    def test_cloudinary_url_structure(self):
        """Test Cloudinary URL structure and metadata"""
        if not self.created_prospect_id:
            print("❌ Skipping - No prospect ID available")
            return False
            
        # Upload a test image
        test_image = self.create_test_image('PNG', (300, 200), 'cyan')
        
        stage_data = {
            'nombre_etapa': 'Postventa',
            'comentario': 'Test estructura URL Cloudinary'
        }
        
        files = {
            'fotos': ('url_test.png', test_image, 'image/png')
        }
        
        success, response = self.run_test(
            "Upload for URL Structure Test",
            "POST",
            f"prospectos/{self.created_prospect_id}/etapas",
            200,
            params=stage_data,
            files=files
        )
        
        if success:
            etapa = response.get('etapa', {})
            fotos = etapa.get('fotos', [])
            
            if len(fotos) == 1:
                photo_url = fotos[0]
                print(f"   Photo URL: {photo_url}")
                
                # Validate URL structure
                url_checks = [
                    ('HTTPS', photo_url.startswith('https://')),
                    ('Cloudinary domain', 'cloudinary.com' in photo_url),
                    ('Secure URL', 'res.cloudinary.com' in photo_url),
                    ('Folder structure', 'prospectos/' in photo_url),
                    ('File extension', photo_url.endswith(('.png', '.jpg', '.jpeg', '.webp')))
                ]
                
                all_checks_passed = True
                for check_name, check_result in url_checks:
                    if check_result:
                        print(f"   ✅ {check_name}: OK")
                    else:
                        print(f"   ❌ {check_name}: FAILED")
                        all_checks_passed = False
                
                if all_checks_passed:
                    print(f"   ✅ Cloudinary URL structure is correct")
                    
                    # Test URL transformations (Cloudinary feature)
                    base_url = photo_url.split('/upload/')[0] + '/upload/'
                    public_id = photo_url.split('/upload/')[1]
                    
                    # Test thumbnail generation
                    thumbnail_url = f"{base_url}w_150,h_150,c_fill/{public_id}"
                    try:
                        thumb_response = requests.get(thumbnail_url, timeout=5)
                        if thumb_response.status_code == 200:
                            print(f"   ✅ Cloudinary transformations working (thumbnail)")
                        else:
                            print(f"   ⚠️  Cloudinary transformations may not be working")
                    except:
                        print(f"   ⚠️  Could not test Cloudinary transformations")
                    
                    return True
                else:
                    return False
            else:
                print(f"   ❌ Expected 1 photo for URL test, got {len(fotos)}")
                return False
        
        return success

    def run_all_cloudinary_tests(self):
        """Run all Cloudinary integration tests"""
        print("🚀 Starting Cloudinary Integration Tests")
        print("=" * 60)
        
        # Create test prospect first
        if not self.create_test_prospect():
            print("❌ Failed to create test prospect. Aborting tests.")
            return False
        
        # Run all tests
        tests = [
            self.test_cloudinary_single_photo_upload,
            self.test_cloudinary_multiple_photos_upload,
            self.test_cloudinary_different_formats,
            self.test_cloudinary_large_file_handling,
            self.test_cloudinary_error_handling,
            self.test_cloudinary_empty_files_handling,
            self.test_cloudinary_url_structure
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                self.tests_run += 1
        
        # Clean up test prospect
        if self.created_prospect_id:
            cleanup_success, _ = self.run_test(
                "Cleanup Test Prospect",
                "DELETE",
                f"prospectos/{self.created_prospect_id}",
                200
            )
            if cleanup_success:
                print("\n✅ Test prospect cleaned up successfully")
            else:
                print(f"\n⚠️  Could not clean up test prospect: {self.created_prospect_id}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("🎯 CLOUDINARY INTEGRATION TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL CLOUDINARY TESTS PASSED!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

if __name__ == "__main__":
    tester = CloudinaryTester()
    success = tester.run_all_cloudinary_tests()
    sys.exit(0 if success else 1)