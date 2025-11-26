# Hackathon Event Display

This is a full-stack web application designed for hackathons and similar events. It provides a public display with a timer, team list, and event notes, all updated in real-time. A hidden admin panel allows for complete control over the event's state.

## Features

- **Public Display:** A clean, responsive interface with a large timer, a list of teams, and an event note area.
- **Real-time Updates:** All changes made in the admin panel are reflected on the public display instantly without needing a page refresh, powered by Supabase Realtime.
- **Three.js Background:** A subtle, animated particle background for a visually pleasing effect.
- **Hidden Admin Panel:** A secure admin area at `/admin/` to control the application.
- **Full Event Control:**
    - **Timer:** Start, pause, reset, and set the duration of the event timer.
    - **Teams:** Add, remove, and manage the list of participating teams.
    - **Event Note:** Update a persistent note visible to all participants.
    - **Actions:** Trigger a sound alert or a text-to-speech message on all public displays.
    - **Layout Customization:** Drag-and-drop positioning for the main UI elements.
- **Audit Log:** All admin actions are logged for accountability.

## Tech Stack

- **Backend:** Python 3.11+ with Flask
- **Frontend:** HTML, TailwindCSS, jQuery, Three.js
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase Realtime

## Setup and Installation

### 1. Supabase Project

1.  **Create a Supabase Project:** Go to [supabase.com](https://supabase.com), create a new project, and save your project URL, `anon` key, and `service_role` key.
2.  **Run the SQL Script:** In the Supabase dashboard, go to the "SQL Editor" and run the contents of the `schema.sql` file provided in this repository. This will create all the necessary tables.
3.  **Create an Admin User:**
    - In your Supabase project dashboard, go to the "Authentication" section.
    - Click on "Users" and then click the "Add user" button.
    - Enter the email and a secure password for your admin user. This is the account you will use to log in to the admin panel.
    - **Important:** By default, Supabase requires users to confirm their email address. For this admin panel to work, you must either:
        - Click the confirmation link sent to the admin's email address.
        - Or, disable the "Confirm email" requirement in your Supabase project's `Authentication -> Providers -> Email` settings.
4.  **Disable RLS (as per requirements):** For this project, Row Level Security is not used. You can ensure it's disabled on your tables under Authentication -> Policies.

### 2. Local Development

1.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-url>
    ```

2.  **Set Up Backend:**
    - Navigate to the `backend` directory.
    - Create a virtual environment:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    - Install dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    - Create a `.env` file in the `backend` directory by copying `.env.example`.
    - Fill in the `.env` file with your Supabase credentials and a secret key for Flask:
        ```
        SUPABASE_URL=your_supabase_url
        SUPABASE_ANON_KEY=your_supabase_anon_key
        SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
        FLASK_SECRET_KEY=a_very_strong_and_random_secret_key
        ```

3.  **Run the Application:**
    - From the `backend` directory, run the Flask app:
        ```bash
        python app.py
        ```
    - The application will be available at `http://127.0.0.1:5000`.
    - The admin panel is at `http://127.0.0.1:5000/admin/`.

## Deployment to Render

This application can be easily deployed on Render as a single web service.

1.  **Prepare your Repository:** Push your code to a GitHub repository.

2.  **Create a New Web Service on Render:**
    - In your Render dashboard, click "New +" and select "Web Service".
    - Connect your GitHub repository.

3.  **Configure the Service:**
    - **Name:** Choose a name for your service (e.g., `hackathon-display`).
    - **Root Directory:** Leave this blank if your `requirements.txt` is in the root, otherwise you might need to adjust. For this project structure, you'll need a build script.
    - **Runtime:** Select `Python 3`.
    - **Build Command:**
        ```bash
        pip install -r backend/requirements.txt
        ```
    - **Start Command:** Since the app needs to be run from the `backend` directory, use Gunicorn for a production-ready setup.
        ```bash
        gunicorn --chdir backend app:app
        ```
    - **Environment Variables:**
        - Go to the "Environment" tab.
        - Add the same key-value pairs from your local `.env` file:
            - `SUPABASE_URL`
            - `SUPABASE_ANON_KEY`
            - `SUPABASE_SERVICE_ROLE_KEY`
            - `FLASK_SECRET_KEY` (use a new, strong secret here)
            - `PYTHON_VERSION` (set to `3.11` or your desired version)

4.  **Deploy:**
    - Click "Create Web Service". Render will pull your code, install dependencies, and start the application.
    - Once deployed, your application will be live at the URL provided by Render.

## Browser Permissions for Audio

- Modern web browsers restrict audio playback until the user has interacted with the page (e.g., a click or tap).
- The application will attempt to play sounds when an action is triggered. If it fails, a warning is logged in the console.
- For a live event, it's recommended to have the operator of the admin panel click anywhere on the public display page once to enable audio context before the event starts.
