<div align="center">

# 🏋️ Squat Game

### AI-Powered Motion Detection Fitness Game

_Get fit while having fun with real-time squat tracking and AI coaching!_

[![Made with React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.6-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Setup](#️-setup-guide) • [Tech Stack](#-tech-stack)

</div>

---

## 🎯 Features

<table>
<tr>
<td width="50%">

### 🎥 **Real-time Motion Tracking**

- Uses MediaPipe Pose detection
- Accurate squat counting
- Form feedback in real-time
- Works with any webcam

</td>
<td width="50%">

### 🤖 **AI Coaching**

- Powered by Google Gemini
- Personalized motivation
- Real-time encouragement
- Smart workout tips

</td>
</tr>
<tr>
<td width="50%">

### 🏆 **Leaderboard System**

- Global rankings
- Anonymous authentication
- Firebase Firestore backend
- Track your progress

</td>
<td width="50%">

### 📱 **Responsive Design**

- Works on desktop & mobile
- Beautiful gradient UI
- Smooth animations
- Modern interface

</td>
</tr>
</table>

---

## 🚀 Demo

> **Note:** This app requires webcam access to track your movements.

1. **Allow webcam access** when prompted
2. **Position yourself** so your full body is visible
3. **Start squatting!** The AI will count and motivate you
4. **Check the leaderboard** to see your rank

---

## ⚡ Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/your-username/squat-game.git
cd squat-game

# 2. Install dependencies
npm install

# 3. Set up your environment variables (see setup guide below)
cp .env.example .env
# Edit .env with your API keys

# 4. Start the development server
npm run dev
```

**That's it!** Open `http://localhost:5173` in your browser 🎉

---

## 🛠️ Setup Guide

### Prerequisites

- **Node.js** 18+ ([Download here](https://nodejs.org/))
- **npm** or **yarn**
- A **webcam** (for motion detection)
- **Firebase account** (free tier works!)
- **Google Cloud account** (for Gemini API)

---

### Step 1: Firebase Setup 🔥

<details>
<summary><b>Click to expand Firebase setup instructions</b></summary>

1. **Go to [Firebase Console](https://console.firebase.google.com/)**

2. **Create a new project** or select an existing one

3. **Add a web app:**

   - Click "Add app" → Web icon
   - Give it a nickname (e.g., "Squat Game")
   - Copy the configuration values

4. **Enable Authentication:**

   - Go to `Authentication` → `Sign-in method`
   - Enable **Anonymous** sign-in

5. **Create Firestore Database:**

   - Go to `Firestore Database` → `Create database`
   - Start in **production mode**
   - Choose a location

6. **Set Firestore Security Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /leaderboard/{documentId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

</details>

---

### Step 2: Google Gemini API Setup 🤖

<details>
<summary><b>Click to expand Gemini API setup instructions</b></summary>

1. **Go to [Google AI Studio](https://makersuite.google.com/app/apikey)**

2. **Create API Key:**

   - Click "Get API Key"
   - Create a new key or use existing
   - Copy your API key

3. **Important:** Keep this key secret!

</details>

---

### Step 3: Environment Variables Setup 🔐

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# Firebase Configuration (from Step 1)
VITE_FIREBASE_API_KEY=AIzaSy...your-actual-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEFGH

# Google Gemini API (from Step 2)
VITE_GEMINI_API_KEY=AIzaSy...your-gemini-key
```

> ⚠️ **Security Warning:** Never commit your `.env` file to Git!

---

### Step 4: Run the Project 🎮

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:5173` and start squatting! 💪

---

## 📁 Project Structure

```
squat-game/
├── 📂 public/              # Static assets
│   ├── sounds/             # Audio files
│   └── ...
├── 📂 src/
│   ├── 📂 components/      # React components
│   │   ├── LoginScreen.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── WorkoutArea.tsx
│   │   └── ...
│   ├── 📂 contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── 📂 hooks/           # Custom React hooks
│   │   ├── useSquatDetection.ts
│   │   └── useSoundEffects.ts
│   ├── 📂 services/        # API services
│   │   ├── dbService.ts
│   │   └── geminiService.ts
│   ├── firebase.ts         # Firebase config
│   ├── types.ts            # TypeScript types
│   └── App.tsx             # Main app component
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies
└── README.md               # You are here!
```

---

## 🎨 Tech Stack

| Category             | Technology                     |
| -------------------- | ------------------------------ |
| **Frontend**         | React 18 + TypeScript          |
| **Styling**          | TailwindCSS (or CSS modules)   |
| **Motion Detection** | MediaPipe Pose                 |
| **AI**               | Google Gemini API              |
| **Backend**          | Firebase (Auth + Firestore)    |
| **Build Tool**       | Vite                           |
| **Hosting**          | Firebase Hosting (recommended) |

---

## 🐛 Troubleshooting

<details>
<summary><b>Webcam not working</b></summary>

- Make sure you **allowed camera access** in your browser
- Check if another app is using the camera
- Try reloading the page
- Use a different browser (Chrome/Edge recommended)

</details>

<details>
<summary><b>"API Key missing" error</b></summary>

- Check your `.env` file exists
- Make sure variable names start with `VITE_`
- Restart the dev server after changing `.env`
- Verify API keys are correct (no extra spaces)

</details>

<details>
<summary><b>Firebase errors</b></summary>

- Verify Firebase config in `.env`
- Check if Anonymous auth is enabled
- Make sure Firestore database is created
- Review Firestore security rules

</details>

<details>
<summary><b>Squats not being detected</b></summary>

- Ensure your **full body** is visible in the camera
- Stand in a **well-lit area**
- Make sure pose landmarks are showing
- Try adjusting your distance from camera

</details>

---

## 📝 Usage Tips

- 🎯 **Best Results:** Stand 2-3 meters from your webcam
- 💡 **Lighting:** Make sure you're well-lit from the front
- 👕 **Clothing:** Wear contrasting colors for better detection
- 📏 **Framing:** Keep your whole body in frame
- 🔊 **Sound:** Enable audio for better experience

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🎉 Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) - For pose detection
- [Google Gemini](https://ai.google.dev/) - For AI coaching
- [Firebase](https://firebase.google.com/) - For backend services
- [React](https://reactjs.org/) - For the amazing framework

---

## 💬 Support

Having issues? Got questions?

- 📧 **Email:** your-email@example.com
- 💬 **Discord:** [Join our community](#)
- 🐛 **Issues:** [Report bugs here](https://github.com/your-username/squat-game/issues)

---

<div align="center">

### ⭐ If you find this project useful, please consider giving it a star!

**Made with ❤️ and 🏋️ by [Your Name]**

[⬆ Back to Top](#-squat-game)

</div>
