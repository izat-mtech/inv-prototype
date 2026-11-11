# Fish Inventory Prototype

This browser prototype uses fictional records. The profile switch at the top left changes between Store Officer and Supervisor. Select **Reset demo data** from the same menu to restore the sample records. Changes stay in the current browser.

| Tab | Demonstration |
| --- | --- |
| Dashboard | Stock and review totals, a seven-day receipt/issue chart, stock status breakdown and recent activity |
| Inventory | Searchable stock by batch and site, with on-hand, available, held, spoiled and in-transit quantities |
| Stock Receive | Create a receipt, then approve and post it as Supervisor |
| Stock Issue | Record the recipient and purpose, approve the issue, then confirm handover |
| Stock Transfer | Review transfers, dispatch and confirm full or partial arrival. The Adjustments view records and reviews count corrections |
| Spoilage | Place stock on hold for review, confirm spoilage, and separately approve and confirm disposal |
| Reports | Inventory, Movement, Spoilage and Audit reports, with CSV export and browser printing to PDF |

In a transaction tab, select a reference to review or act on it. Try the pending 100 kg receipt in **Stock Receive**. Approving it as Supervisor adds the batch to Inventory and updates the dashboard and reports. Returning a record lets the Store Officer correct it and resubmit. The demo also includes a partially received transfer.

## Update an existing GitHub Pages repo

1. Copy the contents of this folder into your existing GitHub repo checkout, including `.github/workflows/deploy.yml`. Keep the repo's `.git` directory.
2. From that checkout, commit and push to `main`.
3. Verify **Settings → Pages → Source** is set to **GitHub Actions**.
4. Check **Actions → Deploy to GitHub Pages** for a successful run. If necessary, enable the workflow and run it manually on `main`. The published URL is shown under **Settings → Pages**.

## Start a new GitHub Pages repo

1. Create an empty GitHub repository called `fish-inventory-prototype`. For the free public Pages setup, choose Public and leave README, gitignore and license unchecked. Commit only fictional records and source intended to be public.
2. Open the extracted project folder in VS Code. Run the following in its terminal, replacing `YOUR-USERNAME` with your GitHub username.

   ```powershell
   git init -b main
   git add .
   git commit -m "Add fish inventory prototype"
   git remote add origin https://github.com/YOUR-USERNAME/fish-inventory-prototype.git
   git push -u origin main
   ```

3. Set **Settings → Pages → Source** to **GitHub Actions**, then select **Actions → Deploy to GitHub Pages → Run workflow** on `main`. The initial push can trigger a run before Pages is configured. If it does, run it again after selecting the source.

The Vite build uses relative asset URLs and hash navigation for repository subfolders. Pushes to `main` update the same Pages URL when the workflow is enabled.

## Run in VS Code

Use Node.js 24 LTS.

```powershell
npm ci
npm run dev
npm run build
```

The role switch simulates access for a walkthrough. This static demo uses browser storage for its transaction history.
