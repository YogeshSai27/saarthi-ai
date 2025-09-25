#!/usr/bin/env python3
"""
Saarthi AI - Flask Backend Application
An empathetic ecosystem to guide India's underserved youth to their first professional opportunity
"""

from flask import Flask, request, jsonify, render_template, send_file
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
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import io

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['SECRET_KEY'] = 'saarthi-ai-secret-key-2024'  # Change in production
app.config['DATABASE'] = 'database.db'

# Global variables
internships_df = None

def init_database():
    """Initialize SQLite database for save & share functionality"""
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Create table for saved search results
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
    
    # Create table for saved resumes
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

def load_internships_data():
    """Load internships data from CSV file"""
    global internships_df
    try:
        internships_df = pd.read_csv('data/internships.csv')
        print(f"✅ Loaded {len(internships_df)} internships from CSV")
        return True
    except Exception as e:
        print(f"❌ Error loading internships data: {e}")
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

# @app.route('/apply-test')
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
        for index, internship in internships_df.iterrows():
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
        
        # Generate shareable link
        share_id = generate_share_link(user_data, top_matches)
        
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

def generate_share_link(user_data, matches):
    """Generate a unique shareable link for search results"""
    try:
        share_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(days=30)  # Link expires in 30 days
        
        conn = sqlite3.connect(app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO saved_results (share_id, user_data, matched_internships, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (share_id, str(user_data), str(matches), expires_at))
        
        conn.commit()
        conn.close()
        
        return share_id
        
    except Exception as e:
        print(f"Error generating share link: {e}")
        return None

@app.route('/api/shared/<share_id>')
def get_shared_results(share_id):
    """Retrieve shared search results"""
    try:
        conn = sqlite3.connect(app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_data, matched_internships, created_at, expires_at
            FROM saved_results 
            WHERE share_id = ? AND expires_at > CURRENT_TIMESTAMP
        ''', (share_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Shared link not found or expired'}), 404
        
        return jsonify({
            'success': True,
            'user_data': eval(result[0]),  # Convert string back to dict
            'matches': eval(result[1]),    # Convert string back to list
            'created_at': result[2],
            'expires_at': result[3]
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve shared results: {str(e)}'}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'internships_loaded': internships_df is not None,
        'total_internships': len(internships_df) if internships_df is not None else 0
    })

# New PDF generation endpoint
@app.route('/api/generate_pdf', methods=['POST'])
def generate_pdf():
    """Generate PDF resume from form data"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        # Prepare PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        styles = getSampleStyleSheet()
        story = []

        # Title (Name)
        title_style = ParagraphStyle(name='Title', parent=styles['Heading1'], fontSize=24, alignment=1)
        story.append(Paragraph(data['name'] or 'Your Name', title_style))
        story.append(Spacer(1, 12))

        # Contact Info
        contact_style = ParagraphStyle(name='Contact', parent=styles['Normal'], fontSize=12, alignment=1)
        contact_parts = []
        if data['github']:
            contact_parts.append(f'<a href="https://github.com/{data["github"]}" color="blue">{data["github"]}</a>')
        if data['linkedin']:
            contact_parts.append(f'<a href="https://linkedin.com/in/{data["linkedin"]}" color="blue">{data["linkedin"]}</a>')
        if data['email']:
            contact_parts.append(f'<a href="mailto:{data["email"]}" color="blue">{data["email"]}</a>')
        if data['phone']:
            contact_parts.append(f'<a href="tel:{data["phone"]}" color="blue">{data["phone"]}</a>')
        if contact_parts:
            story.append(Paragraph(' | '.join(contact_parts), contact_style))
        story.append(Spacer(1, 12))

        # Summary
        if data['summary']:
            summary_style = ParagraphStyle(name='Summary', parent=styles['Normal'], fontSize=12)
            story.append(Paragraph('<b>Summary</b>', summary_style))
            story.append(Paragraph(data['summary'].replace('\n', '<br/>'), summary_style))
            story.append(Spacer(1, 12))

        # Work Experience
        if data['experience']:
            exp_style = ParagraphStyle(name='Experience', parent=styles['Normal'], fontSize=12)
            story.append(Paragraph('<b>Work Experience</b>', exp_style))
            for line in data['experience'].split('\n'):
                if line.strip():
                    story.append(Paragraph(line.strip(), exp_style))
            story.append(Spacer(1, 12))

        # Projects
        if data['projects']:
            proj_style = ParagraphStyle(name='Projects', parent=styles['Normal'], fontSize=12)
            story.append(Paragraph('<b>Projects</b>', proj_style))
            for line in data['projects'].split('\n'):
                if line.strip():
                    link_match = line.split(':')
                    if len(link_match) > 1 and 'GitHub link' in line:
                        title = link_match[0].strip()
                        link_desc = link_match[1].strip()
                        link = link_desc.replace('GitHub link: ', '')
                        story.append(Paragraph(f"{title} <a href='{link}' color='blue'>GitHub link</a>", proj_style))
                    else:
                        story.append(Paragraph(line.strip(), proj_style))
            story.append(Spacer(1, 12))

        # Education
        if data['education']:
            edu_style = ParagraphStyle(name='Education', parent=styles['Normal'], fontSize=12)
            story.append(Paragraph('<b>Education</b>', edu_style))
            for line in data['education'].split('\n'):
                if line.strip():
                    story.append(Paragraph(line.strip(), edu_style))
            story.append(Spacer(1, 12))

        # Skills
        if data['skills']:
            skills_style = ParagraphStyle(name='Skills', parent=styles['Normal'], fontSize=12)
            story.append(Paragraph('<b>Skills</b>', skills_style))
            story.append(Paragraph(', '.join(data['skills'].split(',')), skills_style))

        # Build PDF
        doc.build(story)
        buffer.seek(0)

        return send_file(buffer, as_attachment=True, download_name=f"{data['name'] or 'Resume'}.pdf", mimetype='application/pdf')

    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({'error': 'Failed to generate PDF'}), 500

    # Initialize database
    init_database()
    print("✅ Database initialized")

    
    # Load internships data
    if not load_internships_data():
         raise RuntimeError("Deployment Failed: Could not load data/internships.csv.")
    
# Initialize application
if __name__ == '__main__':
    print("🚀 Starting Saarthi AI Backend...")
    app.run(debug=True, host='0.0.0.0', port=5000)
    