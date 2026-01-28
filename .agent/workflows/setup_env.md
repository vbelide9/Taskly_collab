---
description: How to install Node.js and Firebase CLI
---

This workflow helps you set up a stable Node.js environment and install the Firebase CLI.

1.  **Check/Install Homebrew** (Mac Package Manager)
    ```bash
    // turbo
    if ! command -v brew &> /dev/null; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo "Homebrew is already installed."
    fi
    ```

2.  **Install Node.js (LTS)**
    We recommend using the LTS (Long Term Support) version for stability.
    ```bash
    // turbo
    brew install node@20
    brew link --overwrite node@20 --force
    ```

3.  **Verify Node & NPM**
    ```bash
    node -v
    npm -v
    ```

4.  **Install Firebase CLI**
    ```bash
    // turbo
    npm install -g firebase-tools
    ```

5.  **Verify Firebase**
    ```bash
    firebase --version
    ```
