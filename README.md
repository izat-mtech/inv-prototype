# Fish Inventory Prototype

A React and TypeScript demo of receipt submission, supervisor review, stock posting and batch history. The demo starts with one fictional pending receipt for 100 kg. Use the role switch to review it as a Supervisor. Demo changes stay in the current browser. Reset demo restores the sample receipt.

## Publish to GitHub Pages

1. Create an empty public GitHub repository named `fish-inventory-prototype`. Leave the README, gitignore and license unchecked. The repository should contain only fictional demo data and source intended to be public.
2. Open this extracted folder in VS Code. In the terminal, initialise Git and push the source. Replace `YOUR-USERNAME` with your GitHub username.

   ```powershell
   git init -b main
   git add .
   git commit -m "Add fish inventory prototype"
   git remote add origin https://github.com/YOUR-USERNAME/fish-inventory-prototype.git
   git push -u origin main
   ```

3. In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions → Deploy to GitHub Pages → Run workflow**, select `main` and run it. The initial push can trigger the workflow before Pages is enabled, so run it again after selecting the source if needed.
5. After the workflow succeeds, open **Settings → Pages** to find the published URL. Open it in a private browser window to check anonymous access. Try approving the 100 kg receipt and verify the inventory balance and batch history.

Future pushes to `main` rebuild and deploy to the same Pages site. Vite uses relative asset paths so the build works under a repository subfolder. Navigation uses URL fragments, which keep receipt links working when reloaded from GitHub Pages.

## Develop in VS Code

Use Node.js 24 LTS. Open the project folder and run:

```powershell
npm ci
npm run dev
```

Use `npm run build` to check the TypeScript and generate `dist/`. On GitHub, the workflow installs dependencies and builds the site. The role selector simulates permissions for the demonstration. This static app has no shared database.
