#!/bin/bash
# Festag MVP - Deploy Script

echo "🚀 Deploying Festag MVP to Vercel..."
echo ""

# Git Status
echo "📊 Git Status:"
git status --short
echo ""

# Push zu GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔄 Vercel will automatically deploy the changes"
    echo "🌐 Live URL: https://festag-mvp.vercel.app/"
    echo ""
    echo "⏱️  Deployment usually takes 30-60 seconds..."
else
    echo ""
    echo "❌ Push failed. Please check your GitHub credentials."
    exit 1
fi
