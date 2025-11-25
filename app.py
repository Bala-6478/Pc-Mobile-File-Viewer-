import os
import mimetypes
from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = None # Allow all for now, or define specific if needed

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set max content length to None to allow unlimited file size (dependent on system memory/disk)
app.config['MAX_CONTENT_LENGTH'] = None 

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large'}), 413

def get_file_type(filename):
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        return 'other'
    if mime_type.startswith('image'):
        return 'image'
    if mime_type.startswith('audio'):
        return 'audio'
    if mime_type.startswith('video'):
        return 'video'
    return 'other'

@app.route('/')
def index():
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    categorized_files = {
        'image': [],
        'audio': [],
        'video': [],
        'other': []
    }
    
    for filename in files:
        if filename.startswith('.'): continue # Skip hidden files
        file_type = get_file_type(filename)
        categorized_files[file_type].append(filename)
        
    return render_template('index.html', files=categorized_files)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    files = request.files.getlist('files[]')
    
    saved_files = []
    for file in files:
        if file.filename == '':
            continue
        if file:
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            saved_files.append(filename)
            
    return jsonify({'message': 'Files uploaded successfully', 'files': saved_files})

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    # Run on 0.0.0.0 to be accessible on LAN
    app.run(host='0.0.0.0', port=5000, debug=True)
