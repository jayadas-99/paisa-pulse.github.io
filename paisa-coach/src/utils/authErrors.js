export function friendlyAuthError(error) {
  const code = error?.code || "";
  const message = error?.message || "Something went wrong while signing in.";

  const messages = {
    "auth/configuration-not-found": "Firebase Auth is not enabled/configured for this Firebase project. In Firebase Console, enable Authentication and turn on the sign-in provider you are using.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication. Enable Email/Password or Google in the Firebase Console.",
    "auth/unauthorized-domain": "This domain is not allowed for Firebase Auth. Add localhost and 127.0.0.1 under Authentication > Settings > Authorized domains.",
    "auth/popup-closed-by-user": "The Google sign-in popup was closed before sign-in finished.",
    "auth/popup-blocked": "The browser blocked the Google sign-in popup. Allow popups for this local app and try again.",
    "auth/invalid-api-key": "The Firebase API key in .env.local is missing or incorrect. Copy it from your Firebase web app config.",
    "auth/user-not-found": "No account exists for this email yet. Create an account first.",
    "auth/wrong-password": "That password does not match this email.",
    "auth/invalid-credential": "Those credentials did not match a Firebase user.",
    "auth/email-already-in-use": "An account already exists for this email. Try signing in instead.",
  };

  if (message.includes("PERMISSION_DENIED")) {
    return "Firebase Realtime Database rejected this write. Update your database rules so signed-in users can read and write only their own users/{uid} data.";
  }

  return messages[code] || message;
}
