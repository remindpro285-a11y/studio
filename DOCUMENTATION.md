
# Gnanamani Notification Platform Documentation

## 1. Overview

Welcome to the Gnanamani Notification Platform! This is a robust, secure, and user-friendly web application designed to streamline communication for educational institutions. It allows administrators to send personalized fee reminders and grade reports to parents and guardians via WhatsApp, using data from standard Excel or CSV files.

The platform is built with a focus on security, reliability, and ease of use, ensuring that sensitive information is protected while making the notification process as simple as possible.

---

## 2. Key Features

*   **Secure Authentication**: The dashboard and settings panel are protected by a password lock to prevent unauthorized access.
*   **Bulk Notifications**: Process Excel or CSV files containing student data to send hundreds or thousands of personalized messages in a single batch.
*   **Dual Modes**: Seamlessly switch between sending **Fee Reminders** and **Grade Reports**.
*   **Intelligent Column Mapping**: The application intelligently suggests mappings between your spreadsheet columns and the required data fields, saving you time and reducing errors.
*   **Live Message Preview**: See a real-time preview of how your WhatsApp message will look before you send it, ensuring accuracy and professionalism.
*   **Comprehensive Status Dashboard**: After sending a batch, view a detailed report of which messages were successfully sent and which failed, along with reasons for failure.
*   **Secure Credential Management**: API keys and other sensitive settings are stored securely and are only accessible through the locked settings panel.
*   **Connection Testing**: Built-in tools to test the connection to the database and the WhatsApp Business API for easy troubleshooting.

---

## 3. Technical Stack

The application is built using a modern, high-performance, and secure technology stack:

*   **Frontend**: Next.js with React (leveraging Server Components and Server Actions for performance and security)
*   **Styling**: Tailwind CSS with ShadCN UI components for a polished and responsive user interface.
*   **Database**: Supabase (PostgreSQL) for storing configuration settings and the application lock password.
*   **File Processing**: `xlsx` library for parsing Excel and CSV files directly in the browser.
*   **Messaging API**: Integrates with the Meta (WhatsApp) Business API for sending templated messages.

---

## 4. Getting Started: Prerequisites

Before using the application, you must have the following:

1.  **A Supabase Project**: A free Supabase account and project are required to store application settings.
2.  **A WhatsApp Business Account (WABA)**: You need an approved WABA connected to a phone number.
3.  **Approved Message Templates**: You must have pre-approved message templates for both fee reminders and grade reports in your WhatsApp Business Manager. The application sends messages using these templates.
    *   **Fees Template Example**: `Dear Parent, the {{1}} for your child, {{2}}, of ₹{{3}} is due on {{4}}. Thank you.`
    *   **Grades Template Example**: `Dear Parent, the results for the {{1}} for your child, {{2}}, are as follows: {{3}}.`

---

## 5. Configuration: The Settings Page

All sensitive information is managed on the **Settings** page. This page is protected by the same password lock as the main dashboard.

To configure the application:

1.  Navigate to the `/settings` page.
2.  Enter your password to unlock the form.
3.  Fill in the following fields:
    *   **Phone Number ID**: The ID of the phone number registered with your WABA.
    *   **WABA ID**: Your WhatsApp Business Account ID.
    *   **Access Token**: Your permanent access token for the Meta Graph API.
    *   **Endpoint**: The API endpoint. Defaults to the latest version but can be updated.
    *   **Fees Template Name**: The exact name of your approved template for fee reminders.
    *   **Marks Template Name**: The exact name of your approved template for grade reports.
4.  **Save & Test**:
    *   Click **"Save Settings"** to securely store your credentials in the Supabase database.
    *   Use the **"Test DB"** button to confirm the application can connect to Supabase.
    *   Use the **"Test WhatsApp API"** button to verify that your credentials are correct and can successfully authenticate with the Meta API.

---

## 6. User Guide: Sending Notifications Step-by-Step

The application guides you through a simple 4-step process.

### Step 0: Unlock Dashboard
*   When you first visit the application, it will be locked.
*   Enter the password configured for the application to unlock the dashboard and begin the process.

### Step 1: Upload Data
*   **Select Mode**: At the top of the next screen, choose whether you are sending **Fee Notifications** or **Grade Reports**. This choice determines the required data fields.
*   **Choose File**: Click the "Choose File" button and select the Excel (`.xlsx`, `.xls`) or CSV (`.csv`) file containing the student data.
*   The application will parse the file and, upon success, automatically move you to the next step.

### Step 2: Map Columns
*   This is a critical step where you tell the application which column in your spreadsheet corresponds to which piece of required information.
*   The application will attempt to automatically map the columns based on common naming conventions (e.g., a column named "Student Name" will be mapped to the `studentName` field).
*   Use the dropdown menus to correct or complete the mappings. **All fields marked with an asterisk (`*`) are required.**
*   For **Grade Reports**, any columns that are *not* mapped will be automatically concatenated and included as the list of grades in the final message.
*   Once all required fields are mapped, the "Confirm Mappings & Preview" button will become enabled. Click it to proceed.

### Step 3: Preview & Send
*   **Final Configuration**: Fill in any remaining template details, such as the "Fee Name" and "Due Date" for fees, or the "Exam Name" for grades.
*   **Live Message Preview**: On the left, you will see a live preview of what the WhatsApp message will look like for the first student in your data file. This updates in real-time as you type.
*   **Data Preview**: On the right, you can review the parsed data in a table to ensure everything looks correct. Use the pagination controls to look through the records.
*   **Send**: When you are satisfied, click the large "Send Notifications" button at the bottom.

### Step 4: Status
*   You will be taken to a final status screen.
*   A progress bar will show the status of the sending process.
*   Below the progress bar, a table will populate in real-time, showing the status (`success` or `failed`) for each student. If a message failed to send, a reason will be provided.
*   Once the process is complete, you can click **"Send Another Batch"** to return to the start.

---

## 7. Security Architecture

The platform was designed with a security-first approach.

*   **No Client-Side Secrets**: All sensitive keys (Supabase key, WhatsApp Access Token) are used exclusively on the server side and are never exposed to the user's browser.
*   **Server Actions**: All mutations and sensitive operations (password verification, API calls, settings updates) are handled via Next.js Server Actions, which run securely on the server.
*   **Access Control**: Both the data upload functionality and the settings page are protected by a password, preventing unauthorized use.
*   **Database Security**: Row-Level Security (RLS) can be enabled in Supabase for an additional layer of data protection, although the current architecture is already secure by design as it only stores configuration data.

---

## 8. Data File Requirements

*   The file must be in a standard Excel (`.xlsx`, `.xls`) or CSV (`.csv`) format.
*   The first row of the sheet must be the **header row** (e.g., "Student Name", "Phone Number").
*   Ensure phone numbers include the country code but no `+` symbol or special characters (e.g., `919876543210`).
*   For **Fee Reminders**, you must have columns that can be mapped to: Student Name, Class, Phone Number, and Fee Amount.
*   For **Grade Reports**, you must have columns for: Student Name, Class, and Phone Number. All other columns will be treated as subjects and their corresponding marks.

---

## 9. Troubleshooting

*   **Error: "Unexpected token '<', "<html>..." is not valid JSON"**: This almost always means the WhatsApp API endpoint in your settings is incorrect or your backend server is down, causing the platform to receive an HTML error page instead of a JSON response. **Solution**: Verify the endpoint URL in settings and ensure your backend is running.
*   **Error: "API settings not found..."**: This means the settings have not been saved correctly in the database. **Solution**: Go to the `/settings` page, fill in all the details, and click "Save Settings". Use the test buttons to confirm the connection.
*   **Error: "Template not found"**: The template name you entered in the settings does not match the name of an approved template in your WABA. **Solution**: Double-check the template name for typos and ensure it has been approved by Meta.
*   **Dashboard is Locked**: If you forget the password, you will need to manually access the Supabase database, navigate to the `settings` table, and either clear or update the `lock_password` field for the entry with `id=1`.

