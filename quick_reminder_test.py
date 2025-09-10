import requests
import json
from datetime import datetime, timezone
import time

BASE_URL = "https://sunflow-crm.preview.emergentagent.com/api"

def test_basic_endpoints():
    print("🔍 Testing basic reminder endpoints...")
    
    # Test templates endpoint
    print("\n1. Testing templates-whatsapp endpoint...")
    response = requests.get(f"{BASE_URL}/templates-whatsapp")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        templates = response.json()
        print(f"   ✅ Found {len(templates)} templates")
    else:
        print(f"   ❌ Failed: {response.text}")
    
    # Test dashboard endpoint
    print("\n2. Testing recordatorios/dashboard endpoint...")
    response = requests.get(f"{BASE_URL}/recordatorios/dashboard")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        dashboard = response.json()
        print(f"   ✅ Dashboard data: {json.dumps(dashboard, indent=2)}")
    else:
        print(f"   ❌ Failed: {response.text}")
    
    # Test recordatorios endpoint
    print("\n3. Testing recordatorios endpoint...")
    response = requests.get(f"{BASE_URL}/recordatorios")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        recordatorios = response.json()
        print(f"   ✅ Recordatorios structure: {list(recordatorios.keys())}")
        print(f"   ✅ Found {len(recordatorios.get('recordatorios', []))} recordatorios")
    else:
        print(f"   ❌ Failed: {response.text}")

def test_reminder_creation():
    print("\n🔍 Testing automatic reminder creation...")
    
    # Create test prospect
    test_data = {
        "nombre": "Test Reminder Creation",
        "telefono": "+56900000001",
        "producto_solicitado": "Deck Test",
        "fecha_cita": datetime.now(timezone.utc).isoformat()
    }
    
    print("\n1. Creating test prospect...")
    response = requests.post(f"{BASE_URL}/prospectos", json=test_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"   ❌ Failed to create prospect: {response.text}")
        return
    
    prospect_id = response.json().get('id')
    print(f"   ✅ Created prospect: {prospect_id}")
    
    # Add Medición stage
    medicion_data = {
        "nombre_etapa": "Visita Inicial / Medición",
        "comentario": "Test medición stage",
        "precio_m2_general": 25000,
        "total_m2": 2.0,
        "total_estimado": 50000
    }
    
    print("\n2. Adding Medición stage...")
    response = requests.post(f"{BASE_URL}/prospectos/{prospect_id}/etapas-json", json=medicion_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"   ❌ Failed to add stage: {response.text}")
        # Clean up
        requests.delete(f"{BASE_URL}/prospectos/{prospect_id}")
        return
    
    print("   ✅ Added Medición stage")
    
    # Wait for reminder creation
    print("\n3. Waiting for reminder creation...")
    time.sleep(3)
    
    # Check if reminders were created
    print("\n4. Checking for created reminders...")
    response = requests.get(f"{BASE_URL}/recordatorios", params={"prospecto_id": prospect_id})
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        recordatorios = data.get('recordatorios', [])
        print(f"   ✅ Found {len(recordatorios)} recordatorios")
        
        if recordatorios:
            for r in recordatorios:
                print(f"      - Type: {r.get('tipo')}, Status: {r.get('estado')}")
        else:
            print("   ⚠️  No recordatorios found")
    else:
        print(f"   ❌ Failed to get recordatorios: {response.text}")
    
    # Clean up
    print("\n5. Cleaning up...")
    response = requests.delete(f"{BASE_URL}/prospectos/{prospect_id}")
    print(f"   Cleanup status: {response.status_code}")

if __name__ == "__main__":
    test_basic_endpoints()
    test_reminder_creation()