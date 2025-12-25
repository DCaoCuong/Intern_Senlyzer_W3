#!/bin/bash
# Quick setup script for Turso migration

echo "🚀 Starting Turso Migration Setup..."
echo ""

# Check if Turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo "❌ Turso CLI not found!"
    echo "📦 Installing Turso CLI..."
    
    # For Windows (PowerShell)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        powershell -Command "irm get.turso.tech/install.ps1 | iex"
    # For Mac/Linux
    else
        curl -sSfL https://get.tur.so/install.sh | bash
    fi
fi

echo "✅ Turso CLI installed"
echo ""

# Login to Turso
echo "🔐 Logging in to Turso..."
turso auth login

echo ""
echo "📝 Please enter your database name (e.g., medical-exam-db):"
read DB_NAME

# Create database
echo "🗄️  Creating Turso database: $DB_NAME"
turso db create $DB_NAME

echo ""
echo "📊 Database created successfully!"
echo ""

# Get database URL
echo "🔗 Getting database URL..."
DATABASE_URL=$(turso db show $DB_NAME --url)

echo ""
echo "🔑 Creating auth token..."
AUTH_TOKEN=$(turso db tokens create $DB_NAME)

echo ""
echo "✅ Setup complete!"
echo ""
echo "================================================"
echo "📋 Your Turso Credentials:"
echo "================================================"
echo ""
echo "TURSO_DATABASE_URL=$DATABASE_URL"
echo "TURSO_AUTH_TOKEN=$AUTH_TOKEN"
echo ""
echo "================================================"
echo ""
echo "📝 Next Steps:"
echo "1. Copy the credentials above"
echo "2. Create .env.local file in your project root"
echo "3. Paste the credentials into .env.local"
echo "4. Run: npm run db:push"
echo "5. Run: npm run dev"
echo ""
echo "🎉 Done!"
