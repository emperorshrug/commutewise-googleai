import { create } from 'zustand';
import { UserProfile, CalculatedRoute, FavoriteLocation } from '../types';
import { supabase } from '../lib/supabase';

interface AppState {
  // USER STATE
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  setGuestUser: () => void;
  
  // T&C STATE
  hasAcceptedTerms: boolean;
  setAcceptedTerms: (accepted: boolean) => void;

  // ROUTING STATE
  currentRoute: CalculatedRoute | null;
  setRoute: (route: CalculatedRoute | null) => void;

  // UI STATE
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  isSelectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  hideGlobalFab: boolean;
  setHideGlobalFab: (hide: boolean) => void;

  // FAVORITES STATE
  favorites: FavoriteLocation[];
  fetchFavorites: () => Promise<void>;
  addFavorite: (fav: FavoriteLocation) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  updateFavorite: (fav: FavoriteLocation) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user && user.role !== 'guest' }),
  
  setGuestUser: () => set({ 
    user: { 
      id: 'guest', 
      email: '', 
      display_name: 'Guest Commuter', 
      username: 'guest', 
      role: 'guest' 
    }, 
    isAuthenticated: false 
  }),

  // T&C LOGIC WITH LOCAL STORAGE
  hasAcceptedTerms: localStorage.getItem('cw_terms_accepted') === 'true',
  setAcceptedTerms: (accepted) => {
    localStorage.setItem('cw_terms_accepted', String(accepted));
    set({ hasAcceptedTerms: accepted });
  },

  currentRoute: null,
  setRoute: (route) => set({ currentRoute: route }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  isSelectionMode: false,
  setSelectionMode: (mode) => set({ isSelectionMode: mode }),
  
  hideGlobalFab: false,
  setHideGlobalFab: (hide) => set({ hideGlobalFab: hide }),

  favorites: [],
  
  fetchFavorites: async () => {
    const user = get().user;
    if (!user || user.role === 'guest') return;

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ favorites: data });
    }
  },

  addFavorite: async (fav) => {
    const user = get().user;
    if (!user || user.role === 'guest') {
      // Local only for guest (or block action)
      set((state) => ({ favorites: [fav, ...state.favorites] }));
      return;
    }

    const { data, error } = await supabase.from('favorites').insert({
      user_id: user.id,
      name: fav.name,
      address: fav.address,
      note: fav.note,
      icon: fav.icon
    }).select().single();

    if (!error && data) {
        set((state) => ({ favorites: [data, ...state.favorites] }));
    }
  },

  removeFavorite: async (id) => {
     const user = get().user;
     if (user && user.role !== 'guest') {
         await supabase.from('favorites').delete().eq('id', id);
     }
     set((state) => ({ favorites: state.favorites.filter(f => f.id !== id) }));
  },

  updateFavorite: async (updatedFav) => {
     const user = get().user;
     if (user && user.role !== 'guest') {
         await supabase.from('favorites').update({
             name: updatedFav.name,
             address: updatedFav.address,
             note: updatedFav.note,
             icon: updatedFav.icon
         }).eq('id', updatedFav.id);
     }
     set((state) => ({
        favorites: state.favorites.map(f => f.id === updatedFav.id ? updatedFav : f)
     }));
  },
}));