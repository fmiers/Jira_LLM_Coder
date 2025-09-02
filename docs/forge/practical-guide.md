# A Practical Guide to Atlassian Forge Development

Source: GuideToForge.pdf

This guide provides a straightforward, text-based overview of how to build Atlassian Forge apps. It's designed to supplement, not replace, the official documentation by focusing on the core concepts, workflow, and practical realities you'll encounter daily.

## 1. The Core Concepts: What You Need to Know

Before you write a line of code, it's helpful to understand the foundational pieces of the Forge platform. These concepts are what make Forge a modern and secure framework.

### Forge is Serverless

This is the most important concept to grasp. You don't need to provision, configure, or host your app on your own server (like AWS EC2 or Heroku). Atlassian manages the entire infrastructure for you using AWS Lambda. This has profound implications:

- **Focus on Code**: You can focus entirely on writing your app's logic instead of worrying about server maintenance, security patching, operating system updates, or uptime.
- **Automatic Scaling**: The platform automatically handles scaling your app up or down based on usage. If your app suddenly becomes popular, you don't need to do anything to handle the increased load.
- **Cost-Effective**: You are not paying for an always-on server. Your code only runs (and consumes resources) when it's invoked, which can be significantly cheaper for many app types.
- **Inherent Security**: Your app code runs in an isolated environment on Atlassian's trusted infrastructure, which provides a higher level of security by default.

### The manifest.yml is Your App's "Brain"

This YAML file is the heart of your Forge app. It acts as the single source of truth that tells the Forge platform everything it needs to know about your application. It's not just configuration; it's a contract between your app and Atlassian. It's where you declare everything:

- **Modules**: These are the building blocks of your app and define its extension points within the Atlassian UI. For example, a `jira:issuePanel` module tells Jira to render your app in the panel of an issue view. A `confluence:macro` allows users to embed your app's content directly onto a Confluence page.
- **Permissions (scopes)**: This is a critical security feature. You must explicitly list what your app is allowed to do (e.g., `read:jira-work` to read Jira issues, `write:confluence-content` to edit a Confluence page). These scopes are shown to administrators when they install your app, providing transparency and building trust.
- **Resources**: These are pointers to your code. A resource definition links a key (e.g., main) to the file containing your code (index.jsx) and the specific function handler to execute (handler). This tells Forge exactly where to find the code to run for a given module.

### Two Ways to Build UIs

Forge offers two distinct paths for creating user interfaces, each with its own trade-offs.

#### UI Kit (The Simple Way)
A declarative, component-based framework provided by Atlassian that renders native-looking UI elements. It's extremely fast and easy for building simple, static interfaces like configuration forms or information panels. However, it's less flexible; the UI logic is written directly inside your backend functions, and the UI can only be updated when a user interacts with it (like clicking a button), which re-invokes the entire function. You have very limited control over styling.

#### Custom UI (The Flexible Way)
This approach lets you build your own frontend using standard web technologies (HTML, CSS, JavaScript) and any framework you like, such as React, Vue, or Angular. This gives you complete control over the look, feel, and interactivity of your app, allowing for dynamic, complex interfaces. Your frontend code lives in a separate static directory and gets compiled into static assets during a build step. These assets are then securely hosted by Forge.

### The Forge Bridge

When using Custom UI, your frontend is sandboxed in an iframe for security. This means it has no direct access to the host page or Atlassian APIs. The Forge Bridge (`@forge/bridge`) is a secure JavaScript library that acts as the only way for your sandboxed frontend to communicate with the Atlassian host product. You use it for everything from fetching context about the current page (`view.getContext()`) and triggering backend functions (`invoke('myFunction', {payload})`) to simply closing a modal window (`view.close()`).

### Secure Storage

Forge provides built-in APIs for storing data (`@forge/api`), so you don't need to manage your own external database. This API ensures your app's data is stored securely within the Atlassian ecosystem, automatically respecting data residency policies. Data is partitioned per site, so you never have to worry about one customer's data being exposed to another. This is a major advantage for security and compliance.

## 2. The Standard Workflow: From Creation to Deployment

Most Forge development follows a consistent pattern of commands. Understanding this workflow is key to being productive.

### Step 1: Set Up Your Environment

Before you begin, you need a few things installed. It's also a good idea to check that they are up-to-date to avoid common issues.

1. **Node.js**: The runtime for your JavaScript code.
2. **Docker**: Required for the forge tunnel command. The tunnel runs your code in a local Docker container that accurately simulates the real AWS Lambda environment your app will run in when deployed, ensuring consistency between local development and production.
3. **Forge CLI**: The command-line tool for all Forge operations. Install it globally with `npm install -g @forge/cli`.
4. **Atlassian Account & Dev Site**: You need a free Atlassian developer site to install and test your apps on.

Once installed, log in to your Atlassian account via the CLI with `forge login`.

### Step 2: Create Your App

Navigate to your projects directory and run `forge create`. The CLI will prompt you for a name, a category (UI Kit, Custom UI, etc.), and a specific template (e.g., jira-issue-panel). This process scaffolds a new directory with all the necessary boilerplate code, including a starter manifest.yml pre-configured for your chosen template, a package.json with the required dependencies, and example source files to get you started.

### Step 3: Develop and Test Locally with tunnel

This is the most crucial command for active development. In your app's directory, run `forge tunnel`. This command does something magical: it creates a secure "tunnel" from your local machine to the Atlassian cloud. It watches your local files for changes, and any time you save, it hot-reloads the app components directly inside your Jira or Confluence site in real-time. This provides an immediate feedback loop and is much faster than redeploying for every change. Any console.log statements in your code will appear in the terminal where tunnel is running, making debugging incredibly efficient.

### Step 4: Deploy and Install Your App

Once you're happy with your changes, you need to deploy them to Atlassian's infrastructure. This is a two-step process that moves your app from your local machine to a live environment.

1. **Deploy the code**: `forge deploy` packages your app and sends it to the Forge environment you specify (by default, development). This creates a static, versioned snapshot of your app in the cloud.

2. **Install the app on a site**: `forge install` makes the deployed version of your app available on your developer site. deploy sends the code to the cloud, but install is what actually links that code to a specific Atlassian site. You'll be prompted to select a product (Jira/Confluence) and enter your site URL (e.g., your-name.atlassian.net). You must re-run `forge deploy` every time you want to update the official version of your app on your site.

### Step 5: Check Your Logs

If something goes wrong with your deployed app, your first stop should be the logs. You can view logs for your deployed app by running `forge logs`. Note that this shows logs from the version of the app that you deployed with `forge deploy`, not the local version running via `forge tunnel`.

## 3. Best Practices & Where to Go Next

### Start with UI Kit
If you're new to Forge, build your first app with UI Kit. It removes the complexity of a frontend build process (like Webpack) and lets you focus on the core Forge concepts: modifying the manifest, writing backend functions, and calling platform APIs.

### Least Privilege Principle
In your manifest.yml, only request the scopes (permissions) your app absolutely needs to function. If your app only reads issue data, don't ask for permission to write it. Administrators are more likely to trust and install apps that ask for minimal permissions.

### Understand the Forge APIs
Realize there are two main types of APIs you'll use:
- **The Forge Platform API** (`@forge/api`) is used in your backend functions for platform-level features like storage (`storage.set`) and triggers.
- **The Product REST APIs** are what you use to interact with Jira or Confluence data, and you call them using a built-in, authenticated fetch client (e.g., `api.asUser().requestJira(...)`).

### Use the Community
The Atlassian Developer Community is an excellent resource. Before posting a new question, search for your error message or problem. It's highly likely another developer has faced the same issue, and a solution is already available.

### Explore Tutorials
Look for tutorials from sources like Elements Apps or blogs on DEV Community. They often provide project-based learning that is easier to digest than the reference documentation and shows how all the pieces fit together in a practical context.

## Conclusion

This guide should give you a solid foundation. The best way to learn is to start building, so pick a simple template and start experimenting with the `forge tunnel` command. Happy coding!