# Troubleshooting

## "Loading chunk failed" Error

1. **Restart dev server**: Stop (Ctrl+C), then `npm run dev`
2. **Clear cache**: `rm -rf .next && npm run dev`
3. **Reinstall**: `rm -rf node_modules && npm install && npm run dev`
4. **Check port**: `lsof -ti:3000 | xargs kill -9` (macOS/Linux)
5. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Firebase Issues

See `FIREBASE_TROUBLESHOOTING.md`

## Firestore Permission Errors

See `FIRESTORE_RULES.md` for quick fix rules
