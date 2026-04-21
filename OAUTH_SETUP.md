# OAuth Setup für Festag MVP

## Google OAuth Konfiguration

### 1. Google Cloud Console Setup
1. Gehe zu https://console.cloud.google.com/
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Navigiere zu "APIs & Services" > "Credentials"
4. Klicke auf "Create Credentials" > "OAuth 2.0 Client ID"
5. Wähle "Web application"
6. Füge diese URLs hinzu:
   - **Authorized JavaScript origins:**
     - `https://festag-mvp.vercel.app`
     - `http://localhost:3000` (für Development)
   
   - **Authorized redirect URIs:**
     - `https://xsdkoepwuvpuroijjain.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (für Development)

7. Kopiere die **Client ID** und **Client Secret**

### 2. Supabase Konfiguration
1. Gehe zu https://supabase.com/dashboard/project/xsdkoepwuvpuroijjain
2. Navigiere zu "Authentication" > "Providers"
3. Finde "Google" und aktiviere es
4. Füge ein:
   - **Client ID:** (von Google Cloud Console)
   - **Client Secret:** (von Google Cloud Console)
5. Klicke auf "Save"

## Apple OAuth Konfiguration

### 1. Apple Developer Account Setup
1. Gehe zu https://developer.apple.com/account/
2. Navigiere zu "Certificates, IDs & Profiles"
3. Erstelle einen neuen **Service ID**:
   - Identifier: `com.festag.signin` (oder ähnlich)
   - Description: "Festag Sign In"
4. Konfiguriere "Sign In with Apple":
   - **Domains and Subdomains:**
     - `festag-mvp.vercel.app`
     - `xsdkoepwuvpuroijjain.supabase.co`
   
   - **Return URLs:**
     - `https://xsdkoepwuvpuroijjain.supabase.co/auth/v1/callback`

5. Erstelle einen **Key** für Sign In with Apple:
   - Aktiviere "Sign In with Apple"
   - Lade die .p8 Datei herunter
   - Notiere die **Key ID** und **Team ID**

### 2. Supabase Konfiguration
1. Gehe zu https://supabase.com/dashboard/project/xsdkoepwuvpuroijjain
2. Navigiere zu "Authentication" > "Providers"
3. Finde "Apple" und aktiviere es
4. Füge ein:
   - **Services ID:** (z.B. `com.festag.signin`)
   - **Team ID:** (von Apple Developer)
   - **Key ID:** (von Apple Developer)
   - **Private Key:** (Inhalt der .p8 Datei)
5. Klicke auf "Save"

## Testing

### Lokales Testen
```bash
npm run dev
# Öffne http://localhost:3000/login
# Teste Google und Apple Login
```

### Production Testing
```
https://festag-mvp.vercel.app/login
```

## Wichtige Hinweise

- **Redirect URL muss exakt übereinstimmen** zwischen Google/Apple und Supabase
- **Development vs Production:** Unterschiedliche Redirect URLs für localhost und Production
- **Apple erfordert HTTPS** - localhost funktioniert nicht für Apple Sign In
- **Verifizierung:** Beide Provider erfordern Domain-Verifizierung

## Troubleshooting

### "redirect_uri_mismatch" Fehler
- Überprüfe, ob die Redirect URI in Google Cloud Console korrekt ist
- Stelle sicher, dass sie mit `https://xsdkoepwuvpuroijjain.supabase.co/auth/v1/callback` übereinstimmt

### Apple Sign In funktioniert nicht
- Stelle sicher, dass die Domain in Apple Developer verifiziert ist
- Überprüfe, ob die .p8 Datei korrekt hochgeladen wurde
- Apple Sign In funktioniert nur über HTTPS

## Code ist bereits implementiert! ✅

Die Login-Seite hat bereits:
- ✅ Google OAuth Button mit offiziellem Logo
- ✅ Apple OAuth Button mit korrigiertem Apple Logo
- ✅ Loading States während des OAuth-Flows
- ✅ Error Handling
- ✅ Automatische Weiterleitung zum Dashboard nach Login

Du musst nur noch die OAuth-Provider in Supabase konfigurieren!
