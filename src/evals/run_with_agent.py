#!/usr/bin/env python3
"""
Run accommodation agent evals by calling the Next.js API
This script calls your accommodation agent through the /api/schedule/generate endpoint
and evaluates the accommodation portion of the response.
"""

import json
import os
import sys
import re
from datetime import datetime
from typing import Dict, Any, List

# Add paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from accommodation_eval import evaluate_accommodation_agent

try:
    import requests
except ImportError:
    print("ERROR: 'requests' library not installed")
    print("Install it with: pip3 install requests")
    sys.exit(1)

def load_test_cases(json_path: str) -> List[Dict]:
    """Load test cases from JSON file (array format)"""
    with open(json_path, 'r') as f:
        test_cases = json.load(f)
    if not isinstance(test_cases, list):
        raise ValueError("JSON file must contain an array of test cases")
    return test_cases

def parse_test_input(content: str) -> Dict[str, Any]:
    """
    Parse the test case content to extract parameters
    Example: "Find accommodation for a ski trip:\n\nResort: Killington\n..."
    """
    params = {}
    
    # Extract resort name
    resort_match = re.search(r'Resort:\s*(.+)', content)
    if resort_match:
        params['resort'] = resort_match.group(1).strip()
    
    # Extract location
    location_match = re.search(r'Location:\s*(.+)', content)
    if location_match:
        params['location'] = location_match.group(1).strip()
    
    # Extract dates
    checkin_match = re.search(r'Check-in:\s*(.+)', content)
    checkout_match = re.search(r'Check-out:\s*(.+)', content)
    if checkin_match and checkout_match:
        params['checkIn'] = checkin_match.group(1).strip()
        params['checkOut'] = checkout_match.group(1).strip()
        
        # Calculate duration
        try:
            checkin_date = datetime.strptime(params['checkIn'], '%Y-%m-%d')
            checkout_date = datetime.strptime(params['checkOut'], '%Y-%m-%d')
            duration = (checkout_date - checkin_date).days
            params['duration'] = max(1, duration)
        except ValueError:
            params['duration'] = 3  # Default
    
    # Extract group size
    group_match = re.search(r'Group Size:\s*(\d+)', content)
    if group_match:
        params['groupSize'] = int(group_match.group(1))
    else:
        params['groupSize'] = 4  # Default
    
    return params

def call_accommodation_agent_via_api(test_input: Dict, api_url: str = "http://localhost:3000/api/schedule/accommodation") -> Dict[str, Any]:
    """
    Call the accommodation agent via the Next.js API
    Returns the accommodation options directly
    """
    # Extract content from test input
    content = test_input['input'][0]['content']
    
    # Parse parameters
    params = parse_test_input(content)
    
    if not all([params.get('resort'), params.get('location'), params.get('checkIn'), params.get('checkOut')]):
        raise ValueError(f"Could not parse all required parameters from input. Got: {params}")
    
    # Prepare API payload for accommodation-only endpoint
    payload = {
        "resortName": params['resort'],
        "resortAddress": params['location'],
        "resortCoordinates": None,  # Optional, can be added if needed
        "tripDates": {
            "startDate": params['checkIn'],
            "endDate": params['checkOut'],
            "checkIn": params['checkIn'],
            "checkOut": params['checkOut']
        },
        "groupSize": params['groupSize'],
        "memberBudgets": []  # Optional, can extract from test case if needed
    }
    
    # Make API request
    try:
        # First, try to verify the server is running
        try:
            health_check = requests.get('http://localhost:3000', timeout=2)
        except requests.exceptions.ConnectionError:
            raise Exception(
                f"Could not connect to Next.js server at http://localhost:3000.\n"
                f"Please make sure:\n"
                f"  1. Your Next.js server is running (run 'npm run dev' in the project root)\n"
                f"  2. The server is running on port 3000\n"
                f"  3. No firewall is blocking the connection"
            )
        except requests.exceptions.Timeout:
            pass  # Health check timeout is okay, server might be slow
        
        # Make the actual API request
        response = requests.post(
            api_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=300  # 5 minute timeout for agent execution
        )
        
        if response.status_code != 200:
            error_text = response.text
            try:
                error_json = response.json()
                error_text = json.dumps(error_json, indent=2)
            except:
                pass
            raise Exception(f"API call failed with status {response.status_code}:\n{error_text}")
        
        result = response.json()
        
        # Return the accommodation options directly
        if 'options' in result:
            return result
        else:
            raise ValueError("Response does not contain 'options' field")
            
    except requests.exceptions.ConnectionError as e:
        raise Exception(
            f"Could not connect to API at {api_url}.\n"
            f"Error: {str(e)}\n\n"
            f"Troubleshooting steps:\n"
            f"  1. Make sure your Next.js server is running: npm run dev\n"
            f"  2. Check that the server is on port 3000 (or set API_URL env var)\n"
            f"  3. Verify the endpoint exists: curl http://localhost:3000/api/schedule/accommodation\n"
            f"  4. Check for any errors in your Next.js server console"
        )
    except requests.exceptions.Timeout:
        raise Exception("API request timed out. The agent may be taking too long to respond.")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Request failed: {str(e)}")

def format_score(score: float) -> str:
    """Format score as percentage with color coding"""
    percentage = score * 100
    if percentage >= 80:
        return f"✅ {percentage:.1f}%"
    elif percentage >= 60:
        return f"⚠️  {percentage:.1f}%"
    else:
        return f"❌ {percentage:.1f}%"

def main():
    # Check API key (for agent execution)
    if not os.environ.get('OPENAI_API_KEY'):
        print("WARNING: OPENAI_API_KEY environment variable not set")
        print("The agent may fail if it's required by your API")
        print("Set it with: export OPENAI_API_KEY='your-key-here'\n")
    
    # Load test cases
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, 'accommodation-agent-eval.json')
    
    if not os.path.exists(json_path):
        print(f"ERROR: Test data file not found: {json_path}")
        sys.exit(1)
    
    test_cases = load_test_cases(json_path)
    
    print("=" * 70)
    print("Accommodation Agent Evaluation")
    print("=" * 70)
    print(f"\nLoaded {len(test_cases)} test cases")
    
    api_url = os.environ.get('API_URL', 'http://localhost:3000/api/schedule/accommodation')
    print(f"API URL: {api_url}")
    print("\n⚠️  Checking if Next.js server is running...")
    
    # Pre-flight connection check
    try:
        test_response = requests.get('http://localhost:3000', timeout=3)
        print("✅ Server is running and responding")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server at http://localhost:3000")
        print("\n" + "=" * 70)
        print("SERVER NOT RUNNING")
        print("=" * 70)
        print("\nPlease start your Next.js server first:")
        print("  1. Open a new terminal window")
        print("  2. Navigate to the project root:")
        print("     cd /Users/abhi/Downloads/Slopes-trip-agent")
        print("  3. Start the development server:")
        print("     npm run dev")
        print("  4. Wait for the 'Ready' message")
        print("  5. Then run this script again")
        print("\n" + "=" * 70)
        sys.exit(1)
    except Exception as e:
        print(f"⚠️  Connection check warning: {e}")
        print("   Continuing anyway, but connection may fail...")
    
    print("\nStarting evaluation...\n")
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'=' * 70}")
        print(f"Test Case {i}/{len(test_cases)}")
        print('=' * 70)
        
        # Show test case info
        content = test_case['input'][0]['content']
        print(f"\nInput:")
        print(f"  {content[:100]}...")
        print(f"\nExpected:")
        ideal = test_case.get('ideal', {})
        for key, value in ideal.items():
            print(f"  {key}: {value}")
        
        try:
            # Call the agent via API
            print(f"\n⏳ Calling accommodation agent via API...")
            agent_output = call_accommodation_agent_via_api(test_case, api_url)
            
            print(f"✅ Received {len(agent_output.get('options', []))} accommodation options")
            
            # Evaluate the output
            print(f"📊 Evaluating output...")
            evaluation = evaluate_accommodation_agent(agent_output)
            
            score = evaluation['score']
            details = evaluation['details']
            
            # Display results
            print(f"\nResults:")
            print(f"  Overall Score: {format_score(score)}")
            
            print(f"\n  Photo Quality:")
            photos = details['photo_quality']
            print(f"    - Total Photos: {photos['total_photos']}")
            print(f"    - Valid Photos: {photos['valid_photos']}")
            print(f"    - Placeholders: {photos['placeholder_count']}")
            print(f"    - Has Placeholders: {'❌' if photos['has_placeholders'] else '✅'}")
            
            print(f"\n  Completeness:")
            complete = details['completeness']
            print(f"    - Complete Options: {complete['complete_count']}/{len(agent_output.get('options', []))}")
            print(f"    - Is Complete: {'✅' if complete['is_complete'] else '❌'}")
            if complete['missing_fields']:
                print(f"    - Missing Fields: {', '.join(complete['missing_fields'][:5])}")
            
            results.append({
                'test_case': i,
                'score': score,
                'details': details,
                'passed': score >= 0.8
            })
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            import traceback
            if os.environ.get('DEBUG'):
                traceback.print_exc()
            results.append({
                'test_case': i,
                'score': 0.0,
                'error': str(e),
                'passed': False
            })
    
    # Summary
    print("\n" + "=" * 70)
    print("Evaluation Summary")
    print("=" * 70)
    
    if results:
        passed_count = sum(1 for r in results if r.get('passed', False))
        total_count = len(results)
        avg_score = sum(r.get('score', 0) for r in results) / total_count
        
        print(f"\nTotal Test Cases: {total_count}")
        print(f"Passed: {passed_count} ({format_score(passed_count / total_count)})")
        print(f"Failed: {total_count - passed_count}")
        print(f"Average Score: {format_score(avg_score)}")
        
        print(f"\nDetailed Scores:")
        for result in results:
            status = "✅ PASS" if result.get('passed') else "❌ FAIL"
            print(f"  Test {result['test_case']}: {format_score(result.get('score', 0))} - {status}")
            if 'error' in result:
                print(f"    Error: {result['error']}")
        
        # Save results to file
        results_file = os.path.join(script_dir, 'eval-results.json')
        with open(results_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'summary': {
                    'total': total_count,
                    'passed': passed_count,
                    'average_score': avg_score
                },
                'results': results
            }, f, indent=2)
        
        print(f"\n💾 Results saved to: {results_file}")
    else:
        print("\nNo results to display.")
    
    print("=" * 70)

if __name__ == '__main__':
    main()
