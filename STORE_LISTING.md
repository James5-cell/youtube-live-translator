# Chrome Web Store Listing Information

Copy and paste the following information into the relevant fields on the Chrome Web Store dashboard.

## Store Listing Tab

### Name
Subtitle Translator for YouTube

### Summary (Single Purpose Description)
Real-time dual subtitle translation and dictionary lookup for YouTube videos, with pronunciation support for language learners.

### Detailed Description
Unlock the power of YouTube for language learning! This extension seamlessly translates English subtitles into your preferred language (default: Simplified Chinese) in real-time, displaying them alongside the original subtitles.

**Key Features:**
*   **Dual Subtitles:** Watch videos with both English and translated subtitles simultaneously.
*   **Integrated Dictionary:** Simply hover over any word in the subtitles to see its definition, phonetics, and usage examples.
*   **Smart Pagination:** Reading long definitions is easy with our paginated tooltip—no scrolling required.
*   **Audio Pronunciation:** Click the speaker icon to hear the correct pronunciation of any word.
*   **Customizable:** Toggle translation, dictionary, or phonetics on/off to suit your learning style.
*   **Privacy-Focused:** No personal data collection. All processing happens locally or via secure public APIs.

Perfect for students, language enthusiasts, and anyone wanting to overcome language barriers on YouTube.

## Privacy Practices Tab

### Privacy Policy URL
`https://github.com/James5-cell/youtube-live-translator/blob/main/PRIVACY.md`

### Single Purpose
Real-time subtitle translation and dictionary lookup for YouTube videos.

### Permission Justifications

**1. Host Permissions**
*   **Justification:**
    *   `https://www.youtube.com/*`: "Required to access the subtitle elements in the DOM to extract text for translation and to insert the translated subtitle overlay."
    *   `https://translate.googleapis.com/*`: "Required to send the extracted subtitle text to Google Translate API to fetch translations."
    *   `https://api.dictionaryapi.dev/*`: "Required to send selected words to the Free Dictionary API to fetch definitions and phonetics."

**2. Storage**
*   **Justification:** "Used to save user preferences locally, such as the target translation language and feature toggles. No data is sent to external servers."

**3. Remote Code**
*   **Selection:** 🔴 **No, I am not using remote code** (Please select "No". Selecting "Yes" will likely cause rejection or delay).
*   *Note: Manifest V3 strictly prohibits remote code. All logic is bundled.*

### Data Usage Certification
*   **Data Collection Checkboxes:** 
    *   Do **NOT** check any boxes (e.g., "Personally identifiable information", "Location", etc.) unless you explicitly collect them on a server.
    *   Since this extension processes data locally or via public APIs without identifying users, you generally leave these **unchecked**.
*   **Compliance Certification:** ✅ Check the box certifying compliance.

## Additional Fields

*   **Homepage URL:** `https://github.com/James5-cell/youtube-live-translator`
*   **Support URL:** `https://github.com/James5-cell/youtube-live-translator/issues`

## Images & Assets

### Icon
*   Upload `icons/icon128.png` from the zip file.

### Screenshots
*   You must upload at least one screenshot (1280x800 or 640x400 recommended).
*   **Action:** Go to a YouTube video, turn on the extension, hover over a word to show the dictionary, and take a screenshot of the video player.

### Category
*   **Selected:** `Productivity` or `Social & Communication`.

### Language
*   **Selected:** `English` (or your primary language).
