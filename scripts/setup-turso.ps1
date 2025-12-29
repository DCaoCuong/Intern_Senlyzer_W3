# Quick setup script for Turso migration (Windows PowerShell)

Write-Host "🚀 Starting Turso Migration Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if Turso CLI is installed
try {
    $null = turso --version
    Write-Host "✅ Turso CLI already installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Turso CLI not found!" -ForegroundColor Red
    Write-Host "📦 Installing Turso CLI..." -ForegroundColor Yellow
    
    irm get.turso.tech/install.ps1 | iex
    
    Write-Host "✅ Turso CLI installed" -ForegroundColor Green
}

Write-Host ""

# Login to Turso
Write-Host "🔐 Logging in to Turso..." -ForegroundColor Cyan
turso auth login

Write-Host ""
$DB_NAME = Read-Host "📝 Please enter your database name (e.g., medical-exam-db)"

# Create database
Write-Host "🗄️  Creating Turso database: $DB_NAME" -ForegroundColor Cyan
turso db create $DB_NAME

Write-Host ""
Write-Host "📊 Database created successfully!" -ForegroundColor Green
Write-Host ""

# Get database URL
Write-Host "🔗 Getting database URL..." -ForegroundColor Cyan
$DATABASE_URL = turso db show $DB_NAME --url

Write-Host ""
Write-Host "🔑 Creating auth token..." -ForegroundColor Cyan
$AUTH_TOKEN = turso db tokens create $DB_NAME

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "📋 Your Turso Credentials:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "TURSO_DATABASE_URL=$DATABASE_URL" -ForegroundColor White
Write-Host "TURSO_AUTH_TOKEN=$AUTH_TOKEN" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Offer to create .env.local file
$createEnv = Read-Host "Would you like to create .env.local file automatically? (y/n)"

if ($createEnv -eq "y" -or $createEnv -eq "Y") {
    $envContent = @"
# Turso Database Configuration
TURSO_DATABASE_URL=$DATABASE_URL
TURSO_AUTH_TOKEN=$AUTH_TOKEN

# Google AI API Key (add your key here)
# GOOGLE_AI_API_KEY=your_google_api_key_here
"@
    
    Set-Content -Path ".env.local" -Value $envContent
    Write-Host "✅ .env.local file created!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. ✅ Credentials are displayed above" -ForegroundColor White
if ($createEnv -ne "y" -and $createEnv -ne "Y") {
    Write-Host "2. Create .env.local file in your project root" -ForegroundColor White
    Write-Host "3. Paste the credentials into .env.local" -ForegroundColor White
}
Write-Host "2. Run: npx drizzle-kit push" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
