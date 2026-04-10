#!/bin/bash
# Bumps CFBundleShortVersionString (patch) and CFBundleVersion (build number) in Info.plist
# Usage:
#   ./bump_version.sh        # bumps patch:  0.2.6 → 0.2.7
#   ./bump_version.sh minor  # bumps minor:  0.2.6 → 0.3.0
#   ./bump_version.sh major  # bumps major:  0.2.6 → 1.0.0

PLIST="ios/BookingBuddy/Info.plist"
BUMP=${1:-patch}

# Read current values
CURRENT_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$PLIST")
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "$PLIST")

# Split version into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP" in
  major)
    MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor)
    MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch)
    PATCH=$((PATCH + 1)) ;;
  *)
    echo "Unknown bump type: $BUMP (use major, minor, or patch)"; exit 1 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
NEW_BUILD=$((CURRENT_BUILD + 1))

# Write back
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NEW_VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD" "$PLIST"

echo "Version: $CURRENT_VERSION -> $NEW_VERSION"
echo "Build:   $CURRENT_BUILD -> $NEW_BUILD"

echo "Opening Xcode..."
open ios/BookingBuddy.xcworkspace
