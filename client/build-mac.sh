#!/bin/bash

# Exit on error
set -e

echo "Starting Build for macOS..."

# 1. Standard Build (Vite + Electron Builder)
echo "Running npm run build..."
# We use standard build first to generate app.asar and assets
# electron-builder will generate a broken .app on Apple Silicon, but we only need the content
npm run build

# 2. Fix Bundle (The Apple Silicon Fix)
echo "Applying Apple Silicon Crash Fix..."

SRC_APP="dist/mac-arm64/İmtahan Mərkəzi.app"
DEST_APP="dist/mac-arm64/ExamClient.app"
ELECTRON_DIST="node_modules/electron/dist/Electron.app"

if [ ! -d "$ELECTRON_DIST" ]; then
    echo "Error: Electron bundle not found at $ELECTRON_DIST"
    exit 1
fi

if [ -d "$DEST_APP" ]; then
    echo "Removing previous fixed app..."
    rm -rf "$DEST_APP"
fi

echo "Reconstructing app from clean Electron bundle..."
cp -R "$ELECTRON_DIST" "$DEST_APP"

echo "Copying app resources (app.asar, icon)..."
if [ -f "$SRC_APP/Contents/Resources/app.asar" ]; then
    cp "$SRC_APP/Contents/Resources/app.asar" "$DEST_APP/Contents/Resources/app.asar"
else
    echo "Error: app.asar not found in $SRC_APP"
    exit 1
fi

if [ -f "$SRC_APP/Contents/Resources/icon.icns" ]; then
    cp "$SRC_APP/Contents/Resources/icon.icns" "$DEST_APP/Contents/Resources/icon.icns"
fi

echo "Configuring Info.plist..."
cp "$SRC_APP/Contents/Info.plist" "$DEST_APP/Contents/Info.plist"

# Update Executable name in Info.plist to match what we will rename the binary to
# Using PlistBuddy which is built-in on macOS
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable ExamClient" "$DEST_APP/Contents/Info.plist" || {
    # Fallback if PlistBuddy fails or key doesn't exist (though it should since we copied it)
    echo "Warning: PlistBuddy failed, trying sed..."
    sed -i '' 's/>Electron</>ExamClient</' "$DEST_APP/Contents/Info.plist"
    sed -i '' 's/>İmtahan Mərkəzi</>ExamClient</' "$DEST_APP/Contents/Info.plist"
}

echo "Renaming Executable..."
mv "$DEST_APP/Contents/MacOS/Electron" "$DEST_APP/Contents/MacOS/ExamClient"

# 3. Sign
echo "Signing Application..."
# Ensure sign-app.sh is executable
chmod +x sign-app.sh
./sign-app.sh

echo "------------------------------------------------"
echo "Build Complete! ✅"
echo "App is located at: $DEST_APP"
echo "To run: open \"$DEST_APP\""
echo "------------------------------------------------"
