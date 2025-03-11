import create from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfileState {
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
}

// Store per condividere lo stato dell'immagine profilo tra componenti
// con persistenza nel localStorage
const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      profileImage: null,
      setProfileImage: (image) => set({ profileImage: image }),
    }),
    {
      name: 'user-profile-storage', // nome della chiave nel localStorage
      getStorage: () => localStorage, // usa localStorage come storage
    }
  )
);

export default useUserProfileStore;
