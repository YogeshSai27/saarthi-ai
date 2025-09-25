#!/usr/bin/env python3
"""
Saarthi AI - Flask Backend Application
An empathetic ecosystem to guide India's underserved youth to their first professional opportunity
"""

from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import pandas as pd
import uuid
from datetime import datetime, timedelta
import os # <-- REQUIRED for robust pathing
from fuzzywuzzy import fuzz
import math

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['SECRET_KEY'] = 'saarthi-ai-secret-key-2024'  # Change in production

# Global variables
internships_df = None

def load_internships_data():
    """Load internships data from CSV file using a robust path"""
    global internships_df
    try:
        # Get the absolute directory path where the current file (app.py) is located
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Construct the absolute path: <base_dir>/data/internships.csv
        csv_path = os.path.join(base_dir, 'data', 'internships.csv')
        
        internships_df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(internships_df)} internships from CSV at {csv_path}")
        return True
    except Exception as e:
        # CRITICAL for debugging: This will print the exact path failure in Render logs
        print(f"❌ FATAL Error loading data. Tried path: {csv_path}. Error: {e}")
        return False

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def calculate_match_score(user_profile, internship):
    """Calculate matching score between user profile and internship"""
    score = 0
    explanations = []
    pro_tips = []
    
    # Education level match (20 points)
    if user_profile.get('education', '').lower() in internship['Min_Qualification'].lower():
        score += 20
        explanations.append(f"Your {user_profile.get('education')} qualification matches perfectly")
    
    # Sector interest match (25 points)
    user_interests = user_profile.get('interests', [])
    if isinstance(user_interests, str):
        user_interests = [user_interests]
    
    sector_match = False
    for interest in user_interests:
        if fuzz.partial_ratio(interest.lower(), internship['Sector_Interest'].lower()) > 70:
            score += 25
            explanations.append(f"Suggested because you're interested in {interest}")
            sector_match = True
            break
    
    # Skills match (25 points)
    user_skills = user_profile.get('skills', [])
    if isinstance(user_skills, str):
        user_skills = user_skills.split(',')
    
    internship_skills = internship['Suggested_Skills'].split('|')
    skill_matches = []
    
    for user_skill in user_skills:
        for req_skill in internship_skills:
            if fuzz.partial_ratio(user_skill.strip().lower(), req_skill.strip().lower()) > 80:
                score += 10
                skill_matches.append(req_skill.strip())
    
    if skill_matches:
        explanations.append(f"Your skills in {', '.join(skill_matches[:2])} are valuable here")
    
    # Location proximity (15 points max)
    if user_profile.get('preferred_location'):
        user_coords = get_location_coordinates(user_profile['preferred_location'])
        if user_coords:
            internship_coords = internship['Location_Coordinates'].split('|')
            distance = calculate_distance(
                float(user_coords[0]), float(user_coords[1]),
                float(internship_coords[0]), float(internship_coords[1])
            )
            
            if distance < 50:  # Within 50km
                score += 15
                explanations.append("Located conveniently near your preferred area")
            elif distance < 200:  # Within 200km
                score += 10
                explanations.append("Reasonable commuting distance from your location")
    
    # Generate pro tips based on role requirements
    role_title_lower = internship['Role_Title'].lower()
    if 'data' in role_title_lower or 'analyst' in role_title_lower:
        pro_tips.append("Pro Tip: This role often requires Advanced Excel and basic Python skills")
    elif 'marketing' in role_title_lower:
        pro_tips.append("Pro Tip: Building a portfolio of social media campaigns will strengthen your application")
    elif 'banking' in role_title_lower or 'financial' in role_title_lower:
        pro_tips.append("Pro Tip: Basic knowledge of banking regulations and Excel is highly valued")
    elif 'technology' in role_title_lower or 'digital' in role_title_lower:
        pro_tips.append("Pro Tip: Familiarity with current digital trends and basic coding helps")
    elif 'research' in role_title_lower:
        pro_tips.append("Pro Tip: Research methodology knowledge and report writing skills are essential")
    
    return score, explanations, pro_tips

def get_location_coordinates(location_name):
    """Get coordinates for major Indian cities (simplified mapping)"""
    city_coords = {
        'delhi': [28.6139, 77.2090],
        'mumbai': [19.0760, 72.8777],
        'bangalore': [12.9716, 77.5946],
        'bengaluru': [12.9716, 77.5946],
        'chennai': [13.0827, 80.2707],
        'hyderabad': [17.3850, 78.4867],
        'pune': [18.5204, 73.8567],
        'kolkata': [22.5726, 88.3639],
        'ahmedabad': [23.0225, 72.5714],
        'jaipur': [26.9124, 75.7873],
        'lucknow': [26.8467, 80.9462],
        'bhopal': [23.2599, 77.4126],
        'chandigarh': [30.7333, 76.7794],
        'gurgaon': [28.4595, 77.0266],
        'gurugram': [28.4595, 77.0266],
        'dehradun': [30.3165, 78.0322]
    }
    
    location_lower = location_name.lower().strip()
    for city, coords in city_coords.items():
        if city in location_lower:
            return coords
    return None

# @app.route('/apply-test') - Route commented out
# def apply_test():
#     return render_template('apply-test.html')

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/resume-builder')
def resume_builder():
    """Serve the resume builder page"""
    return render_template('resume_builder.html')

@app.route('/api/search', methods=['POST'])
def search_internships():
    """Main API endpoint for internship recommendations"""
    try:
        user_data = request.json
        
        # Validate required fields
        required_fields = ['education', 'interests', 'location']
        for field in required_fields:
            if field not in user_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Calculate match scores for all internships
        matches = []
        for index, internship in internships_df.iterrows(): # <-- Now safe because internships_df is loaded
            score, explanations, pro_tips = calculate_match_score(user_data, internship)
            
            if score > 10:  # Only include reasonable matches
                match = {
                    'id': index,
                    'role_title': internship['Role_Title'],
                    'company': internship['Company'],
                    'location': internship['Location'],
                    'sector': internship['Sector_Interest'],
                    'duration': f"{internship['Duration_Months']} months",
                    'stipend': f"₹{internship['Stipend_Amount']:,}",
                    'description': internship['Description'],
                    'deadline': internship['Application_Deadline'],
                    'required_skills': internship['Suggested_Skills'].split('|'),
                    'min_qualification': internship['Min_Qualification'],
                    'match_score': score,
                    'explanations': explanations,
                    'pro_tips': pro_tips,
                    'coordinates': internship['Location_Coordinates']
                }
                matches.append(match)
        
        # Sort by match score and return top 5
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        top_matches = matches[:5]
        
        # Placeholder for share_id generation (removed DB dependency)
        # share_id = generate_share_link(user_data, top_matches) 
        share_id = str(uuid.uuid4()) 
        
        return jsonify({
            'success': True,
            'matches': top_matches,
            'total_matches': len(matches),
            'share_id': share_id
        })
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@app.route('/api/internship/<int:internship_id>')
def get_internship_details(internship_id):
    """Get detailed information about a specific internship"""
    try:
        if internship_id >= len(internships_df):
            return jsonify({'error': 'Internship not found'}), 404
            
        internship = internships_df.iloc[internship_id]
        
        details = {
            'id': internship_id,
            'role_title': internship['Role_Title'],
            'company': internship['Company'],
            'location': internship['Location'],
            'sector': internship['Sector_Interest'],
            'duration': f"{internship['Duration_Months']} months",
            'stipend': f"₹{internship['Stipend_Amount']:,}",
            'description': internship['Description'],
            'deadline': internship['Application_Deadline'],
            'required_skills': internship['Suggested_Skills'].split('|'),
            'min_qualification': internship['Min_Qualification'],
            'coordinates': internship['Location_Coordinates']
        }
        
        return jsonify(details)
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch internship: {str(e)}'}), 500

# Removed all /api/shared/<share_id> and database functions

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'internships_loaded': internships_df is not None,
        'total_internships': len(internships_df) if internships_df is not None else 0
    })

# Removed the entire /api/generate_pdf route

# ----------------------------------------------------------------------
# DEPLOYMENT FIX: Initialize Data on Module Load (Outside __main__)
# ----------------------------------------------------------------------

# Load internships data - This runs immediately when Gunicorn imports app.py
if not load_internships_data():
    # If loading fails, crash the deployment with a clear error
    raise RuntimeError("Deployment Failed: Could not load data/internships.csv.")

# Print is for Render logs
print("✅ Ready to serve recommendations!")

# Original if __name__ block (Only for local development)
if __name__ == '__main__':
    # This block is only for when you run 'python app.py' locally
    app.run(debug=True, host='0.0.0.0', port=5000)

# END OF FILE