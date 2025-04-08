import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.utils import secure_filename
import json
import csv
import io
from models import db, Assessment
from utils import allowed_file, process_image, get_model

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key-for-development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure database
# Build PostgreSQL URI from environment variables
db_user = os.environ.get("PGUSER", "postgres")
db_password = os.environ.get("PGPASSWORD", "")
db_host = os.environ.get("PGHOST", "localhost")
db_port = os.environ.get("PGPORT", "5432")
db_name = os.environ.get("PGDATABASE", "postgres")

# Use DATABASE_URL if available, otherwise construct from parts
if os.environ.get("DATABASE_URL"):
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Initialize extensions
db.init_app(app)

# Ensure model is loaded
model = None

# Initialize
with app.app_context():
    # Create database tables
    db.create_all()
    # Load PyTorch model
    model = get_model()
    logging.info("Model loaded successfully")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/catalog')
def catalog():
    return render_template('catalog.html')

@app.route('/statistics')
def statistics():
    return render_template('statistics.html')

@app.route('/search')
def search():
    return render_template('search.html')

@app.route('/guide')
def guide():
    return render_template('guide.html')

@app.route('/author')
def author():
    return render_template('author.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file part', 'danger')
        return redirect(request.url)
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No selected file', 'danger')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Process the image with the model
            result = process_image(file_path, model)
            
            # Save assessment to database
            assessment = Assessment(
                filename=filename,
                component_type=result['component_type'],
                quality_score=result['quality_score'],
                reusable=result['reusable'],
                confidence=result['confidence'],
                assessment_date=datetime.now()
            )
            db.session.add(assessment)
            db.session.commit()
            
            # Store the assessment ID in session for redirect
            session['last_assessment_id'] = assessment.id
            
            flash('Assessment completed successfully!', 'success')
            return redirect(url_for('results', assessment_id=assessment.id))
        
        except Exception as e:
            logging.error(f"Error processing image: {str(e)}")
            flash(f'Error processing image: {str(e)}', 'danger')
            return redirect(url_for('index'))
    else:
        flash('File type not allowed. Please upload an image (PNG, JPG, JPEG).', 'danger')
        return redirect(url_for('index'))

@app.route('/results/<int:assessment_id>')
def results(assessment_id):
    assessment = Assessment.query.get_or_404(assessment_id)
    return render_template('results.html', assessment=assessment)

@app.route('/api/assessments')
def get_assessments():
    # Get query parameters for filtering
    component_type = request.args.get('component_type')
    min_quality = request.args.get('min_quality')
    reusable = request.args.get('reusable')
    sort_by = request.args.get('sort_by', 'assessment_date')
    sort_order = request.args.get('sort_order', 'desc')
    
    # Build query
    query = Assessment.query
    
    if component_type:
        query = query.filter(Assessment.component_type == component_type)
    
    if min_quality:
        query = query.filter(Assessment.quality_score >= float(min_quality))
    
    if reusable in ['true', 'false']:
        query = query.filter(Assessment.reusable == (reusable == 'true'))
    
    # Apply sorting
    # Handle the case when sort_by doesn't exist or has an invalid value
    if hasattr(Assessment, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(Assessment, sort_by).asc())
        else:
            query = query.order_by(getattr(Assessment, sort_by).desc())
    else:
        # Default to assessment_date if the requested sort column doesn't exist
        query = query.order_by(Assessment.assessment_date.desc())
    
    # Execute query and format results
    assessments = query.all()
    result = []
    
    for a in assessments:
        result.append({
            'id': a.id,
            'filename': a.filename,
            'component_type': a.component_type,
            'quality_score': a.quality_score,
            'reusable': a.reusable,
            'confidence': a.confidence,
            'assessment_date': a.assessment_date.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify(result)

@app.route('/api/stats')
def get_stats():
    # Get total count
    total_count = Assessment.query.count()
    
    # Get counts by component type
    component_types = db.session.query(
        Assessment.component_type, 
        db.func.count(Assessment.id)
    ).group_by(Assessment.component_type).all()
    
    # Get reusable vs non-reusable
    reusable_count = Assessment.query.filter_by(reusable=True).count()
    non_reusable_count = total_count - reusable_count
    
    # Get average quality by component type
    avg_quality = db.session.query(
        Assessment.component_type,
        db.func.avg(Assessment.quality_score)
    ).group_by(Assessment.component_type).all()
    
    # Format results
    result = {
        'total_assessments': total_count,
        'component_type_counts': {t[0]: t[1] for t in component_types},
        'reusability': {
            'reusable': reusable_count,
            'non_reusable': non_reusable_count
        },
        'average_quality': {t[0]: float(t[1]) for t in avg_quality}
    }
    
    return jsonify(result)

@app.route('/api/download-report')
def download_report():
    format_type = request.args.get('format', 'csv')
    
    # Get all assessments
    assessments = Assessment.query.all()
    
    if format_type == 'json':
        # Create JSON data
        data = []
        for a in assessments:
            data.append({
                'id': a.id,
                'filename': a.filename,
                'component_type': a.component_type,
                'quality_score': a.quality_score,
                'reusable': a.reusable,
                'confidence': a.confidence,
                'assessment_date': a.assessment_date.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        # Create in-memory buffer
        buffer = io.StringIO()
        json.dump(data, buffer)
        buffer.seek(0)
        
        return send_file(
            io.BytesIO(buffer.getvalue().encode()),
            mimetype='application/json',
            as_attachment=True,
            download_name='ewaste_assessment_report.json'
        )
    
    else:  # Default to CSV
        # Create CSV data
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        
        # Write header
        writer.writerow(['ID', 'Filename', 'Component Type', 'Quality Score', 
                        'Reusable', 'Confidence', 'Assessment Date'])
        
        # Write data
        for a in assessments:
            writer.writerow([
                a.id,
                a.filename,
                a.component_type,
                a.quality_score,
                a.reusable,
                a.confidence,
                a.assessment_date.strftime('%Y-%m-%d %H:%M:%S')
            ])
        
        buffer.seek(0)
        
        return send_file(
            io.BytesIO(buffer.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name='ewaste_assessment_report.csv'
        )

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
