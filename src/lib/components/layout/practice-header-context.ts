import { createContext } from 'svelte';

export const [getPracticeHeader, setPracticeHeader] = createContext<{ active: boolean }>();
