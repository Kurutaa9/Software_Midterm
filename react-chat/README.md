# Midterm Group Project - React Chat

## Overview & Functions
This is a real-time, responsive chat application built with React, Vite, and Firebase. It features a mobile-first design, comprehensive room management, and various message operations.

### How to Operate the Website (Feature Guide)

1. **Authentication**: 
   - Sign up for a new account or log in with an existing email and password.
   - Click the **Out** button in the sidebar to log out.
2. **User Profile**:
   - **Open Profile**: Click on your avatar/email in the sidebar to open the Profile Modal.
   - **Edit Info**: You can upload a custom **Profile Picture**, and edit your **Username**, **Phone Number**, and **Address**.
   - **Save**: Click **Save Profile**. The chatroom will display your updated username and profile picture.
3. **Room Management**:
   - **Create Room**: Click the **+** (New Room) button in the sidebar, enter a name, and click Create.
   - **Invite Members**: Inside a room, click the **👤+** (Invite) button at the top and enter a registered user's email to add them to the chat.
   - **Manage Room**: Click the **⚙️** (Settings) button. Admins can kick users or grant admin privileges. The creator/admin can also delete the room entirely.
4. **Messaging Operations**:
   - **Send Messages**: Type in the input box and press **Enter** or the **➤** button.
   - **Send Images**: Click the **🖼️** (Image) button. Images directly upload into the chat.
   - **Edit Message**: Click **Edit** under a message you sent to rewrite it. It will be marked with **(edited)**.
   - **Unsend Message**: Click **Unsend** under your message to permanently delete it for everyone.
   - **Search Messages**: Use the **Search...** bar at the top of the chat to filter messages in the current room by text.

---

## Local Setup Instructions (STEP BY STEP)

**Please follow these instructions EXACTLY to run the project locally.**

**Step 1: Install Prerequisites**
- Ensure you have **Node.js** installed (version 18+ recommended). You can download it from [nodejs.org](https://nodejs.org/).

**Step 2: Open the Project Directory**
- Extract this project folder (Mid1) to your local machine.
- Open your terminal (Command Prompt, PowerShell, or Terminal on Mac).
- Navigate strictly to the 
eact-chat inner folder:
  `ash
  cd react-chat
  `
  *(CRITICAL: You must be inside the 
eact-chat directory where the package.json file is located, NOT the top-level Mid1 folder. Running this in the root folder will fail to start and cost points.)*

**Step 3: Install Dependencies**
- Run the following command to download all required React and Firebase packages:
  `ash
  npm install
  `

**Step 4: Start the Development Server**
- Once the installation finishes, run:
  `ash
  npm run dev
  `

**Step 5: View the Application**
- The terminal will display a local URL (usually http://localhost:5173).
- Open your web browser and navigate to that URL to review the application.
*(Note: Firebase is already configured in src/firebase.js, so no additional database setup is required to test the functionality locally).*
