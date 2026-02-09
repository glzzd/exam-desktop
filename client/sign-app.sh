#!/bin/bash

APP_PATH="dist/mac-arm64/ExamClient.app"
ENTITLEMENTS="entitlements.mac.plist"

echo "Deep signing with entitlements (Hardened Runtime enabled): $ENTITLEMENTS"

# Function to sign executables (with entitlements)
sign_file() {
  echo "Signing Executable: $1"
  codesign --force --sign - --entitlements "$ENTITLEMENTS" "$1"
}

# Function to sign libraries/frameworks (NO entitlements)
sign_lib() {
  echo "Signing Library: $1"
  codesign --force --sign - "$1"
}

# 1. Sign specific libraries inside Electron Framework
find "$APP_PATH/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries" -type f -name "*.dylib" | while read file; do
  sign_lib "$file"
done

# 2. Sign the Electron Framework binary itself (It is a library-like framework binary, usually no entitlements needed, OR it needs them?)
# Electron Framework binary is technically a dylib in macOS structure.
sign_lib "$APP_PATH/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"

# 2b. Sign chrome_crashpad_handler (executable inside framework)
sign_file "$APP_PATH/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers/chrome_crashpad_handler"

# 3. Sign Helper App Executables (These need entitlements)
sign_file "$APP_PATH/Contents/Frameworks/Electron Helper.app/Contents/MacOS/Electron Helper"
sign_file "$APP_PATH/Contents/Frameworks/Electron Helper (GPU).app/Contents/MacOS/Electron Helper (GPU)"
sign_file "$APP_PATH/Contents/Frameworks/Electron Helper (Renderer).app/Contents/MacOS/Electron Helper (Renderer)"
sign_file "$APP_PATH/Contents/Frameworks/Electron Helper (Plugin).app/Contents/MacOS/Electron Helper (Plugin)"

# 4. Sign Framework Bundles (wrapper)
find "$APP_PATH/Contents/Frameworks" -type d -name "*.framework" | while read dir; do
  sign_lib "$dir"
done

# 5. Sign Main Executable
sign_file "$APP_PATH/Contents/MacOS/ExamClient"

# 6. Sign Native Modules (*.node)
echo "Signing Native Modules..."
find "$APP_PATH" -name "*.node" -exec codesign --force --sign - --verbose=4 "{}" \;

# 7. Sign the App Bundle
echo "Signing App Bundle (without --deep)..."
codesign --force --sign - --entitlements "$ENTITLEMENTS" "$APP_PATH"

echo "Deep signing completed."
