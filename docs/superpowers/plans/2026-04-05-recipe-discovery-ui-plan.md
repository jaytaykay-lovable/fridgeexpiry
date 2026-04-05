# Recipe Discovery UI & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete UI for recipe discovery — a new Recipes tab, discovery page with ingredient/mood selection, recipe results cards, recipe detail page, and cook confirmation dialog — using mock data.

**Architecture:** Two new pages (RecipeDiscoveryPage, RecipeDetailPage) with shared UI components (RecipeCard, IngredientChip, MoodChip, CookConfirmationDialog, ExpiryBanner). Navigation integrates into existing bottom nav and InventoryPage. All data is mocked — no API calls or Supabase writes in this phase.

**Tech Stack:** React 18 · TypeScript · Tailwind CSS · shadcn/ui (Dialog, Badge) · Framer Motion · React Router DOM · Zustand (mock store) · Vitest

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/types/recipe.ts` | TypeScript interfaces for all recipe data structures |
| `src/store/useRecipeStore.ts` | Zustand store for recipe UI state (selection, results, mock data) |
| `src/components/ExpiryBanner.tsx` | Banner on InventoryPage when items expire soon |
| `src/components/IngredientChip.tsx` | Toggleable ingredient chip with expiry countdown |
| `src/components/MoodChip.tsx` | Mood selection chip (Quick, Comfort, Healthy, Fancy) |
| `src/components/RecipeCard.tsx` | Hero recipe card with image, metadata, match badge, missing ingredients |
| `src/components/ExploreMoreRow.tsx` | Collapsible row of additional recipe results |
| `src/components/CookConfirmationDialog.tsx` | Dialog for partial ingredient removal after cooking |
| `src/pages/RecipeDiscoveryPage.tsx` | Main recipe page — selection state + results state |
| `src/pages/RecipeDetailPage.tsx` | Full recipe detail with ingredients, instructions, cook button |
| `src/test/recipe-utils.ts` | Test helpers and mock data generators |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/recipes` and `/recipes/:id` routes, update NAV_ROUTE_ORDER |
| `src/components/BottomNav.tsx` | Add 4th Recipes tab with BookOpen icon |
| `src/pages/InventoryPage.tsx` | Add ExpiryBanner component above food list |

---

### Task 1: Recipe Types & Mock Store

**Files:**
- Create: `src/types/recipe.ts`
- Create: `src/store/useRecipeStore.ts`
- Create: `src/test/recipe-utils.ts`

- [ ] **Step 1: Write recipe type definitions**

Create `src/types/recipe.ts`:

```typescript
export interface RecipeCard {
  id: number;
  title: string;
  image: string;
  readyMinutes: number;
  servings: number;
  likes: number;
  usedIngredients: string[];
  missedIngredients: string[];
  matchScore: number; // e.g., 5 out of 6 selected
  reason: string;
  sourceUrl: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  inFridge: boolean;
}

export interface RecipeDetail extends RecipeCard {
  ingredients: RecipeIngredient[];
  instructions: { step: number; text: string }[];
}

export type MoodType = 'quick' | 'comfort' | 'healthy' | 'fancy' | null;

export interface RecipeSearchState {
  selectedIngredients: string[];
  mood: MoodType;
  results: RecipeCard[];
  currentRecipe: RecipeDetail | null;
  isLoading: boolean;
  loadingNarration: string;
}
```

- [ ] **Step 2: Write mock data generators**

Create `src/test/recipe-utils.ts`:

```typescript
import type { RecipeCard, RecipeDetail } from '@/types/recipe';

export const MOCK_RECIPES: RecipeCard[] = [
  {
    id: 1,
    title: 'Ginger Soy Chicken Stir-Fry',
    image: 'https://spoonacular.com/recipeImages/ginger-soy-chicken.jpg',
    readyMinutes: 25,
    servings: 4,
    likes: 342,
    usedIngredients: ['chicken thighs', 'ginger', 'soy sauce', 'garlic', 'spring onion'],
    missedIngredients: ['sesame oil', 'rice vinegar'],
    matchScore: 5,
    reason: 'Great way to use your expiring chicken and ginger',
    sourceUrl: 'https://spoonacular.com/ginger-soy-chicken-stir-fry-1',
  },
  {
    id: 2,
    title: 'Quick Garlic Noodles',
    image: 'https://spoonacular.com/recipeImages/garlic-noodles.jpg',
    readyMinutes: 15,
    servings: 2,
    likes: 518,
    usedIngredients: ['garlic', 'spring onion', 'noodles'],
    missedIngredients: ['oyster sauce', 'chili flakes'],
    matchScore: 3,
    reason: 'Ready in 15 minutes — perfect for a quick meal',
    sourceUrl: 'https://spoonacular.com/quick-garlic-noodles-2',
  },
  {
    id: 3,
    title: 'Honey Glazed Salmon',
    image: 'https://spoonacular.com/recipeImages/honey-salmon.jpg',
    readyMinutes: 30,
    servings: 2,
    likes: 891,
    usedIngredients: ['salmon', 'honey', 'garlic', 'ginger'],
    missedIngredients: ['mirin', 'sesame seeds'],
    matchScore: 4,
    reason: 'Uses your expiring salmon with a sweet-savory glaze',
    sourceUrl: 'https://spoonacular.com/honey-glazed-salmon-3',
  },
];

export const MOCK_RECIPE_DETAIL: RecipeDetail = {
  ...MOCK_RECIPES[0],
  ingredients: [
    { name: 'chicken thighs', amount: '4', unit: 'pieces', inFridge: true },
    { name: 'ginger', amount: '2', unit: 'tbsp grated', inFridge: true },
    { name: 'soy sauce', amount: '3', unit: 'tbsp', inFridge: true },
    { name: 'garlic', amount: '3', unit: 'cloves', inFridge: true },
    { name: 'spring onion', amount: '2', unit: 'stalks', inFridge: true },
    { name: 'sesame oil', amount: '1', unit: 'tsp', inFridge: false },
    { name: 'rice vinegar', amount: '1', unit: 'tbsp', inFridge: false },
  ],
  instructions: [
    { step: 1, text: 'Mix soy sauce, grated ginger, and minced garlic in a bowl to create the marinade.' },
    { step: 2, text: 'Marinate chicken thighs for 10 minutes.' },
    { step: 3, text: 'Heat a wok or large pan over high heat. Add chicken and cook 5-6 minutes per side until golden.' },
    { step: 4, text: 'Pour remaining marinade into the pan and cook for 1 minute until sauce thickens.' },
    { step: 5, text: 'Slice chicken, garnish with spring onions, and serve with steamed rice.' },
  ],
};

export function generateMockResults(selectedIngredients: string[]): RecipeCard[] {
  // Return all mock recipes filtered to show at least some match
  return MOCK_RECIPES.map((recipe) => ({
    ...recipe,
    matchScore: recipe.usedIngredients.filter((i) =>
      selectedIngredients.some((s) => i.toLowerCase().includes(s.toLowerCase()))
    ).length,
  }));
}
```

- [ ] **Step 3: Write mock recipe store**

Create `src/store/useRecipeStore.ts`:

```typescript
import { create } from 'zustand';
import type { MoodType, RecipeCard, RecipeDetail } from '@/types/recipe';
import { MOCK_RECIPES, MOCK_RECIPE_DETAIL, generateMockResults } from '@/test/recipe-utils';

interface RecipeState {
  selectedIngredients: string[];
  mood: MoodType;
  results: RecipeCard[];
  currentRecipe: RecipeDetail | null;
  isLoading: boolean;
  loadingNarration: string;

  setSelectedIngredients: (ingredients: string[]) => void;
  toggleIngredient: (ingredient: string) => void;
  setMood: (mood: MoodType) => void;
  searchRecipes: () => Promise<void>;
  surpriseMe: () => Promise<void>;
  selectRecipe: (recipe: RecipeCard) => Promise<void>;
  clearResults: () => void;
}

const loadingNarrations = [
  'Looking at your ingredients...',
  'Checking recipe options...',
  'Found some great matches!',
];

export const useRecipeStore = create<RecipeState>((set, get) => ({
  selectedIngredients: [],
  mood: null,
  results: [],
  currentRecipe: null,
  isLoading: false,
  loadingNarration: '',

  setSelectedIngredients: (ingredients) => set({ selectedIngredients: ingredients }),

  toggleIngredient: (ingredient) => {
    const current = get().selectedIngredients;
    const updated = current.includes(ingredient)
      ? current.filter((i) => i !== ingredient)
      : [...current, ingredient];
    set({ selectedIngredients: updated });
  },

  setMood: (mood) => set({ mood }),

  searchRecipes: async () => {
    set({ isLoading: true, loadingNarration: loadingNarrations[0] });

    // Simulate loading narrations
    await new Promise((r) => setTimeout(r, 600));
    set({ loadingNarration: loadingNarrations[1] });
    await new Promise((r) => setTimeout(r, 600));
    set({ loadingNarration: loadingNarrations[2] });
    await new Promise((r) => setTimeout(r, 400));

    const results = generateMockResults(get().selectedIngredients);
    set({ results, isLoading: false, loadingNarration: '' });
  },

  surpriseMe: async () => {
    set({ isLoading: true, loadingNarration: 'Let me pick something for you...' });
    await new Promise((r) => setTimeout(r, 1000));
    set({ results: MOCK_RECIPES, isLoading: false, loadingNarration: '' });
  },

  selectRecipe: async (_recipe: RecipeCard) => {
    // In mock mode, always return the same detail
    set({ currentRecipe: MOCK_RECIPE_DETAIL });
  },

  clearResults: () => set({ results: [], currentRecipe: null, selectedIngredients: [], mood: null }),
}));
```

- [ ] **Step 4: Write tests for the recipe store**

Create `src/store/useRecipeStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useRecipeStore } from './useRecipeStore';

describe('useRecipeStore', () => {
  beforeEach(() => {
    useRecipeStore.setState({
      selectedIngredients: [],
      mood: null,
      results: [],
      currentRecipe: null,
      isLoading: false,
      loadingNarration: '',
    });
  });

  it('should toggle ingredient selection', () => {
    useRecipeStore.getState().toggleIngredient('chicken');
    expect(useRecipeStore.getState().selectedIngredients).toContain('chicken');

    useRecipeStore.getState().toggleIngredient('chicken');
    expect(useRecipeStore.getState().selectedIngredients).not.toContain('chicken');
  });

  it('should set mood', () => {
    useRecipeStore.getState().setMood('quick');
    expect(useRecipeStore.getState().mood).toBe('quick');

    useRecipeStore.getState().setMood('comfort');
    expect(useRecipeStore.getState().mood).toBe('comfort');
  });

  it('should clear results', () => {
    useRecipeStore.setState({ results: [{ id: 1 } as any] });
    useRecipeStore.getState().clearResults();
    expect(useRecipeStore.getState().results).toHaveLength(0);
  });

  it('should search recipes and return results', async () => {
    useRecipeStore.getState().setSelectedIngredients(['chicken', 'ginger']);
    await useRecipeStore.getState().searchRecipes();
    expect(useRecipeStore.getState().results.length).toBeGreaterThan(0);
    expect(useRecipeStore.getState().isLoading).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests to verify store works**

Run: `npx vitest src/store/useRecipeStore.test.ts --run`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/recipe.ts src/store/useRecipeStore.ts src/test/recipe-utils.ts src/store/useRecipeStore.test.ts
git commit -m "feat: add recipe types, mock store, and test utilities"
```

---

### Task 2: IngredientChip & MoodChip Components

**Files:**
- Create: `src/components/IngredientChip.tsx`
- Create: `src/components/MoodChip.tsx`
- Test: `src/components/IngredientChip.test.tsx`
- Test: `src/components/MoodChip.test.tsx`

- [ ] **Step 1: Write IngredientChip tests**

Create `src/components/IngredientChip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientChip from './IngredientChip';

describe('IngredientChip', () => {
  it('renders ingredient name', () => {
    render(<IngredientChip name="chicken" isSelected={false} onToggle={() => {}} />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<IngredientChip name="chicken" isSelected={true} onToggle={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-primary');
  });

  it('shows unselected state', () => {
    render(<IngredientChip name="chicken" isSelected={false} onToggle={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-card');
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<IngredientChip name="chicken" isSelected={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows expiry countdown when provided', () => {
    render(
      <IngredientChip
        name="milk"
        isSelected={false}
        onToggle={() => {}}
        expiryDays={2}
      />
    );
    expect(screen.getByText('2d left')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement IngredientChip**

Create `src/components/IngredientChip.tsx`:

```tsx
import { motion } from 'framer-motion';

interface IngredientChipProps {
  name: string;
  isSelected: boolean;
  onToggle: () => void;
  expiryDays?: number;
}

export default function IngredientChip({ name, isSelected, onToggle, expiryDays }: IngredientChipProps) {
  const isExpiring = expiryDays !== undefined && expiryDays <= 3;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      role="button"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      <span>{name}</span>
      {isExpiring && expiryDays !== undefined && (
        <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-warning'}`}>
          {expiryDays}d left
        </span>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 3: Run IngredientChip tests**

Run: `npx vitest src/components/IngredientChip.test.tsx --run`
Expected: All 5 tests PASS

- [ ] **Step 4: Write MoodChip tests**

Create `src/components/MoodChip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodChip from './MoodChip';

describe('MoodChip', () => {
  it('renders mood label', () => {
    render(<MoodChip label="Quick" isSelected={false} onSelect={() => {}} />);
    expect(screen.getByText('Quick')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<MoodChip label="Comfort" isSelected={true} onSelect={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-primary');
  });

  it('shows unselected state', () => {
    render(<MoodChip label="Healthy" isSelected={false} onSelect={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-card');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MoodChip label="Fancy" isSelected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Implement MoodChip**

Create `src/components/MoodChip.tsx`:

```tsx
import { motion } from 'framer-motion';

interface MoodChipProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function MoodChip({ label, isSelected, onSelect }: MoodChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      role="button"
      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-medium border transition-all ${
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      {label}
    </motion.button>
  );
}
```

- [ ] **Step 6: Run MoodChip tests**

Run: `npx vitest src/components/MoodChip.test.tsx --run`
Expected: All 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/IngredientChip.tsx src/components/IngredientChip.test.tsx src/components/MoodChip.tsx src/components/MoodChip.test.tsx
git commit -m "feat: add IngredientChip and MoodChip components with tests"
```

---

### Task 3: RecipeCard Component

**Files:**
- Create: `src/components/RecipeCard.tsx`
- Test: `src/components/RecipeCard.test.tsx`

- [ ] **Step 1: Write RecipeCard tests**

Create `src/components/RecipeCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeCard from './RecipeCard';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

const mockRecipe: RecipeCardType = {
  id: 1,
  title: 'Ginger Soy Chicken Stir-Fry',
  image: 'https://example.com/chicken.jpg',
  readyMinutes: 25,
  servings: 4,
  likes: 342,
  usedIngredients: ['chicken', 'ginger', 'soy sauce'],
  missedIngredients: ['sesame oil', 'rice vinegar'],
  matchScore: 3,
  reason: 'Great way to use your expiring chicken',
  sourceUrl: 'https://example.com/recipe/1',
};

describe('RecipeCard', () => {
  it('renders recipe title', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Ginger Soy Chicken Stir-Fry')).toBeInTheDocument();
  });

  it('renders metadata (cook time, servings, likes)', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('4 servings')).toBeInTheDocument();
    expect(screen.getByText('♥ 342')).toBeInTheDocument();
  });

  it('renders ingredient match badge', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Uses 3 selected items')).toBeInTheDocument();
  });

  it('renders missing ingredients count', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('2 missing')).toBeInTheDocument();
  });

  it('expands missing ingredients when clicked', async () => {
    const user = userEvent.setup();
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    await user.click(screen.getByText('2 missing'));
    expect(screen.getByText('sesame oil')).toBeInTheDocument();
    expect(screen.getByText('rice vinegar')).toBeInTheDocument();
  });

  it('renders reason text', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Great way to use your expiring chicken')).toBeInTheDocument();
  });

  it('calls onView when View recipe button is clicked', async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    render(<RecipeCard recipe={mockRecipe} onView={onView} />);
    await user.click(screen.getByText('View recipe'));
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Implement RecipeCard**

Create `src/components/RecipeCard.tsx`:

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

interface RecipeCardProps {
  recipe: RecipeCardType;
  onView: () => void;
}

export default function RecipeCard({ recipe, onView }: RecipeCardProps) {
  const [showMissing, setShowMissing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-card border shadow-sm"
    >
      {/* Hero Image */}
      <div className="relative aspect-video bg-muted">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-display text-lg font-bold">{recipe.title}</h3>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{recipe.readyMinutes} min</span>
          <span>·</span>
          <span>{recipe.servings} servings</span>
          <span>·</span>
          <span>♥ {recipe.likes}</span>
        </div>

        {/* Match Badge */}
        <div className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Uses {recipe.matchScore} selected items
        </div>

        {/* Missing Ingredients */}
        {recipe.missedIngredients.length > 0 && (
          <div>
            <button
              onClick={() => setShowMissing(!showMissing)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{recipe.missedIngredients.length} missing</span>
              {showMissing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showMissing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recipe.missedIngredients.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Reason */}
        <p className="text-sm text-muted-foreground italic">{recipe.reason}</p>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onView}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          View recipe
        </motion.button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Run RecipeCard tests**

Run: `npx vitest src/components/RecipeCard.test.tsx --run`
Expected: All 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/RecipeCard.tsx src/components/RecipeCard.test.tsx
git commit -m "feat: add RecipeCard component with tests"
```

---

### Task 4: ExploreMoreRow & CookConfirmationDialog

**Files:**
- Create: `src/components/ExploreMoreRow.tsx`
- Create: `src/components/CookConfirmationDialog.tsx`
- Test: `src/components/ExploreMoreRow.test.tsx`
- Test: `src/components/CookConfirmationDialog.test.tsx`

- [ ] **Step 1: Write ExploreMoreRow tests**

Create `src/components/ExploreMoreRow.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExploreMoreRow from './ExploreMoreRow';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

const mockRecipes: RecipeCardType[] = [
  { id: 4, title: 'Extra Recipe 1', image: '', readyMinutes: 20, servings: 2, likes: 100, usedIngredients: [], missedIngredients: [], matchScore: 2, reason: '', sourceUrl: '' },
  { id: 5, title: 'Extra Recipe 2', image: '', readyMinutes: 30, servings: 4, likes: 200, usedIngredients: [], missedIngredients: [], matchScore: 3, reason: '', sourceUrl: '' },
];

describe('ExploreMoreRow', () => {
  it('shows collapsed state', () => {
    render(<ExploreMoreRow recipes={mockRecipes} onSelect={() => {}} />);
    expect(screen.getByText('Explore more recipes')).toBeInTheDocument();
  });

  it('shows recipes when expanded', async () => {
    const user = userEvent.setup();
    render(<ExploreMoreRow recipes={mockRecipes} onSelect={() => {}} />);
    await user.click(screen.getByText('Explore more recipes'));
    expect(screen.getByText('Extra Recipe 1')).toBeInTheDocument();
    expect(screen.getByText('Extra Recipe 2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement ExploreMoreRow**

Create `src/components/ExploreMoreRow.tsx`:

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

interface ExploreMoreRowProps {
  recipes: RecipeCardType[];
  onSelect: (recipe: RecipeCardType) => void;
}

export default function ExploreMoreRow({ recipes, onSelect }: ExploreMoreRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (recipes.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {expanded ? 'Show less' : 'Explore more recipes'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe)}
                  className="flex-shrink-0 w-32 space-y-1.5 text-left"
                >
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-xs font-medium line-clamp-2">{recipe.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Run ExploreMoreRow tests**

Run: `npx vitest src/components/ExploreMoreRow.test.tsx --run`
Expected: All 2 tests PASS

- [ ] **Step 4: Write CookConfirmationDialog tests**

Create `src/components/CookConfirmationDialog.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CookConfirmationDialog from './CookConfirmationDialog';

describe('CookConfirmationDialog', () => {
  const mockIngredients = [
    { name: 'chicken thighs', inFridge: true },
    { name: 'ginger', inFridge: true },
    { name: 'soy sauce', inFridge: true },
  ];

  it('renders title and ingredients', () => {
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('What did you use?')).toBeInTheDocument();
    expect(screen.getByText('chicken thighs')).toBeInTheDocument();
    expect(screen.getByText('ginger')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with selected ingredients', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    await user.click(screen.getByText('Update fridge'));
    expect(onConfirm).toHaveBeenCalledWith(['chicken thighs', 'ginger', 'soy sauce']);
  });

  it('allows deselecting ingredients', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    // Uncheck first ingredient
    const checkbox = screen.getByRole('checkbox', { name: /chicken thighs/i });
    await user.click(checkbox);
    await user.click(screen.getByText('Update fridge'));
    expect(onConfirm).toHaveBeenCalledWith(['ginger', 'soy sauce']);
  });
});
```

- [ ] **Step 5: Implement CookConfirmationDialog**

Create `src/components/CookConfirmationDialog.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MatchedIngredient {
  name: string;
  inFridge: boolean;
}

interface CookConfirmationDialogProps {
  isOpen: boolean;
  matchedIngredients: MatchedIngredient[];
  onConfirm: (removedIngredients: string[]) => void;
  onCancel: () => void;
}

export default function CookConfirmationDialog({
  isOpen,
  matchedIngredients,
  onConfirm,
  onCancel,
}: CookConfirmationDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(matchedIngredients.map((i) => i.name))
  );

  const toggleIngredient = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>What did you use?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {matchedIngredients.map((ingredient) => (
            <label
              key={ingredient.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(ingredient.name)}
                onChange={() => toggleIngredient(ingredient.name)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{ingredient.name}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Update fridge
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Run CookConfirmationDialog tests**

Run: `npx vitest src/components/CookConfirmationDialog.test.tsx --run`
Expected: All 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ExploreMoreRow.tsx src/components/ExploreMoreRow.test.tsx src/components/CookConfirmationDialog.tsx src/components/CookConfirmationDialog.test.tsx
git commit -m "feat: add ExploreMoreRow and CookConfirmationDialog components with tests"
```

---

### Task 5: RecipeDiscoveryPage

**Files:**
- Create: `src/pages/RecipeDiscoveryPage.tsx`
- Modify: `src/App.tsx` (add route)
- Test: `src/pages/RecipeDiscoveryPage.test.tsx`

- [ ] **Step 1: Write RecipeDiscoveryPage tests**

Create `src/pages/RecipeDiscoveryPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDiscoveryPage } from './RecipeDiscoveryPage';
import { useRecipeStore } from '@/store/useRecipeStore';

describe('RecipeDiscoveryPage', () => {
  beforeEach(() => {
    useRecipeStore.getState().clearResults();
    useRecipeStore.getState().setSelectedIngredients(['chicken', 'ginger']);
  });

  it('renders header title', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText("What are we cooking?")).toBeInTheDocument();
  });

  it('renders ingredient chips for selected ingredients', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
    expect(screen.getByText('ginger')).toBeInTheDocument();
  });

  it('renders mood chips', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText('Quick')).toBeInTheDocument();
    expect(screen.getByText('Comfort')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Fancy')).toBeInTheDocument();
  });

  it('disables Find recipes when no ingredients selected', () => {
    useRecipeStore.getState().setSelectedIngredients([]);
    render(<RecipeDiscoveryPage />);
    const button = screen.getByText('Find recipes');
    expect(button).toBeDisabled();
  });

  it('shows results state after search', async () => {
    const user = userEvent.setup();
    render(<RecipeDiscoveryPage />);
    await user.click(screen.getByText('Find recipes'));
    // Should show loading then results
    expect(screen.getByText(/Looking at your ingredients|Checking recipe options|Found some great matches/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement RecipeDiscoveryPage**

Create `src/pages/RecipeDiscoveryPage.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useFridgeStore } from '@/store/useFridgeStore';
import IngredientChip from '@/components/IngredientChip';
import MoodChip from '@/components/MoodChip';
import RecipeCard from '@/components/RecipeCard';
import ExploreMoreRow from '@/components/ExploreMoreRow';
import type { MoodType } from '@/types/recipe';
import { Loader2 } from 'lucide-react';

const MOODS: { label: string; value: MoodType }[] = [
  { label: 'Quick', value: 'quick' },
  { label: 'Comfort', value: 'comfort' },
  { label: 'Healthy', value: 'healthy' },
  { label: 'Fancy', value: 'fancy' },
];

export function RecipeDiscoveryPage() {
  const navigate = useNavigate();
  const { items } = useFridgeStore();
  const {
    selectedIngredients,
    mood,
    results,
    isLoading,
    loadingNarration,
    setSelectedIngredients,
    toggleIngredient,
    setMood,
    searchRecipes,
    surpriseMe,
    clearResults,
  } = useRecipeStore();

  // Pre-select expiring items on mount
  useEffect(() => {
    const activeItems = items.filter((i) => i.status === 'active');
    const expiringItems = activeItems.filter((item) => {
      const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 3;
    });

    if (selectedIngredients.length === 0 && expiringItems.length > 0) {
      setSelectedIngredients(expiringItems.map((i) => i.name));
    }
  }, [items, selectedIngredients, setSelectedIngredients]);

  const activeItems = items.filter((i) => i.status === 'active');
  const expiringCount = activeItems.filter((item) => {
    const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;

  const handleViewRecipe = (recipeId: number) => {
    navigate(`/recipes/${recipeId}`);
  };

  const handleSurpriseMe = async () => {
    // Use all active items
    const allNames = activeItems.map((i) => i.name);
    setSelectedIngredients(allNames);
    await surpriseMe();
  };

  const handleSelectFromExplore = (recipe: any) => {
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="page-container">
      <AnimatePresence mode="wait">
        {!isLoading && results.length === 0 ? (
          /* Selection State */
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h1 className="font-display text-2xl font-bold">What are we cooking?</h1>
              {expiringCount > 0 && (
                <p className="text-sm text-warning mt-1 font-medium">
                  {expiringCount} item{expiringCount !== 1 ? 's' : ''} expiring soon
                </p>
              )}
            </div>

            {/* Ingredient Chips */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Ingredients</h2>
              <div className="flex flex-wrap gap-2">
                {activeItems.map((item) => {
                  const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <IngredientChip
                      key={item.id}
                      name={item.name}
                      isSelected={selectedIngredients.includes(item.name)}
                      onToggle={() => toggleIngredient(item.name)}
                      expiryDays={days}
                    />
                  );
                })}
              </div>
            </div>

            {/* Mood Chips */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Mood</h2>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <MoodChip
                    key={m.value!}
                    label={m.label}
                    isSelected={mood === m.value}
                    onSelect={() => setMood(mood === m.value ? null : m.value)}
                  />
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={searchRecipes}
                disabled={selectedIngredients.length === 0}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find recipes
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSurpriseMe}
                className="w-full rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Surprise me
              </motion.button>
            </div>
          </motion.div>
        ) : isLoading ? (
          /* Loading State */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{loadingNarration}</p>
          </motion.div>
        ) : (
          /* Results State */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <h1 className="font-display text-xl font-bold">3 recipes for you</h1>
              <p className="text-sm text-muted-foreground">Using {selectedIngredients.length} ingredients</p>
            </div>

            {results.slice(0, 3).map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <RecipeCard
                  recipe={recipe}
                  onView={() => handleViewRecipe(recipe.id)}
                />
              </motion.div>
            ))}

            <ExploreMoreRow
              recipes={results.slice(3)}
              onSelect={handleSelectFromExplore}
            />

            <button
              onClick={() => {
                clearResults();
                setSelectedIngredients(expiringCount > 0
                  ? activeItems
                      .filter((item) => {
                        const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return days <= 3;
                      })
                      .map((i) => i.name)
                  : []
                );
              }}
              className="w-full mt-4 rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Run RecipeDiscoveryPage tests**

Run: `npx vitest src/pages/RecipeDiscoveryPage.test.tsx --run`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/RecipeDiscoveryPage.tsx src/pages/RecipeDiscoveryPage.test.tsx
git commit -m "feat: add RecipeDiscoveryPage with selection, loading, and results states"
```

---

### Task 6: RecipeDetailPage

**Files:**
- Create: `src/pages/RecipeDetailPage.tsx`
- Modify: `src/App.tsx` (add `:id` route)
- Test: `src/pages/RecipeDetailPage.test.tsx`

- [ ] **Step 1: Write RecipeDetailPage tests**

Create `src/pages/RecipeDetailPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecipeDetailPage from './RecipeDetailPage';
import { useRecipeStore } from '@/store/useRecipeStore';
import { MOCK_RECIPE_DETAIL } from '@/test/recipe-utils';

const renderWithRouter = () => {
  useRecipeStore.setState({ currentRecipe: MOCK_RECIPE_DETAIL });
  return render(
    <MemoryRouter initialEntries={['/recipes/1']}>
      <Routes>
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('RecipeDetailPage', () => {
  it('renders recipe title', () => {
    renderWithRouter();
    expect(screen.getByText('Ginger Soy Chicken Stir-Fry')).toBeInTheDocument();
  });

  it('renders ingredients from fridge', () => {
    renderWithRouter();
    expect(screen.getByText('From your fridge')).toBeInTheDocument();
    expect(screen.getByText('chicken thighs')).toBeInTheDocument();
  });

  it('renders missing ingredients', () => {
    renderWithRouter();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText('sesame oil')).toBeInTheDocument();
  });

  it('renders instructions', () => {
    renderWithRouter();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText(/Mix soy sauce, grated ginger/)).toBeInTheDocument();
  });

  it('renders I cooked this button', () => {
    renderWithRouter();
    expect(screen.getByText('I cooked this')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement RecipeDetailPage**

Create `src/pages/RecipeDetailPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRecipeStore } from '@/store/useRecipeStore';
import CookConfirmationDialog from '@/components/CookConfirmationDialog';
import { toast } from 'sonner';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRecipe, selectRecipe } = useRecipeStore();
  const [showCookDialog, setShowCookDialog] = useState(false);

  useEffect(() => {
    if (!currentRecipe) {
      // Load recipe (mock mode always returns same detail)
      selectRecipe({ id: Number(id) } as any);
    }
  }, [id, currentRecipe, selectRecipe]);

  if (!currentRecipe) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading recipe...</p>
      </div>
    );
  }

  const fridgeIngredients = currentRecipe.ingredients.filter((i) => i.inFridge);
  const missingIngredients = currentRecipe.ingredients.filter((i) => !i.inFridge);

  const handleCookConfirm = (removedIngredients: string[]) => {
    // Mock: just show toast and navigate back
    // Sub-Project 3 will wire this to actual fridge updates
    if (removedIngredients.length > 0) {
      toast.success(`Fridge updated — nice cooking! Removed ${removedIngredients.length} item${removedIngredients.length !== 1 ? 's' : ''}.`);
    } else {
      toast.info('No ingredients removed.');
    }
    setShowCookDialog(false);
    navigate('/recipes');
  };

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-xl font-bold flex-1">{currentRecipe.title}</h1>
      </div>

      {/* Hero Image */}
      <div className="rounded-xl overflow-hidden aspect-video bg-muted mb-4">
        <img
          src={currentRecipe.image}
          alt={currentRecipe.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Metadata Bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
        <span>{currentRecipe.readyMinutes} min</span>
        <span>·</span>
        <span>{currentRecipe.servings} servings</span>
        <span>·</span>
        <span>♥ {currentRecipe.likes}</span>
      </div>

      {/* Ingredients */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Ingredients</h2>

        {fridgeIngredients.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">From your fridge</h3>
            <ul className="space-y-1.5">
              {fridgeIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>{ing.amount} {ing.unit} {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingIngredients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Missing</h3>
            <ul className="space-y-1.5">
              {missingIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>○</span>
                  <span>{ing.amount} {ing.unit} {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Instructions</h2>
        <ol className="space-y-4">
          {currentRecipe.instructions.map((step) => (
            <li key={step.step} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
                {step.step}
              </span>
              <p className="text-sm leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-[64px] left-0 right-0 bg-background/95 backdrop-blur-lg border-t p-4 z-40">
        <button
          onClick={() => setShowCookDialog(true)}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          I cooked this
        </button>
      </div>

      {/* Cook Dialog */}
      <CookConfirmationDialog
        isOpen={showCookDialog}
        matchedIngredients={fridgeIngredients.map((i) => ({ name: i.name, inFridge: true }))}
        onConfirm={handleCookConfirm}
        onCancel={() => setShowCookDialog(false)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run RecipeDetailPage tests**

Run: `npx vitest src/pages/RecipeDetailPage.test.tsx --run`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/RecipeDetailPage.tsx src/pages/RecipeDetailPage.test.tsx
git commit -m "feat: add RecipeDetailPage with ingredients, instructions, and cook dialog"
```

---

### Task 7: Integrate Routes, BottomNav, and ExpiryBanner

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/BottomNav.tsx`
- Create: `src/components/ExpiryBanner.tsx`
- Modify: `src/pages/InventoryPage.tsx`
- Test: `src/components/ExpiryBanner.test.tsx`
- Test: `src/components/BottomNav.test.tsx`

- [ ] **Step 1: Write ExpiryBanner tests**

Create `src/components/ExpiryBanner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpiryBanner from './ExpiryBanner';
import type { FoodItem } from '@/types/food';

describe('ExpiryBanner', () => {
  const mockItems: FoodItem[] = [
    { id: '1', name: 'chicken', expiry_date: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'active' } as FoodItem,
    { id: '2', name: 'milk', expiry_date: new Date(Date.now() + 1 * 86400000).toISOString(), status: 'active' } as FoodItem,
    { id: '3', name: 'rice', expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(), status: 'active' } as FoodItem,
  ];

  it('renders with expiring item count', () => {
    render(<ExpiryBanner items={mockItems} onNavigate={() => {}} />);
    expect(screen.getByText(/2 items expiring soon/)).toBeInTheDocument();
  });

  it('does not render when no items are expiring', () => {
    const nonExpiring = mockItems.map((i) => ({
      ...i,
      expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    }));
    const { container } = render(<ExpiryBanner items={nonExpiring} onNavigate={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onNavigate when clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ExpiryBanner items={mockItems} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Implement ExpiryBanner**

Create `src/components/ExpiryBanner.tsx`:

```tsx
import { ArrowRight } from 'lucide-react';
import type { FoodItem } from '@/types/food';

interface ExpiryBannerProps {
  items: FoodItem[];
  onNavigate: () => void;
}

export default function ExpiryBanner({ items, onNavigate }: ExpiryBannerProps) {
  const expiringItems = items.filter((item) => {
    const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return item.status === 'active' && days <= 3;
  });

  if (expiringItems.length === 0) return null;

  return (
    <button
      onClick={onNavigate}
      className="w-full flex items-center justify-between rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 mb-4 text-left hover:bg-warning/15 transition-colors"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">
          {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Find recipes to use them up
        </p>
      </div>
      <ArrowRight size={18} className="text-warning flex-shrink-0" />
    </button>
  );
}
```

- [ ] **Step 3: Run ExpiryBanner tests**

Run: `npx vitest src/components/ExpiryBanner.test.tsx --run`
Expected: All 3 tests PASS

- [ ] **Step 4: Update BottomNav**

Modify `src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { Home, Camera, User, BookOpen } from 'lucide-react';

export default function BottomNav() {
  const links = [
    { to: '/', icon: Home, label: 'Fridge' },
    { to: '/recipes', icon: BookOpen, label: 'Recipes' },
    { to: '/camera', icon: Camera, label: 'Add' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive, isPending }) =>
            `bottom-nav-item ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Write BottomNav test for new tab**

Create `src/components/BottomNav.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('renders 4 navigation tabs', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText('Fridge')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <BottomNav />
      </MemoryRouter>
    );
    const recipesLink = screen.getByText('Recipes');
    expect(recipesLink.closest('a')).toHaveClass('active');
  });
});
```

- [ ] **Step 6: Run BottomNav tests**

Run: `npx vitest src/components/BottomNav.test.tsx --run`
Expected: All 2 tests PASS

- [ ] **Step 7: Update App.tsx with new routes**

Modify `src/App.tsx`:

Change the imports section (lines 9-13):
```tsx
import BottomNav from "@/components/BottomNav";
import InventoryPage from "@/pages/InventoryPage";
import CameraPage from "@/pages/CameraPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "./pages/NotFound";
import { RecipeDiscoveryPage } from "@/pages/RecipeDiscoveryPage";
import RecipeDetailPage from "@/pages/RecipeDetailPage";
```

Change the NAV_ROUTE_ORDER (line 20):
```tsx
const NAV_ROUTE_ORDER = ["/", "/recipes", "/camera", "/profile"] as const;
```

Change the Routes section (lines 98-103):
```tsx
<Routes location={location}>
  <Route path="/" element={<InventoryPage />} />
  <Route path="/recipes" element={<RecipeDiscoveryPage />} />
  <Route path="/recipes/:id" element={<RecipeDetailPage />} />
  <Route path="/camera" element={<CameraPage />} />
  <Route path="/profile" element={<ProfilePage />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

- [ ] **Step 8: Add ExpiryBanner to InventoryPage**

Modify `src/pages/InventoryPage.tsx`:

Add import at the top:
```tsx
import ExpiryBanner from '@/components/ExpiryBanner';
```

Add import for navigation:
```tsx
import { useNavigate } from 'react-router-dom';
```

Add `const navigate = useNavigate();` at the top of the component body (after the existing useState declarations).

Add the banner after the `<header>` section and before `<QuickAddInput />`:
```tsx
<ExpiryBanner
  items={items.filter((i) => i.status === 'active')}
  onNavigate={() => navigate('/recipes')}
/>
```

- [ ] **Step 9: Run all tests**

Run: `npx vitest --run`
Expected: All tests PASS (existing + new)

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/components/BottomNav.tsx src/components/BottomNav.test.tsx src/components/ExpiryBanner.tsx src/components/ExpiryBanner.test.tsx src/pages/InventoryPage.tsx
git commit -m "feat: integrate recipe routes, 4-tab nav, and expiry banner on InventoryPage"
```

---

### Task 8: Final Integration & Visual Polish

**Files:**
- Modify: `src/index.css` (add recipe-specific styles if needed)
- Test: Manual verification

- [ ] **Step 1: Add recipe-specific CSS to index.css**

Append to `src/index.css` in the `@layer components` section:

```css
  .recipe-card-image {
    @apply w-full h-full object-cover;
  }

  .recipe-card-image-fallback {
    @apply flex items-center justify-center bg-muted text-muted-foreground text-4xl;
  }
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest --run`
Expected: All tests PASS

- [ ] **Step 3: Run dev server for manual verification**

Run: `npm run dev`

Verify manually:
1. Bottom nav shows 4 tabs (Fridge, Recipes, Add, Profile)
2. InventoryPage shows expiry banner when items expire within 3 days
3. Tapping banner navigates to Recipes with expiring items pre-selected
4. RecipeDiscoveryPage shows selection state with ingredient chips, mood chips, CTAs
5. "Find recipes" transitions to loading then results state
6. 3 hero cards render with correct metadata
7. "Explore more" expands to show additional recipes
8. Tapping a card navigates to RecipeDetailPage
9. RecipeDetailPage shows ingredients (from fridge + missing), instructions
10. "I cooked this" opens confirmation dialog with checkboxes
11. Confirming shows toast and navigates back

- [ ] **Step 4: Final commit**

```bash
git add src/index.css
git commit -m "style: add recipe-specific CSS utilities"
```

---

## Acceptance Criteria Checklist

- [ ] AC-01: Bottom nav shows 4 tabs with Recipes tab between Fridge and Add
- [ ] AC-02: InventoryPage shows expiry banner when items expire within 3 days
- [ ] AC-03: RecipeDiscoveryPage selection state shows pre-selected expiring items, mood chips, and CTAs
- [ ] AC-04: RecipeDiscoveryPage results state shows 3 hero cards with correct metadata
- [ ] AC-05: Hero cards show likes count, ingredient match badge, and expandable missing ingredients
- [ ] AC-06: RecipeDetailPage shows ingredients (from fridge + missing), instructions, and "I cooked this" button
- [ ] AC-07: Cook confirmation dialog allows deselecting leftover ingredients
- [ ] AC-08: All navigation preserves state (back from detail returns to results)
