# Shared by the Firebase scripts: turn FIREBASE_SERVICE_ACCOUNT (key JSON in an env var)
# into GOOGLE_APPLICATION_CREDENTIALS, which the Firebase CLI understands.
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -n "${FIREBASE_SERVICE_ACCOUNT:-}" ]]; then
  _fb_key="$(mktemp)"
  trap 'rm -f "$_fb_key"' EXIT
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$_fb_key"
  export GOOGLE_APPLICATION_CREDENTIALS="$_fb_key"
fi
