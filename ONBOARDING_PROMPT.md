# FESTAG ONBOARDING - Mobile Native App Flow

## 🎯 VISION
Ein intelligentes, sequentielles Onboarding das Clients hilft, ihr Projekt korrekt einzustufen und gleichzeitig ihre Daten sammelt. Die AI trainiert sich mit Festag-Logik, um realistische Projekte zu identifizieren.

---

## 📱 SCREEN-BY-SCREEN LOGIC

### **SCREEN 1: Login / Register Entry Point**
- **Type:** Auth Selection
- **Options:**
  - Login (existing users)
  - Register (new users)
- **No changes needed** - existing login page works

---

### **SCREEN 2: Project Briefing (AI Conversation)**
**Trigger:** After "Register" clicked

**AI Questions (Sequential, conversational):**
1. "Welche Festag-Lösung suchst du? (z.B. Web-App, Mobile App, Software, Custom)"
2. "Wie viele Developer werden für dein Projekt benötigt? (1-20+)"
3. "Welche Plattform wird benötigt? (Web, iOS, Android, Cross-Platform)"
4. "Detailliere kurz: Was ist dein Projekt genau?"

**Data Collection:** 
- `project_type`: string
- `developer_count`: number
- `platform`: array
- `project_description`: text

**AI Behavior:**
- Speichert Antworten ab
- Trainiert mit Festag-Logikwissen
- Identifiziert "Real-World" vs "AI-Only" Projekte
- Gibt dem Client subtiles Feedback: "Das klingt nach einem Projekt, das echte Menschen bauen müssen"

**Next:** Screen 3

---

### **SCREEN 3: Project Assessment & Auth Setup**
**Trigger:** After AI conversation complete

**Top Section - AI Feedback:**
- AI zeigt Assessment des Projekts
- Wichtige Nachricht: "Echte Developer werden dein Projekt umsetzen damit es auch was wird"
- Warnung vor: "Wenn du alles selbst mit AI machst, wird es nichts"

**Auth Options (Choose One):**
```
┌─────────────────────────────┐
│ 1. Google Sign-In           │
│ 2. Apple ID Sign-In         │
│ 3. Manuelle Registration    │
│    └─ Email                 │
│    └─ Passwort              │
│    └─ Passwort bestätigen   │
└─────────────────────────────┘
```

**Logic:**
```
IF google_selected OR apple_selected:
  → Skip manual email/password
  → Use provider email for account
  → Go to Screen 4

IF manual_selected:
  → Collect email + password
  → Validate email format
  → Check password strength (min 8 chars, 1 uppercase, 1 number)
  → Create auth user
  → Go to Screen 4
```

**Data Collection:**
- `auth_method`: "google" | "apple" | "manual"
- `email`: string (if manual)
- `password_hash`: encrypted (if manual)

**Next:** Screen 4

---

### **SCREEN 4: Data & Project Onboarding**
**Trigger:** Auth complete

**Purpose:** Sammle User- & Company-Daten, speichere Projektbriefing

**Subscreen 4.1 - Name (Screen 1 of 5)**
```
┌──────────────────────────────┐
│ Vorname eingeben             │
│ [_____________________]      │
│                              │
│ Nachname eingeben            │
│ [_____________________]      │
│                              │
│ [Weiter] Button              │
└──────────────────────────────┘
```

**Subscreen 4.2 - Company (Screen 2 of 5)**
```
┌──────────────────────────────┐
│ Firma/Unternehmensname       │
│ [_____________________]      │
│                              │
│ Unternehmensbeschreibung     │
│ [textarea - für AI wichtig!] │
│                              │
│ Unternehmsgröße (Optional)   │
│ [Dropdown: 1-10 / 11-50...] │
│                              │
│ Website (Optional)           │
│ [_____________________]      │
│                              │
│ [Weiter] Button              │
└──────────────────────────────┘
```

**Data Collection:**
- `first_name`: string
- `last_name`: string
- `company_name`: string
- `company_description`: text (IMPORTANT FOR AI)
- `company_size`: enum (optional)
- `website`: url (optional)

**Next:** Screen 5

---

### **SCREEN 5: Phone Verification**
**Type:** SMS OTP Flow

```
┌──────────────────────────────┐
│ Telefonnummer eingeben       │
│ [_____________________]      │
│                              │
│ Land-Dropdown (Default: DE)  │
│ [Dropdown]                   │
│                              │
│ [Bestätigungscode senden]    │
├──────────────────────────────┤
│ Bestätigungscode eingeben    │
│ [_ _ _ _ _ _] (6 digits)     │
│                              │
│ [Verifyzen]                  │
└──────────────────────────────┘
```

**Logic:**
```
IF phone_submitted:
  → Generate 6-digit OTP
  → Send via Twilio/SMS service
  → Show input field for OTP
  → Timeout: 10 minutes

IF otp_correct:
  → Update user.phone_verified = true
  → Go to Screen 6

IF otp_wrong:
  → Show error
  → Offer "Resend Code" option
```

**Data Collection:**
- `phone_number`: string (E.164 format)
- `phone_verified`: boolean
- `phone_verified_at`: timestamp

**Next:** Screen 6

---

### **SCREEN 6: Email Confirmation**
**Type:** Email Verification

```
┌──────────────────────────────┐
│ Email-Adresse eingeben       │
│ [_____________________]      │
│                              │
│ (Wird bereits von Auth       │
│  gefüllt, aber editable)     │
│                              │
│ [Bestätigungscode senden]    │
├──────────────────────────────┤
│ Bestätigungscode prüfen      │
│ Wir haben dir einen Code     │
│ an deine Email gesendet      │
│                              │
│ [Weiter - Code per Email]    │
└──────────────────────────────┘
```

**Logic:**
```
IF email_changed_from_auth:
  → Send verification email
  → Click link or enter code
  
IF email_verified:
  → Update user.email_verified = true
  → Go to Screen 7
```

**Data Collection:**
- `email_verified`: boolean
- `email_verified_at`: timestamp

**Next:** Screen 7

---

### **SCREEN 7: Push Notifications Setup**
**Type:** Permission Request + Feature Selection

```
┌──────────────────────────────┐
│ 🔔 Benachrichtigungen        │
│                              │
│ Wähle was du erfahren möchtest:
│                              │
│ ☑ AI Updates & Tagesberichte │
│   "Wenn Tagro Berichte erstellt"
│                              │
│ ☑ Developer-Aktivität        │
│   "Tasks erledigt oder aktiv"
│                              │
│ ☑ Projekt-Statuswechsel      │
│   "Phasenwechsel in deinem   │
│    Projekt"                  │
│                              │
│ ☑ Rechnungen & Zahlungen     │
│   "Neue Rechnungen oder      │
│    Bestätigungen"            │
│                              │
│ [Push-Berechtigung erlauben] │
│ (System native request)      │
│                              │
│ [Weiter]                     │
└──────────────────────────────┘
```

**Logic:**
```
// Request native push permissions
navigator.serviceWorker.ready
  .then(reg => reg.pushManager.requestPermission())
  .then(permission => {
    if (permission === 'granted') {
      // Connect to backend notification service
      subscribeToNotifications({
        ai_updates: selected,
        developer_activity: selected,
        project_updates: selected,
        billing_updates: selected
      })
    }
  })
```

**Data Collection:**
- `notifications_enabled`: boolean
- `notification_preferences`: object {
    - `ai_updates`: boolean
    - `developer_activity`: boolean
    - `project_updates`: boolean
    - `billing_updates`: boolean
  }
- `push_token`: string (from mobile)
- `notifications_enabled_at`: timestamp

**Next:** Screen 8

---

### **SCREEN 8: Profile Completion (Optional)**
**Type:** Optional Profile Enhancement

```
┌──────────────────────────────┐
│ 📸 Profilfoto                │
│                              │
│ [Upload / Camera]            │
│ (Optional - skip available)  │
├──────────────────────────────┤
│ Zusätzliche Informationen    │
│                              │
│ □ Projektbudget (Optional)   │
│ [_____________________]      │
│                              │
│ □ Timeline (Optional)        │
│ [_____________________]      │
│                              │
│ □ Besondere Anforderungen    │
│ [textarea]                   │
│                              │
│ [Profil abschließen]         │
│ [Oder: Weiter ohne Foto]     │
└──────────────────────────────┘
```

**Data Collection:**
- `profile_photo`: image_url (optional)
- `project_budget`: number (optional)
- `project_timeline`: string (optional)
- `special_requirements`: text (optional)

**Next:** Dashboard/Main App

---

## 🔄 DATA FLOW & PERSISTENCE

### After Registration Complete:

**In Database - Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  auth_id UUID REFERENCES auth.users,
  
  -- Screen 4
  first_name VARCHAR,
  last_name VARCHAR,
  
  -- Screen 3
  auth_method ENUM('google', 'apple', 'manual'),
  
  -- Screen 5
  phone_number VARCHAR,
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMP,
  
  -- Screen 6
  email VARCHAR UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  
  -- Screen 8
  profile_photo_url VARCHAR,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_companies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  
  -- Screen 4.2
  company_name VARCHAR,
  company_description TEXT,
  company_size ENUM('1-10', '11-50', '51-200', '200+'),
  website VARCHAR,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  
  -- Screen 2
  project_type VARCHAR,
  developer_count INT,
  platform JSON,
  project_description TEXT,
  ai_assessment TEXT,
  
  -- Screen 8
  budget DECIMAL,
  timeline VARCHAR,
  special_requirements TEXT,
  
  status ENUM('onboarding', 'active', 'paused') DEFAULT 'onboarding',
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  
  -- Screen 7
  ai_updates BOOLEAN DEFAULT TRUE,
  developer_activity BOOLEAN DEFAULT TRUE,
  project_updates BOOLEAN DEFAULT TRUE,
  billing_updates BOOLEAN DEFAULT TRUE,
  
  push_token VARCHAR,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ IMPORTANT REQUIREMENTS

1. **All data accessible in Settings:**
   - Nach Registration sofort in Account-Settings sichtbar
   - User kann alles editieren
   - Keine Daten "versteckt"

2. **AI Training Context:**
   - `company_description` + `project_description` trainieren die AI
   - Zusammen mit `developer_count` + `platform` entscheidet AI: "Realistic oder nicht"

3. **Mobile First:**
   - Responsive Design
   - One field per screen or logical grouping
   - Big buttons, easy scrolling
   - Clear progress indicator (Screen X of 8)

4. **Native Features:**
   - SMS verification (Screen 5)
   - Push notifications (Screen 7)
   - Camera/gallery access (Screen 8)
   - Email verification link (Screen 6)

5. **Error Handling:**
   - Validation on each screen
   - Clear error messages
   - Option to go back/edit
   - Don't lose data on error

6. **Auth Integration:**
   - Google OAuth (Screen 3)
   - Apple ID (Screen 3)
   - Manual email/password (Screen 3)

---

## 🚀 NEXT STEPS FOR IMPLEMENTATION

1. Create mobile-optimized UI components
2. Implement sequential screen navigation
3. Set up Supabase tables (users, companies, projects, notifications)
4. Integrate SMS verification (Twilio/Vonage)
5. Integrate email verification
6. Integrate push notifications
7. Test full onboarding flow
8. Connect Settings page to show all collected data
