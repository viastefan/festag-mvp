// GOOGLE OAUTH AUTO-SETUP SCRIPT FÜR FESTAG
// Kopiere diesen Code in die Browser-Konsole (F12 > Console) während du bei Google Cloud Console bist

console.log("🚀 Starte automatisches Google OAuth Setup für Festag...");

// SCHRITT 1: Warte kurz und navigiere zu OAuth Zustimmungsbildschirm
setTimeout(() => {
  const baseUrl = window.location.origin;
  const oauthConsentUrl = baseUrl + "/security/oauth-consent";
  console.log("📍 Navigiere zu OAuth Zustimmungsbildschirm...");
  window.location.href = oauthConsentUrl;
}, 1000);

// Alternative: Wenn oben nicht funktioniert, führe folgende Schritte manuell aus:
/*
MANUELLE SCHRITTE (Falls das Script nicht funktioniert):

1. Du bist jetzt in Google Auth Plattform
2. Klick im linken Menü auf "Zielgruppe"
3. Klick "Create"
4. Wähle "External"
5. Klick "Create"
6. Füll das Formular aus:
   App-Name: Festag
   User Support Email: (deine Google Email)
   Developer Contact: (deine Google Email)
7. Klick "Save and Continue" (3x klicken)
8. Am Ende: Klick "Back to Dashboard"

DANN:
9. Klick auf "Clients" im linken Menü
10. Klick "Create OAuth 2.0 Client ID"
11. Application Type: Web application
12. Name: Festag Production
13. Authorized redirect URIs: 
    https://xsdkoepwuvpuroijjain.supabase.co/auth/v1/callback
14. Klick "Create"
15. Kopiere Client ID und Client Secret!

DANN SCHREIB MIR:
- Client ID: [deine Client ID hier]
- Client Secret: [dein Client Secret hier]
*/

// SCHRITT 2: Code um die Redirect URI automatisch zu setzen
// (Falls du die Konsole verwendest)
const redirectUri = "https://xsdkoepwuvpuroijjain.supabase.co/auth/v1/callback";
console.log("✅ Redirect URI für Supabase:");
console.log(redirectUri);
console.log("\n📋 Kopiere diese URI in Google Cloud:");
console.log(redirectUri);
