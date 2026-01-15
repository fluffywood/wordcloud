#!/bin/bash

# =============================================================================
# Live Stream Word Cloud - Development Environment Setup
# =============================================================================
# This script initializes the development environment for the Word Cloud app.
# Run this script to install dependencies and start the development server.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    printf "\n${BLUE}============================================${NC}\n"
    printf "${BLUE}  Live Stream Word Cloud - Setup${NC}\n"
    printf "${BLUE}============================================${NC}\n\n"
}

print_step() {
    printf "${GREEN}[✓]${NC} $1\n"
}

print_warning() {
    printf "${YELLOW}[!]${NC} $1\n"
}

print_error() {
    printf "${RED}[✗]${NC} $1\n"
}

# Print header
print_header

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version is $NODE_VERSION. Version 18+ is recommended."
else
    print_step "Node.js $(node -v) detected"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_step "npm $(npm -v) detected"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_step "Creating .env file with Supabase credentials..."
    cat > .env << 'EOF'
# Supabase Configuration
# These credentials connect to the pre-configured Supabase database
VITE_SUPABASE_URL=https://vmgxvjmgfqrsvxcekrqr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZ3h2am1nZnFyc3Z4Y2VrcnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjk0MzksImV4cCI6MjA3OTk0NTQzOX0.q93acc8gJP7XOV_xaLDeJzsQ8vecqque5Gxb2ycEDSI
EOF
    print_step ".env file created successfully"
else
    print_step ".env file already exists"
fi

# Check if package.json exists (project initialized)
if [ ! -f package.json ]; then
    print_step "Initializing React + Vite project..."
    npm create vite@latest . -- --template react
    print_step "Project initialized"
fi

# Install dependencies
print_step "Installing dependencies..."
npm install

# Install additional required packages if not present
if ! grep -q "@supabase/supabase-js" package.json 2>/dev/null; then
    print_step "Installing Supabase client..."
    npm install @supabase/supabase-js
fi

if ! grep -q "react-wordcloud" package.json 2>/dev/null && ! grep -q "d3-cloud" package.json 2>/dev/null; then
    print_step "Installing word cloud library..."
    npm install react-wordcloud d3-cloud
fi

if ! grep -q "react-hot-toast" package.json 2>/dev/null && ! grep -q "sonner" package.json 2>/dev/null; then
    print_step "Installing toast notifications..."
    npm install react-hot-toast
fi

if ! grep -q "uuid" package.json 2>/dev/null; then
    print_step "Installing UUID generator..."
    npm install uuid
fi

# Install Tailwind CSS if not present
if ! grep -q "tailwindcss" package.json 2>/dev/null; then
    print_step "Installing Tailwind CSS..."
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
fi

print_step "All dependencies installed successfully"

# Print success message and instructions
printf "\n${GREEN}============================================${NC}\n"
printf "${GREEN}  Setup Complete!${NC}\n"
printf "${GREEN}============================================${NC}\n\n"

printf "To start the development server, run:\n"
printf "  ${BLUE}npm run dev${NC}\n\n"

printf "The application will be available at:\n"
printf "  ${BLUE}http://localhost:5173${NC}\n\n"

printf "Supabase Database Info:\n"
printf "  - Tables: submissions, phrase_votes (pre-configured)\n"
printf "  - Real-time: Enabled on both tables\n"
printf "  - RLS: Disabled (fully public access)\n\n"

printf "${YELLOW}Note:${NC} The Supabase database is already set up and ready to use.\n"
printf "No additional database configuration is required.\n\n"

# Optionally start the dev server
if [ "$1" = "--start" ] || [ "$1" = "-s" ]; then
    print_step "Starting development server..."
    npm run dev
fi
