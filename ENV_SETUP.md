# Environment Variables Setup

## Required: Create .env file in backend directory

Create a file named `.env` in the `backend/` directory with the following content:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

## How to Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (NOT anon key) → `SUPABASE_SERVICE_ROLE_KEY`

## How to Generate JWT_SECRET

You can use any of these methods:

### Option 1: Online Generator

Go to: https://generate-secret.vercel.app/32

### Option 2: OpenSSL (if installed)

```bash
openssl rand -base64 32
```

### Option 3: Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## After Creating .env

1. Save the file
2. Make sure backend server is stopped
3. Start backend again:
   ```bash
   cd backend
   npm run dev
   ```

## Security Note

**DO NOT** commit the `.env` file to Git. It should already be in `.gitignore`.

## Verify Setup

After starting the backend, you should see:

```
🚀 Server running on port 5000
📊 Environment: development
🔗 Health check: http://localhost:5000/health
```

If you see "Missing Supabase configuration" error, check that:

1. `.env` file exists in `backend/` directory
2. All required variables are set
3. No trailing spaces in the values
