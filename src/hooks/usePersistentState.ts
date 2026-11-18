import { useState, useEffect, useCallback } from 'react';
import {
  PersistentState,
  DEFAULT_STATE,
  loadStateFromLocalStorage,
  saveStateToLocalStorage,
  STORAGE_KEY,
  hydrateState,
} from '../services/storage';

export function usePersistentState() {
  const [state, setInternalState] = useState<PersistentState>(() => {
    return loadStateFromLocalStorage();
  });

  // Sync to localStorage whenever state changes
  useEffect(() => {
    saveStateToLocalStorage(state);
  }, [state]);

  // Listen to external window storage events for multi-tab synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const hydrated = hydrateState(e.newValue, DEFAULT_STATE);
        setInternalState(hydrated);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setState = useCallback(
    (updater: PersistentState | ((prev: PersistentState) => PersistentState)) => {
      setInternalState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
    },
    []
  );

  return { state, setState };
}
