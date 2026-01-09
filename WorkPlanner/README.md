# TaskFlow - Enterprise Collaborative Planner

TaskFlow is a powerful, client-side project management tool inspired by enterprise software like Jira. It provides a comprehensive suite of features for agile development, including project and sprint management, issue tracking, multiple board views, and real-time peer-to-peer collaboration.

Built as a serverless Single Page Application, TaskFlow runs entirely in your browser. All data is stored locally and can be synchronized directly with other users via WebRTC, ensuring privacy and eliminating the need for a backend service.

## Key Features

### 1. Agile Project Management
-   **Project & Sprint Planning:** Create multiple projects, each with its own key and set of sprints. Manage sprints in a backlog, move them to an active state, and plan your work accordingly.
-   **Comprehensive Issue Tracking:** Create and manage various issue types, including Stories, Tasks, Bugs, and Epics.
-   **Rich Issue Details:** Edit a wide range of fields for each issue, such as:
    -   Summary & Description
    -   Status, Priority, Assignee, Reporter
    -   Story Points, Start & Due Dates
    -   Customizable fields like Components, Labels, Fix Versions, and Teams.
-   **Subtask Management:** Break down complex tasks into smaller, manageable subtasks.

### 2. Multiple Project Views
TaskFlow provides several ways to visualize your project's progress:
-   **Dashboard:** A high-level overview of all your projects and issue statistics.
-   **Backlog:** A classic agile view showing all sprints and the product backlog, allowing for easy sprint planning.
-   **Kanban Board:** A drag-and-drop board for managing the active sprint. Move tasks between status columns (e.g., To Do, In Progress, Done) to update their state.
-   **List View:** A simple, filterable table view of all issues in the project.
-   **Gantt/Timeline View:** A timeline that visualizes the duration and scheduling of tasks based on their start and due dates.
-   **Split View:** A powerful combination view that shows the List and Gantt chart side-by-side for comprehensive planning.

### 3. Real-time Collaboration
-   **Serverless P2P Sync:** Using PeerJS (WebRTC), TaskFlow allows you to connect directly with other users' browsers.
-   **Live State Synchronization:** Once connected, the entire application state is synchronized in real-time. Any change made by one user—such as creating a task, updating a status, or leaving a comment—is instantly broadcast to all other connected peers.
-   **Simple Connection:** Start a collaboration session by generating a unique Peer ID and sharing an invitation link with your teammates.

### 4. Configuration and Export
-   **Customizable Workspace:** Configure the application to match your team's workflow by adding, editing, or deleting users, teams, and custom statuses.
-   **Toggle Fields:** Enable or disable specific fields in the issue-editing modal to reduce clutter and tailor the interface to your needs.
-   **Jira-Compatible CSV Export:** Export your entire project to a `.csv` file with headers formatted for easy import into Jira, providing a seamless migration path.

## Technical Stack

-   **Architecture:** A client-side Single Page Application (SPA) built with vanilla **HTML, CSS, and JavaScript (ES Modules)**.
-   **Styling:** **Tailwind CSS** is used for a modern, responsive, and utility-first user interface.
-   **Networking:** **PeerJS** is the core library that enables real-time, serverless collaboration by managing the WebRTC data channels between peers.
-   **Persistence:** The entire application state, including all projects and configuration, is stored as a single JSON object in the browser's `localStorage`.
-   **Modularity:** The code is well-structured within a single file, organized into an `App` class and a `PeerManager` class to handle application logic and networking separately.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Create a Project:** From the sidebar, click **"+ New Project"** to set up your first project with a name and a unique key.
3.  **Configure (Optional):** Navigate to **"Settings & Fields"** from the sidebar to customize users, statuses, and visible fields to match your workflow.
4.  **Create Issues:** Select your project, navigate to one of the views (e.g., Backlog), and start creating issues.
5.  **Plan Your Sprints:** In the **Backlog** view, create sprints and drag issues from the backlog into them. Click "Start Sprint" to begin work.
6.  **Work on the Board:** In the **Board** view, drag and drop tasks to update their status as you work on the active sprint.
7.  **Collaborate:**
    -   Click **"Collaborate"** in the sidebar to open the connection modal.
    -   Generate an ID and share the invitation link with a teammate.
    -   Once they connect, all your project data will be synced with them, and any subsequent changes will appear instantly on both screens.
