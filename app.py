#!/usr/bin/env python3
"""
Saarthi AI - Flask Backend Application
An empathetic ecosystem to guide India's underserved youth to their first professional opportunity
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import sqlite3
import hashlib
import uuid
from datetime import datetime, timedelta
import os
from fuzzywuzzy import fuzz
import math
import jwt
import logging
import sys

# -----------------------------
# Setup logging for Render
# -----------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.propagate = False

# -----------------------------
# Initialize Flask app
# -----------------------------
app = Flask(__name__)
CORS(app)

# -----------------------------
# Configuration
# -----------------------------
app.config['SECRET_KEY'] = 'saarthi-ai-secret-key-2024'
app.config['DATABASE'] = 'database.db'

# -----------------------------
# Global variables
# -----------------------------
internships_df = None

# -----------------------------
# Database initialization
# -----------------------------
def init_database():
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saved_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            share_id TEXT UNIQUE NOT NULL,
            user_data TEXT NOT NULL,
            matched_internships TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saved_resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resume_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            resume_data TEXT NOT NULL,
            internship_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized")

# -----------------------------
# Load internships CSV
# -----------------------------
def load_internships_data():
    global internships_df

    # Absolute path detection
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(BASE_DIR, "data", "internships.csv")

    # Logging for Render
    print(f"DEBUG: CSV path: {file_path}")
    print(f"DEBUG: File exists? {os.path.exists(file_path)}")

    if not os.path.exists(file_path):
        logger.error("❌ ERROR: internships.csv not found. Exiting...")
        return False

    try:
        internships_df = pd.read_csv(file_path)
        print(f"✅ Loaded {len(internships_df)} internships")
        return True
    except Exception as e:
        logger.error(f"❌ Error loading internships data: {e}")
        return False

# -----------------------------
# Haversine distance
# -----------------------------
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# -----------------------------
# Matching score
# -----------------------------
def calculate_match_score(user_profile, internship):
    score = 0
    explanations = []
    pro_tips = []

    # Education
    if user_profile.get('education', '').lower() in internship['Min_Qualification'].lower():
        score += 20
        explanations.append(f"Your {user_profile.get('education')} qualification matches perfectly")

    # Interests
    user_interests = user_profile.get('interests', [])
    if isinstance(user_interests, str):
        user_interests = [user_interests]
    for interest in user_interests:
        if fuzz.partial_ratio(interest.lower(), internship['Sector_Interest'].lower()) > 70:
            score += 25
            explanations.append(f"Suggested because you're interested in {interest}")
            break

    # Skills
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

    # Location
    if user_profile.get('preferred_location'):
        user_coords = get_location_coordinates(user_profile['preferred_location'])
        if user_coords:
            internship_coords = internship['Location_Coordinates'].split('|')
            distance = calculate_distance(
                float(user_coords[0]), float(user_coords[1]),
                float(internship_coords[0]), float(internship_coords[1])
            )
            if distance < 50:
                score += 15
                explanations.append("Located conveniently near your preferred area")
            elif distance < 200:
                score += 10
                explanations.append("Reasonable commuting distance from your location")

    # Role-based tips
    role_title_lower = internship['Role_Title'].lower()
    if 'data' in role_title_lower or 'analyst' in role_title_lower:
        pro_tips.append("Pro Tip: Advanced Excel & basic Python skills recommended")
    elif 'marketing' in role_title_lower:
        pro_tips.append("Pro Tip: Build a social media portfolio")
    elif 'banking' in role_title_lower or 'financial' in role_title_lower:
        pro_tips.append("Pro Tip: Know banking regulations & Excel")
    elif 'technology' in role_title_lower or 'digital' in role_title_lower:
        pro_tips.append("Pro Tip: Familiarity with digital trends & basic coding")
    elif 'research' in role_title_lower:
        pro_tips.append("Pro Tip: Research methodology & report writing skills essential")

    return score, explanations, pro_tips

# -----------------------------
# Coordinates
# -----------------------------
def get_location_coordinates(location_name):
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

# -----------------------------
# Routes
# -----------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/resume-builder')
def resume_builder():
    return render_template('resume_builder.html')

@app.route('/api/search', methods=['POST'])
def search_internships():
    try:
        user_data = request.json
        required_fields = ['education', 'interests', 'location']
        for field in required_fields:
            if field not in user_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        if internships_df is None:
            logger.error("Internships data not loaded")
            return jsonify({'error': 'Internships data not loaded'}), 500

        matches = []
        for index, internship in internships_df.iterrows():
            score, explanations, pro_tips = calculate_match_score(user_data, internship)
            if score > 10:
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

        matches.sort(key=lambda x: x['match_score'], reverse=True)
        top_matches = matches[:5]

        return jsonify({'success': True, 'matches': top_matches, 'total_matches': len(matches)})

    except Exception as e:
        logger.error(f"Search failed: {e}")
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

# -----------------------------
# App start
# -----------------------------
if __name__ == '__main__':
    logger.info("🚀 Starting Saarthi AI Backend...")
    init_database()

    if not load_internships_data():
        logger.error("❌ Failed to load internships CSV. Exiting.")
        exit(1)

    logger.info("✅ Ready to serve recommendations!")
    app.run(debug=True, host='0.0.0.0', port=5000)
