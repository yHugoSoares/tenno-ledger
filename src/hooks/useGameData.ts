import { useEffect, useState } from 'react';
import { loadRecipes, loadRelics, type Relic, type RecipeMap } from '@/lib/gameData';

interface GameDataState {
  recipes: RecipeMap | null;
  relics: Relic[] | null;
  error: string | null;
}

export function useGameData(): GameDataState {
  const [state, setState] = useState<GameDataState>({ recipes: null, relics: null, error: null });

  useEffect(() => {
    let active = true;
    Promise.all([loadRecipes(), loadRelics()])
      .then(([recipes, relics]) => {
        if (active) setState({ recipes, relics, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            recipes: null,
            relics: null,
            error: error instanceof Error ? error.message : 'Could not load game data.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
