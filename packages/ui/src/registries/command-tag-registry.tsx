import type { EngineRecipeRecord } from "@fraym/driver";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { IconName } from "../icons";
export interface CommandTagDisplay { readonly label: string; readonly icon?: IconName }
export type CommandTagResolver = (token: string) => CommandTagDisplay | null;
const decline: CommandTagResolver = () => null;
const NO_RECIPES: readonly EngineRecipeRecord[] = [];
const CommandTagContext = createContext<CommandTagResolver>(decline);
export function useCommandTagResolver() { return useContext(CommandTagContext); }
export interface CommandTagProviderProps { readonly recipes?: readonly EngineRecipeRecord[]; readonly children?: ReactNode }
export function CommandTagProvider({ recipes = NO_RECIPES, children }: CommandTagProviderProps) { const resolver = useMemo<CommandTagResolver>(() => { const map = new Map(recipes.map(recipe => [`/${recipe.id}`, { label: recipe.name ?? recipe.id, ...(recipe.icon ? { icon: recipe.icon as IconName } : {}) }])); return token => { const known = map.get(token); if (known) return known; const skill = /^\/skill:([\w-]+)$/.exec(token)?.[1]; return skill ? { label: skill, icon: "spark" as const } : null; }; }, [recipes]); return <CommandTagContext.Provider value={resolver}>{children}</CommandTagContext.Provider>; }
