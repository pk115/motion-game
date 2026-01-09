import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/components/LoginScreen';
import GameMenu from './components/GameMenu';
import SquatClimberGame from './components/SquatClimberGame';
import MosquitoGame from './components/MosquitoGame';
import TrainDodgeGame from './components/TrainDodgeGame';
import HighKneesGame from './components/HighKneesGame';
import ArmCirclesGame from './components/ArmCirclesGame';
import GhostPuncherGame from './components/GhostPuncherGame';
import LaserDodgeGame from './components/LaserDodgeGame';
import LandingPage from './src/components/LandingPage';

import Leaderboard from './src/components/Leaderboard';

type Screen = 'landing' | 'login' | 'menu' | 'climber' | 'mosquito' | 'train' | 'highknees' | 'wizard' | 'ghost' | 'laser' | 'leaderboard';

const GameContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [leaderboardGame, setLeaderboardGame] = useState<string>('climber');

  // Auto-redirect to menu if user logs in while on login screen
  useEffect(() => {
    if (user && currentScreen === 'login') {
      setCurrentScreen('menu');
    }
  }, [user, currentScreen]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#10b981', fontSize: '24px', fontFamily: 'sans-serif' }}>Arcade Loading...</div>;
  }

  // Screen Routing Logic
  const renderContent = () => {
    // 1. Landing Page (Public)
    if (currentScreen === 'landing') {
      return <LandingPage onStart={() => setCurrentScreen(user ? 'menu' : 'login')} />;
    }

    // 2. Login Gate (only if not user)
    if (!user) {
      return <LoginScreen />;
    }

    // 3. Authenticated Routes
    switch (currentScreen) {
      case 'climber':
        return <SquatClimberGame onBack={() => setCurrentScreen('menu')} />;
      case 'mosquito':
        return <MosquitoGame onBack={() => setCurrentScreen('menu')} />;
      case 'train':
        return <TrainDodgeGame onBack={() => setCurrentScreen('menu')} />;
      case 'highknees':
        return <HighKneesGame onBack={() => setCurrentScreen('menu')} />;
      case 'wizard':
        return <ArmCirclesGame onBack={() => setCurrentScreen('menu')} />;
      case 'ghost':
        return <GhostPuncherGame onBack={() => setCurrentScreen('menu')} />;
      case 'laser':
        return <LaserDodgeGame onBack={() => setCurrentScreen('menu')} />;
      case 'leaderboard':
        return <Leaderboard onBack={() => setCurrentScreen('menu')} initialGameId={leaderboardGame} />;
      case 'menu':
      default:
        return (
          <GameMenu
            onSelectGame={(gameId) => setCurrentScreen(gameId as Screen)}
            onViewLeaderboard={(gameId) => {
              setLeaderboardGame(gameId);
              setCurrentScreen('leaderboard');
            }}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameContent />
    </AuthProvider>
  );
};


export default App;