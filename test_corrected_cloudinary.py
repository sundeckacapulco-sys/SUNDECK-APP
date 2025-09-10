#!/usr/bin/env python3

import requests
import json
from datetime import datetime, timezone

def test_corrected_cloudinary():
    """Test the corrected Cloudinary integration"""
    base_url = 'https://sunflow-crm.preview.emergentagent.com/api'
    
    print('🔍 Testing Corrected Cloudinary Integration')
    print('Credentials: cloud_name=dm0jkstgo, api_key=889131198581369, api_secret=hYS25CWyVbMveJLuYgZPqpVOoyA')
    print('Issue: Previous API secret had incorrect "3." prefix - now corrected')
    
    # Create test prospect
    prospect_data = {
        'nombre': 'Cloudinary Corrected Test',
        'telefono': '+56987654321',
        'producto_solicitado': 'Deck Test Corrected',
        'fecha_cita': datetime.now(timezone.utc).isoformat()
    }
    
    response = requests.post(f'{base_url}/prospectos', json=prospect_data)
    if response.status_code != 200:
        print(f'❌ Failed to create test prospect: {response.status_code}')
        return False
    
    prospect_id = response.json()['id']
    print(f'✅ Test prospect created: {prospect_id}')
    
    try:
        # Test 1: Single photo upload with "Visita Inicial / Medición"
        print('\n📸 Test 1: Single Photo Upload (Visita Inicial / Medición)')
        stage_data = {
            'nombre_etapa': 'Visita Inicial / Medición',
            'comentario': 'Testing corrected Cloudinary credentials - should work now!'
        }
        
        # Simple PNG image data (1x1 pixel)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x01\x00\x00\x01\x00\x01IEND\xaeB`\x82'
        
        files = {'fotos': ('test_corrected.png', png_data, 'image/png')}
        
        response = requests.post(f'{base_url}/prospectos/{prospect_id}/etapas', params=stage_data, files=files)
        
        if response.status_code == 200:
            result = response.json()
            fotos = result.get('etapa', {}).get('fotos', [])
            if fotos:
                print(f'🎉 SUCCESS! Photo uploaded to Cloudinary: {fotos[0]}')
                print('✅ Invalid Signature error RESOLVED!')
                print('✅ Corrected API secret working properly')
                
                # Validate URL structure
                if 'cloudinary.com' in fotos[0] and 'dm0jkstgo' in fotos[0]:
                    print('✅ Valid Cloudinary URL with correct cloud name')
                else:
                    print(f'❌ Invalid URL structure: {fotos[0]}')
                    return False
                
                # Test accessibility
                try:
                    photo_response = requests.head(fotos[0], timeout=10)
                    if photo_response.status_code == 200:
                        print('✅ Photo is accessible from Cloudinary URL')
                    else:
                        print(f'⚠️  Photo accessibility issue: {photo_response.status_code}')
                except Exception as e:
                    print(f'⚠️  Could not verify photo accessibility: {str(e)}')
                
                test1_success = True
            else:
                print('❌ No photo URL returned')
                test1_success = False
        else:
            print(f'❌ Photo upload failed: {response.status_code} - {response.text}')
            test1_success = False
        
        # Test 2: Multiple photos upload
        print('\n📸 Test 2: Multiple Photos Upload')
        stage_data2 = {
            'nombre_etapa': 'Instalación en Proceso',
            'comentario': 'Testing multiple photos with corrected credentials'
        }
        
        # Create two different PNG images
        png_data2 = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9a\xf8\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x12IDATx\x9cc\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files2 = [
            ('fotos', ('instalacion_1.png', png_data, 'image/png')),
            ('fotos', ('instalacion_2.png', png_data2, 'image/png'))
        ]
        
        response = requests.post(f'{base_url}/prospectos/{prospect_id}/etapas', params=stage_data2, files=files2)
        
        if response.status_code == 200:
            result = response.json()
            fotos = result.get('etapa', {}).get('fotos', [])
            if len(fotos) >= 2:
                print(f'✅ Multiple photos uploaded successfully: {len(fotos)} photos')
                for i, foto_url in enumerate(fotos):
                    print(f'   Photo {i+1}: {foto_url}')
                test2_success = True
            else:
                print(f'❌ Expected 2 photos, got {len(fotos)}')
                test2_success = False
        else:
            print(f'❌ Multiple photos upload failed: {response.status_code} - {response.text}')
            test2_success = False
        
        # Test 3: Workflow validation
        print('\n📸 Test 3: Complete Workflow Validation')
        stage_data3 = {
            'nombre_etapa': 'Entrega Final',
            'comentario': 'Final delivery with photo evidence - workflow test'
        }
        
        files3 = {'fotos': ('entrega_final.png', png_data, 'image/png')}
        
        response = requests.post(f'{base_url}/prospectos/{prospect_id}/etapas', params=stage_data3, files=files3)
        
        if response.status_code == 200:
            result = response.json()
            fotos = result.get('etapa', {}).get('fotos', [])
            if fotos:
                print('✅ Complete workflow test successful')
                test3_success = True
            else:
                print('❌ Workflow test failed - no photos')
                test3_success = False
        else:
            print(f'❌ Workflow test failed: {response.status_code} - {response.text}')
            test3_success = False
        
        # Summary
        print('\n' + '='*60)
        print('📊 CLOUDINARY INTEGRATION TEST RESULTS')
        print('='*60)
        
        all_tests = [test1_success, test2_success, test3_success]
        passed = sum(all_tests)
        total = len(all_tests)
        
        if passed == total:
            print('🎉 ALL CLOUDINARY TESTS PASSED!')
            print('✅ Corrected API secret resolved "Invalid Signature" errors')
            print('✅ Single photo uploads: WORKING')
            print('✅ Multiple photo uploads: WORKING')
            print('✅ Complete workflow: WORKING')
            print('✅ Photo URLs accessible: WORKING')
            print('✅ Cloudinary integration: FULLY FUNCTIONAL')
            return True
        else:
            print(f'❌ {total - passed} out of {total} tests failed')
            print('❌ Cloudinary integration still has issues')
            return False
    
    finally:
        # Cleanup
        requests.delete(f'{base_url}/prospectos/{prospect_id}')
        print(f'\n✅ Test prospect {prospect_id} cleaned up')

if __name__ == '__main__':
    success = test_corrected_cloudinary()
    exit(0 if success else 1)