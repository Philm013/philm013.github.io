# Bank Explorer Pro

Bank Explorer Pro is a powerful, privacy-focused, client-side application for personal finance analysis. It allows you to import PDF bank statements, parse transactions using customizable rules, and gain deep insights into your spending habits through interactive charts, smart tagging, and an integrated AI assistant.

Because it runs entirely in your browser and stores all data locally in IndexedDB, your financial information remains completely private.

## Key Features

### 1. Data Import & Parsing
- **PDF Statement Upload:** Import multiple bank or credit card statements directly into the app.
- **Customizable Parser Profiles:** Create and manage unique Regex-based profiles for different banks or statement layouts. This allows the app to accurately extract transaction data (date, description, amount) from virtually any PDF format.
- **Data Persistence:** All imported data is stored securely in your browser's IndexedDB, allowing you to close and reopen the app without losing your information.

### 2. Interactive Dashboard & Visualization
- **Financial KPIs:** Get an at-a-glance overview of your financial health with key metrics like Net Flow, Total Income, Total Expense, and Savings Rate.
- **Dynamic Charts:** Visualize your finances with interactive charts powered by Chart.js.
    - **Time-Based Grouping:** Switch between Monthly, Weekly, and Quarterly views.
    - **Multiple Chart Modes:** Analyze your data as a Net Flow, a cumulative Trend, or a categorical Composition.
- **Drill-Down Capabilities:** Click on chart elements (like a category in a donut chart) to dynamically filter the main visualization.

### 3. Transaction Management & Tagging
- **Full-Text Search:** Quickly find any transaction using a powerful fuzzy search powered by Fuse.js.
- **Smart Tagging:** Categorize your spending by applying custom tags (e.g., "Groceries", "Gas", "Subscription").
- **Smart Rule Creation:** When you tag a transaction, the app intelligently prompts you to create a rule to automatically tag similar transactions in the future, dramatically speeding up categorization.
- **Bulk Editing:** Select multiple transactions at once to apply tags or mark them as "ignored" in a single action.

### 4. Advanced Financial Analysis
- **Recurring Expense Detection:** The app automatically scans your transactions to identify potential recurring payments and subscriptions, helping you spot forgotten trials or track fixed costs.
- **Manual Recurring Trackers:** Explicitly mark specific tags (e.g., `#Rent`, `#Gym`) to be tracked as monthly recurring expenses.
- **Master Recurring List:** View a consolidated list of both automatically detected patterns and manually tracked tags, giving you a clear picture of your estimated monthly burn rate.
- **Category Breakdown:** Analyze spending habits with a detailed breakdown of expenses by merchant or category.

### 5. AI-Powered Assistant (Gemini)
- **Conversational Analysis:** Open the chat widget to ask the Gemini AI questions about your finances in natural language.
- **Context-Aware:** Control the scope of data the AI can see—limit it to your current filtered view, a specific drill-down, or grant it access to your entire database for comprehensive analysis.
- **AI-Suggested Tagging:** The AI can analyze your transactions and propose relevant tags, which you can then apply with a single click.

### 6. Data Portability
- **Export Options:** Download your financial data at any time.
    - **Excel (.xlsx):** A fully-styled Excel sheet.
    - **CSV:** A simple, comma-separated values file.
    - **JSON:** A full backup of the application's local database, which can be re-imported later.
- **Dark Mode & Fullscreen:** A polished user interface with both light and dark themes and a fullscreen mode for focused analysis.

## Technical Stack

- **Architecture:** A 100% client-side Single Page Application (SPA). No user data is ever sent to a server.
- **Framework:** Built with vanilla **HTML, CSS, and JavaScript (ES Modules)**.
- **AI SDK:** **Google Generative AI SDK (`@google/genai`)** for the AI assistant features.
-   **Data Processing & Storage:**
    -   **PDF.js:** For parsing and extracting text from uploaded PDF files.
    -   **IndexedDB:** Used as the local, in-browser database for all persistent storage.
-   **Core Libraries:**
    -   **Chart.js:** For all data visualizations.
    -   **Fuse.js:** For fuzzy-search capabilities.
    -   **`xlsx-js-style`:** For generating styled Excel exports.
    -   **Marked:** For rendering Markdown in the AI chat.

## How to Use

1.  **Open `index.html`** in a modern, desktop web browser.
2.  **Set API Key (Optional):** To use the AI features, go to **Settings** and enter your Google Gemini API key.
3.  **Create a Parser Profile:** Go to **Settings -> Manage Parser Profiles**. Create a new profile with a regular expression that captures the date, description, and amount from your bank statement's text.
4.  **Upload Statements:** Navigate to the **Sources** tab, select the appropriate parsing profile, and upload your PDF bank statements.
5.  **Explore & Analyze:** Use the different views (Dashboard, Transactions, Tags, Analysis) to explore your financial data. Tag transactions to categorize them and let the smart rules accelerate the process.
