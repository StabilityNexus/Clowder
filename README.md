<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center">
  <img alt="Stability Nexus" src="public/stability.svg" width="175">
  &nbsp;&nbsp;&nbsp;
  <img src="public/plusSign.svg" width="30" height="175" />
  &nbsp;&nbsp;&nbsp;
  <img src="public/clowder-logo.svg" width="175" />
</div>

&nbsp;

<!-- Organization Name -->
<div align="center">

[![Static Badge](https://img.shields.io/badge/Stability_Nexus-/Clowder-228B22?style=for-the-badge&labelColor=FFC517)](https://clowder.stability.nexus)

</div>

<!-- Socials -->
<p align="center">
<a href="https://t.me/StabilityNexus">
<img src="https://img.shields.io/badge/Telegram-black?style=flat&logo=telegram&logoColor=white&color=24A1DE"/></a>
&nbsp;&nbsp;
<a href="https://x.com/StabilityNexus">
<img src="https://img.shields.io/twitter/follow/StabilityNexus"/></a>
&nbsp;&nbsp;
<a href="https://discord.gg/YzDKeEfWtS">
<img src="https://img.shields.io/discord/995968619034984528?style=flat&logo=discord&logoColor=white&label=Discord&labelColor=5865F2&color=57F287"/></a>
&nbsp;&nbsp;
<a href="https://news.stability.nexus/">
<img src="https://img.shields.io/badge/Medium-black?style=flat&logo=medium&color=white"/></a>
&nbsp;&nbsp;
<a href="https://linkedin.com/company/stability-nexus">
<img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&color=0A66C2"/></a>
&nbsp;&nbsp;
<a href="https://www.youtube.com/@StabilityNexus">
<img src="https://img.shields.io/youtube/channel/subscribers/UCZOG4YhFQdlGaLugr_e5BKw?style=flat&logo=youtube&labelColor=FF0000&color=FF0000"/></a>
</p>

&nbsp;

<p align="center">
  <strong>
    Clowder is a minimalistic platform for creating and managing CATs (Contribution Accounting Tokens) — fungible tokens used to track value contributions inside decentralized organizations.
  </strong>
</p>

---

# 🐾 Clowder

> Fun fact: **A group of cats is called a "clowder".**  
Just like that, Clowder groups and tracks contributions from multiple members inside decentralized projects.

Clowder enables anyone to deploy a **CAT (Contribution Accounting Token)** with customizable minting rules and governance parameters.  
These tokens serve as transparent accounting tools for DAOs and community-driven projects.

Learn more about CATs:  
👉 https://docs.stability.nexus/about-us/the-stable-order/cats

---

# 🧬 CAT Token Characteristics

Each CAT contract created through Clowder has the following properties:

1. Initial supply starts at **zero**.  
2. The deployer becomes the **initial owner**.  
3. CATs can have **multiple owners**.  
4. **All owners can mint** tokens.  
5. **Optional maximum supply** to prevent inflation.  
6. **Threshold supply** defines unrestricted minting.  
7. **Maximum expansion rate** limits inflation above the threshold.  
8. Owners may **permanently decrease** max supply and threshold.  
9. Owners may **reduce** expansion rate permanently.  
10. Transfers may be **restricted to existing holders**.  
11. Owners may **permanently disable** transfer restrictions.

### Frontend Pages

# 🖥 Platform Frontend Pages

### **1. Landing Page**
- “Create CAT” button → Navigates to CAT Creation  
- Input field → User enters a CAT contract address  
- “Use CAT” button → Navigates to CAT Page for that contract  

### **2. CAT Page**
Displays full CAT state:
- Total supply  
- Max supply  
- Threshold  
- Max expansion rate  
- Transfer restriction status  

If wallet is connected **and user is an owner**, the page also allows:
- Minting tokens  
- Updating parameters  

### **3. Create CAT Page**
- Form to input constructor parameters  
- “Deploy CAT” button triggers contract deployment via factory  

### **4. My CATs Page**
- Shows all CAT token contracts **owned by the connected wallet**  
- No backend — ownership mapping is stored in the factory contract  

---

# 🛠 Tech Stack

- **Next.js**  
- **TailwindCSS**  
- **ShadCN UI**  
- **Viem / Wagmi** for blockchain interactions  
- **Factory contract** stores CAT ownership mapping  

---

# 🧪 Local Setup Instructions

Follow these steps to run Clowder locally.

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/clowder.git
cd clowder
```

---

## 2. Install Dependencies

```bash
npm install
# or
yarn install
```

---

## 3. Set Environment Variables

Create a `.env` file in the project root:

```
NEXT_PUBLIC_PROJECT_ID=your-project-id
```

---

## 4. Obtain Your Project ID

1. Go to https://cloud.reown.com  
2. Log in or create an account  
3. Create a new project  
4. Locate the **Project ID / API Key**  
5. Place it in your `.env` file  

---

## 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Your app will be available at:

👉 http://localhost:3000

---

# 🌍 Community

- Stability Nexus Docs — https://docs.stability.nexus/  
- Discord — https://discord.gg/YzDKeEfWtS  

---

© 2025 The Stable Order
