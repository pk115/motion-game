import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { User, ScoreEntry, LeaderboardLevel, LeaderboardCategory } from '../../types';

export const saveUser = async (user: User) => {
  if (!user.uid) return;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      createdAt: serverTimestamp(),
      // Default location if not provided
      location: user.location || {
        province: 'Unknown',
        country: 'Unknown',
        continent: 'Unknown'
      }
    });
  } else {
      // Update basic info on login if changed
      await updateDoc(userRef, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp()
      });
  }
};

export const updateUserLocation = async (uid: string, location: User['location']) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { location });
};

export const saveScore = async (user: User, score: number, category: LeaderboardCategory, gameId: string) => {
  if (!user.uid || !user.location) return;

  const userRef = doc(db, 'users', user.uid);
  
  // Update User Stats (using dot notation for nested fields if we had them, but for now simple prefix or just leaderboard focus)
  // For simplicity, let's say 'totalScore' on User is specifically for the main Squat game (legacy compatibility)
  // But for the Leaderboard collection, we will use the gameId to separate them.
  
  // If gameId is 'climber', we update the legacy totalScore/maxEndurance for backward compatibility
  if (gameId === 'climber') {
      if (category === 'cumulative') {
          await updateDoc(userRef, { totalScore: increment(score) });
      } else if (category === 'endurance') {
          const userSnap = await getDoc(userRef);
          const currentMax = userSnap.data()?.maxEndurance || 0;
          if (score > currentMax) {
              await updateDoc(userRef, { maxEndurance: score });
          }
      }
  }

  // Save to History
  await setDoc(doc(collection(db, 'scores')), {
      uid: user.uid,
      gameId,
      score,
      category,
      timestamp: serverTimestamp(),
      location: user.location
  });
  
  // Update Leaderboard Entries
  let scoreToUpdate = score;
  
  // For cumulative, we need to fetch the specific game total. 
  // Since we haven't migrated User object to have per-game totals, we'll calculate it from Leaderboard? No that's expensive.
  // We should query the existing leaderboard entry to get current total + new score.
  
  const levels: LeaderboardLevel[] = ['province', 'country', 'continent', 'world'];
  
  for (const level of levels) {
      const locationValue = level === 'world' ? 'Earth' : user.location[level];
      if (!locationValue) continue;

      const leaderboardId = `${level}_${locationValue}_${gameId}_${category}_${user.uid}`;
      const lbRef = doc(db, 'leaderboards', leaderboardId);
      
      if (category === 'cumulative') {
          // Atomic increment for leaderboard entry
          await setDoc(lbRef, {
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL,
              score: increment(score),
              category,
              gameId,
              level,
              locationValue,
              timestamp: serverTimestamp()
          }, { merge: true });
      } else {
          // Endurance: Check if existing is higher
          // We can use a transaction or just read-write. For low traffic read-write is fine.
          // Or define that we only call saveScore if it's a new high score?
          // Let's assume the client only calls this if they finished a game.
          // Better: Use merge with check? Firestore doesn't support "set if greater" easily.
          // We'll just read first.
          const lbSnap = await getDoc(lbRef);
          const currentScore = lbSnap.exists() ? lbSnap.data().score : 0;
          
          if (score > currentScore) {
               await setDoc(lbRef, {
                  uid: user.uid,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  score,
                  category,
                  gameId,
                  level,
                  locationValue,
                  timestamp: serverTimestamp()
              });
          }
      }
  }
};

export const getLeaderboard = async (
    level: LeaderboardLevel, 
    locationValue: string, 
    category: LeaderboardCategory,
    gameId: string,
    limitCount: number = 20
): Promise<ScoreEntry[]> => {
    const q = query(
        collection(db, 'leaderboards'),
        where('level', '==', level),
        where('locationValue', '==', locationValue),
        where('category', '==', category),
        where('gameId', '==', gameId),
        orderBy('score', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        uid: doc.data().uid,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        score: doc.data().score,
        gameId: doc.data().gameId,
        location: doc.data().locationValue,
        timestamp: doc.data().timestamp
    }));
};
