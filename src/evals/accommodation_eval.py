"""
Evaluation functions for Accommodation Agent
Checks availability, photo quality, and data completeness
"""

import json
import re
from typing import Dict, Any, List

def placeholder_patterns():
    """Return list of regex patterns for placeholder URLs"""
    return [
        re.compile(r'placeholder', re.IGNORECASE),
        re.compile(r'photo\d+\.jpg$', re.IGNORECASE),
        re.compile(r'photo\d+\.jpeg$', re.IGNORECASE),
        re.compile(r'photo\d+\.png$', re.IGNORECASE),
        re.compile(r'image\d+\.jpg$', re.IGNORECASE),
        re.compile(r'/\d{4}/photo\d+\.', re.IGNORECASE),
        re.compile(r'/placeholder\d+\.', re.IGNORECASE),
    ]

def check_availability(output: Dict[str, Any]) -> Dict[str, Any]:
    """Check if all accommodations are available"""
    options = output.get('options', [])
    total_count = len(options)
    available_count = sum(
        1 for opt in options 
        if opt.get('availability', {}).get('available') == True
    )
    
    return {
        'all_available': available_count == total_count and total_count >= 3,
        'available_count': available_count,
        'total_count': total_count
    }

def check_photo_quality(output: Dict[str, Any]) -> Dict[str, Any]:
    """Check photo URL quality - no placeholders"""
    patterns = placeholder_patterns()
    total_photos = 0
    placeholder_count = 0
    valid_count = 0
    
    for option in output.get('options', []):
        for photo_url in option.get('photos', []):
            if not photo_url or not isinstance(photo_url, str):
                continue
            
            total_photos += 1
            is_placeholder = any(p.search(photo_url) for p in patterns)
            has_valid_ext = bool(re.search(r'\.(jpg|jpeg|png|webp|gif)(\?|$)', photo_url, re.IGNORECASE))
            has_valid_domain = bool(re.search(r'^https?://(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[a-zA-Z]{2,}', photo_url))
            
            if is_placeholder:
                placeholder_count += 1
            elif has_valid_ext and has_valid_domain:
                valid_count += 1
    
    return {
        'has_placeholders': placeholder_count > 0,
        'placeholder_count': placeholder_count,
        'total_photos': total_photos,
        'valid_photos': valid_count
    }

def check_completeness(output: Dict[str, Any]) -> Dict[str, Any]:
    """Check data completeness (availability field is optional)"""
    required_fields = [
        'id', 'name', 'address', 'type',
        'pricePerPerson', 'totalPrice',
        'proximityToSlopes'
    ]
    
    missing_fields = []
    complete_count = 0
    
    for idx, option in enumerate(output.get('options', [])):
        option_missing = []
        
        for field in required_fields:
            if field not in option or option[field] is None:
                option_missing.append(f'options[{idx}].{field}')
        
        if not option_missing:
            complete_count += 1
        else:
            missing_fields.extend(option_missing)
    
    return {
        'is_complete': complete_count == len(output.get('options', [])) and len(output.get('options', [])) >= 3,
        'missing_fields': missing_fields,
        'complete_count': complete_count
    }

def evaluate_accommodation_agent(output: Dict[str, Any]) -> Dict[str, Any]:
    """Main evaluation function"""
    photo_quality = check_photo_quality(output)
    completeness = check_completeness(output)
    
    # Calculate scores (availability check removed)
    photo_score = 1.0 if photo_quality['total_photos'] == 0 else photo_quality['valid_photos'] / photo_quality['total_photos']
    completeness_score = 1.0 if completeness['is_complete'] else completeness['complete_count'] / 3.0
    
    # Weighted average (50% photo quality, 50% completeness)
    overall_score = (photo_score * 0.5) + (completeness_score * 0.5)
    
    return {
        'score': overall_score,
        'details': {
            'photo_quality': photo_quality,
            'completeness': completeness
        }
    }


