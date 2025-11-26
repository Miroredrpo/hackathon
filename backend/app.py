import os
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session, render_template
from dotenv import load_dotenv
from supabase import create_client, Client
from gotrue.errors import AuthApiError
from datetime import datetime, timedelta, timezone

# Load environment variables
load_dotenv()

# Initialize Flask App
app = Flask(__name__,
            static_folder='../frontend/assets',
            template_folder='../frontend',
            static_url_path='/assets')
app.secret_key = os.environ.get('FLASK_SECRET_KEY')

# Initialize Supabase Client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# --- Helpers & Decorators ---

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_email' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def log_audit(action_type, details):
    admin_email = session.get('admin_email', 'unknown')
    try:
        supabase.table('audit_logs').insert({
            'admin_username': admin_email,
            'action_type': action_type,
            'details': details
        }).execute()
    except Exception as e:
        print(f"Error logging audit trail: {e}")


# --- Page Rendering ---

@app.route('/')
def index():
    return render_template('index.html',
                           supabase_url=os.environ.get("SUPABASE_URL"),
                           supabase_anon_key=os.environ.get("SUPABASE_ANON_KEY"))

@app.route('/admin/')
def admin_page():
    return send_from_directory(app.template_folder, 'admin.html')

# --- Admin Authentication API ---

@app.route('/admin/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        session['admin_email'] = response.user.email
        log_audit('admin_login', {'email': email})
        return jsonify({'message': 'Login successful'}), 200
    except AuthApiError as e:
        return jsonify({'error': e.message}), 401
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred.'}), 500

@app.route('/admin/api/auth/logout', methods=['POST'])
@admin_required
def logout():
    email = session.pop('admin_email', None)
    log_audit('admin_logout', {'email': email})
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/admin/api/auth/status', methods=['GET'])
def auth_status():
    if 'admin_email' in session:
        return jsonify({'logged_in': True, 'email': session['admin_email']})
    return jsonify({'logged_in': False})


# --- Admin Data Management API ---

@app.route('/admin/api/teams', methods=['GET', 'POST'])
@admin_required
def manage_teams():
    if request.method == 'GET':
        response = supabase.table('teams').select('*').order('order_index').execute()
        return jsonify(response.data)

    if request.method == 'POST':
        data = request.get_json()

        if 'name' in data:
            new_team = {'name': data['name'], 'visible': data.get('visible', True)}
            response = supabase.table('teams').insert(new_team).execute()
            log_audit('team_add', {'team_name': data['name']})
            return jsonify(response.data), 201

        if 'teams' in data and isinstance(data['teams'], list):
            response = supabase.table('teams').upsert(data['teams']).execute()
            log_audit('teams_update', {'count': len(data['teams'])})
            return jsonify(response.data)

    return jsonify({'error': 'Invalid request'}), 400

@app.route('/admin/api/teams/<team_id>', methods=['DELETE'])
@admin_required
def delete_team(team_id):
    try:
        response = supabase.table('teams').delete().eq('id', team_id).execute()

        if not response.data:
            return jsonify({'error': 'Team not found'}), 404

        log_audit('team_delete', {'team_id': team_id})
        return jsonify({'message': 'Team deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/api/config', methods=['GET', 'POST'])
@admin_required
def manage_config():
    if request.method == 'GET':
        response = supabase.table('event_config').select('*').eq('id', 1).single().execute()
        return jsonify(response.data)

    if request.method == 'POST':
        data = request.get_json()

        if data.get('timer_state') == 'running':
            try:
                config_response = supabase.table('event_config').select('timer_remaining', 'timer_duration_seconds').eq('id', 1).single().execute()
                current_config = config_response.data
                duration_seconds = current_config.get('timer_remaining', current_config.get('timer_duration_seconds', 0))
                ends_at = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)
                data['timer_ends_at'] = ends_at.isoformat()
            except Exception as e:
                return jsonify({'error': f"Error calculating timer end time: {str(e)}"}), 500

        response = supabase.table('event_config').update(data).eq('id', 1).execute()
        log_audit('config_update', {'updated_fields': list(data.keys())})
        return jsonify(response.data)

@app.route('/admin/api/action/play', methods=['POST'])
@admin_required
def play_action():
    data = request.get_json()

    try:
        config_response = supabase.table('event_config').select('action_counter').eq('id', 1).single().execute()
        new_counter = config_response.data['action_counter'] + 1

        update_payload = {
            'action_counter': new_counter,
            'last_action_payload': data
        }

        response = supabase.table('event_config').update(update_payload).eq('id', 1).execute()
        log_audit('action_triggered', data)
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/api/audit', methods=['GET'])
@admin_required
def get_audit_logs():
    response = supabase.table('audit_logs').select('*').order('created_at', desc=True).limit(200).execute()
    return jsonify(response.data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
