require("dotenv").config();
const path = require("path");
const fs = require("fs");
const launchBrowser = require("./launchBrowser.js");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const sitehtml = process.env.sitehtml;

class Team {
  constructor(name, page, link_path = "", season = "2026", outputPath = "") {
    this.team_name = name;
    this.season = season;
    this.page = page;

    this.outputPath = path.join(__dirname, outputPath || `${name}_scores.txt`);
    this.link_path = path.join(__dirname, link_path || `${name}_links.txt`);


    this.riderLinks = [];
    this.points = [];
    this.riders = [];
    this.pointTotal = 0;
  }

  async getLinks() {
    this.riderLinks = fs
      .readFileSync(this.link_path, "utf8")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean); // drop blank lines

    // console.log('this.riderLinks:', this.riderLinks)
  }

  async getRiders() {
    // let i = 0;
    for (const link of this.riderLinks) {
      // i++;
      const url = `${link}/${this.season}`;
      console.log("url: ", url);

      // await sleep(rand(2500, 6500));
      // if ((i + 1) % 7 === 0) await sleep(rand(20000, 45000));
      await this.page.goto(url, { timeout: 200000, waitUntil: "domcontentloaded" });

      await this.page.waitForFunction(
        () => document.querySelector(".rdrSeasonSum")?.innerText.includes("UCI points"),
        { timeout: 200000 }
      );

      const uciPoints = await this.page.$eval(".rdrSeasonSum", (el) => {
        const m = el.innerText.match(/UCI points:\s*(\d+)/);
        return m ? Number(m[1]) : null;
      }).catch(() => null); // if selector missing etc.

      this.points.push(Number.isFinite(uciPoints) ? uciPoints : null);
      this.riders.push(link.split("/").filter(Boolean).pop() ?? link);
    }

    this.pointTotal = this.points.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

    console.log("TOTAL:", this.pointTotal);
  }

  async writeFile() {
    const lines = [
      `TOTAL\t${this.pointTotal}`,
      ...this.riders.map((rider, i) => `${rider}\t${this.points[i] === null ? "NULL" : this.points[i]}`)
    ];

    fs.writeFileSync(this.outputPath, lines.join("\n"), "utf8");
  }
}

// async function getLinks(link_path) {
//     const riderLinks = fs
//       .readFileSync(link_path, "utf8")
//       .split(/\r?\n/)
//       .map(s => s.trim())
//       .filter(Boolean); // drop blank lines

//     return riderLinks
//   }

(async () => {
  const headless = "new";
  const page = await launchBrowser(headless, sitehtml);
  const for_season = "2026"

  const papaya = new Team("papaya", page, link_path = "", season = for_season); 
  await papaya.getLinks();
  await papaya.getRiders();
  await papaya.writeFile();

  const yahaha = new Team("yahaha", page, link_path = "", season = for_season); 
  await yahaha.getLinks();
  await yahaha.getRiders();
  await yahaha.writeFile();

  
  const papayaw = new Team("papaya_w", page, link_path = "papaya_links_w.txt", season = for_season); 
  await papayaw.getLinks();
  await papayaw.getRiders();
  await papayaw.writeFile();

  const yahahaw = new Team("yahaha_w", page, link_path = "yahaha_links_w.txt", season = for_season); 
  await yahahaw.getLinks();
  await yahahaw.getRiders();
  await yahahaw.writeFile();

  await page.browser().close();
})();
