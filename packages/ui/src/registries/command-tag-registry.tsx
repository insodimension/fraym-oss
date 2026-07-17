import type { EngineRecipeRecord } from "@fraym/driver";
import { createContext, type ReactNode, useContext, useMemo } from "react";
export interface CommandTagDisplay { readonly label: string; readonly icon?: string }
export type CommandTagResolver = (token: string) => CommandTagDisplay | null;
const decline: CommandTagResolver = () => null;
const CommandTagContext = createContext<CommandTagResolver>(decline);
export function useCommandTagResolver() { return useContext(CommandTagContext); }
export interface CommandTagProviderProps { readonly recipes?: readonly EngineRecipeRecord[]; readonly children: ReactNode }
export function CommandTagProvider({ recipes = [], children }: CommandTagProviderProps) { const resolver = useMemo<CommandTagResolver>(() => { const map = new Map(recipes.map(recipe => [`/${recipe.id}`, { label: recipe.name ?? recipe.id, ...(recipe.icon ? { icon: recipe.icon } : {}) }])); return token => { const known = map.get(token); if (known) return known; const skill = /^\/skill:([\w-]+)$/.exec(token)?.[1]; return skill ? { label: skill, icon: "spark" } : null; }; }, [recipes]); return <CommandTagContext.Provider value={resolver}>{children}</CommandTagContext.Provider>; }
