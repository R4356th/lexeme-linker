# Lexeme Linker
A Chrome extension designed to streamline the process of linking **Wikidata lexemes** to their corresponding entries on **Bengali Wiktionary** (বাংলা উইকিঅভিধান).

## Key Features

-   **Automatic Detection**: Instantly recognizes when you are viewing a Lexeme page on Wikidata that has at least one Bengali sense.
-   **Smart Conflict Checking**: Detects if the Wiktionary entry already contains a link to the current lexeme or a different one (and stays hidden if a link to the lexeme being viewed is already in place)
-   **Multi-Variant Lemma Search**: Handles script variations in Arabic scripts by normalizing lemmas and following redirects on Wiktionary
-   **Integrated Editor**:
    -   View existing Wiktionary wikitext directly on Wikidata
    -   Full wikitext editing capability but also provides a fast 'replace all' mechanism
    -   Quick-insert buttons for templates: `{{লে|<id>}}` and `{{লে|<id>|না}}`
-   **Customizable Summaries**: Save your preferred edit summary as a default for faster editing
-   **Bengali Localized UI**: The interface is tailor-made for Bengali Wiktionary editors

## 🛠 Installation (Developer Mode)
1.  **Clone or Download** this repository to your local machine:
    ```bash
    git clone https://github.com/R4356th/lexeme-linker.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the folder where you cloned the repository.

OR: Download the CRX file from https://github.com/R4356th/lexeme-linker/releases.

## How to Use

1.  Navigate to any Lexeme on Wikidata (e.g., `https://www.wikidata.org/wiki/Lexeme:L123`).
2.  If the Lexeme has a **Bengali sense** and an entry exists on **bn.wiktionary.org**, a floating card will appear in the bottom-right corner.
3.  **Review the content**: You can see the current Wiktionary text, edit it, or use the tool-buttons to insert the linking template.
4.  **Confirm the Edit Summary**: Customize the summary if needed, or save your own via the 💾 icon.
5.  **Save**: Click **সংরক্ষণ করুন** to update the Wiktionary page instantly.

## ⚠️ Important Note

Please always ensure that any unique information on the Wiktionary page (like etymology or pronunciation) has been properly migrated to the Wikidata Lexeme before performing a full-page replacement.

## Copyright
Lexeme Linker - A Chrome extension for linking Wikidata lexemes to their corresponding entries on Bengali Wiktionary
Copyright (C) 2026 Radman Siddiki

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.

