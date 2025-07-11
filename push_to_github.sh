#!/bin/bash

echo "Pushing Call Retriever to GitHub..."

# Set the remote with embedded token
git remote set-url origin https://chrisklop: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@github.com/chrisklop/FP_Call_Retriever.git

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "Repository URL: https://github.com/chrisklop/FP_Call_Retriever"
else
    echo "❌ Push failed. Try manual authentication."
fi