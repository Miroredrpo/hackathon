import os
import getpass
from dotenv import load_dotenv
from supabase import create_client, Client
from werkzeug.security import generate_password_hash

def create_admin_user():
    """
    A command-line script to create a new admin user with a securely hashed password.
    """
    load_dotenv()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not all([url, key]):
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.")
        return

    supabase: Client = create_client(url, key)

    print("Creating a new admin user...")
    username = input("Enter username: ").strip()
    password = getpass.getpass("Enter password: ")
    password_confirm = getpass.getpass("Confirm password: ")

    if not username:
        print("Username cannot be empty.")
        return

    if password != password_confirm:
        print("Passwords do not match.")
        return

    if not password:
        print("Password cannot be empty.")
        return

    # Hash the password
    password_hash = generate_password_hash(password)

    try:
        data, count = supabase.table('admins').insert({
            'username': username,
            'password_hash': password_hash
        }).execute()

        print(f"Successfully created admin user: {username}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_admin_user()
