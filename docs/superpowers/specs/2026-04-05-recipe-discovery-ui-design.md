# Sub-Project 1: Recipe Discovery UI & Navigation

**Date:** 2026-04-05
**Status:** Approved
**Part of:** Recipe Discovery Agent (3-part decomposition)

## Overview

This spec covers all UI components, navigation changes, and page layouts for the recipe discovery feature. No API integration or data persistence is included — those are handled in Sub-Projects 2 and 3. The UI will use mock data initially.

## Scope

- Bottom navigation update (3 → 4 tabs)
- Contextual "Find recipes" banner on InventoryPage
- RecipeDiscoveryPage (selection state + results state)
- RecipeDetailPage (full page with ingredients, instructions, cook action)
- Cook confirmation dialog (partial ingredient removal)

## Navigation Structure

### Bottom Navigation

The `BottomNav` component gains a 4th tab:

| Tab | Icon | Route | Page |
|-----|------|-------|------|
| Fridge | (existing) | `/fridge` | InventoryPage |
| Recipes | (new) | `/recipes` | RecipeDiscoveryPage |
| Add | (existing) | `/add` | CameraPage |
| Profile | (existing) | `/profile` | ProfilePage |

The new tab sits between Fridge and Add.

### InventoryPage Banner

When the user has ≥1 item with `expiry_date ≤ today + 3 days`, a banner appears at the top of the InventoryPage food list:

- Text: "X items expiring soon — find recipes to use them up →"
- Tapping navigates to `/recipes` with expiring items pre-selected
- Banner dismissible (dismissal persists for session)
- No banner if zero active items or zero expiring items

## RecipeDiscoveryPage

### Selection State (Default)

Shown when the user first lands on `/recipes` or after completing a cook.

**Layout (top to bottom):**

1. **Header**
   - Title: "What are we cooking?"
   - No back arrow (this is a primary nav destination)

2. **Expiry badge** (conditional)
   - Shown only if expiring items exist
   - Text: "X items expiring soon"
   - Subtle accent color to draw attention

3. **Ingredient chips**
   - Scrollable grid of all active fridge items
   - Items expiring ≤3 days are pre-selected (highlighted state)
   - Other items are unselected by default
   - Tap to toggle selection
   - Each chip shows: ingredient name, expiry countdown if applicable (e.g., "2d left")
   - Minimum 1 item must be selected to enable "Find recipes"

4. **Mood chips**
   - Horizontal row of 4 tappable chips
   - Options: Quick, Comfort, Healthy, Fancy
   - Single-select (selecting one deselects others)
   - None selected by default
   - Clean, minimal design — text only, no icons/emojis

5. **CTAs**
   - Primary: "Find recipes" button (disabled if 0 ingredients selected)
   - Secondary: "Surprise me" button (uses all active fridge items, ignores mood selection)

**Interaction:** Tapping "Find recipes" or "Surprise me" transitions to the results state with a loading animation.

### Results State

Shown after the user triggers a recipe search.

**Layout:**

1. **Header**
   - Title: "3 recipes for you"
   - Subtitle: "Using X ingredients" (count of selected ingredients)

2. **Hero cards** (exactly 3, vertically stacked)
   Each card displays:
   - Recipe title (bold, prominent)
   - Hero image (16:9 aspect ratio, rounded corners)
   - Metadata row: cook time · servings · likes (heart count)
   - Ingredient match badge: "Uses 5/6 selected items"
   - Missing ingredients: "2 missing" — tappable, expands inline to show full list
   - One-line reason: "Great way to use your expiring chicken and ginger"
   - "View recipe" button → navigates to RecipeDetailPage

3. **Explore more** (collapsible)
   - Collapsed state: "Explore more recipes →" text/button
   - Expanded state: horizontal scroll of compact recipe cards (image + title only)
   - Each compact card tappable → navigates to RecipeDetailPage

### Loading State

Between selection and results, show a narrated loading state (not a blank spinner). Text examples:
- "Looking at your chicken and ginger..."
- "Checking quick meal options..."
- "Found 3 strong matches"

## RecipeDetailPage

Full page, accessed by tapping any recipe card.

**Layout:**

1. **Header**
   - Back arrow (returns to RecipeDiscoveryPage, preserving results state)
   - Recipe title

2. **Hero image**
   - Full-width, rounded corners

3. **Metadata bar**
   - Cook time · servings · likes · source attribution

4. **Ingredients section**
   - Heading: "Ingredients"
   - Subsection: "From your fridge" — matched items with checkmark indicators
   - Subsection: "Missing" — items not in fridge, listed with quantities
   - Quantities shown per ingredient

5. **Instructions section**
   - Heading: "Instructions"
   - Step-by-step numbered list
   - Clean typography, readable spacing between steps

6. **Sticky bottom bar**
   - "I cooked this" button (full-width, prominent)
   - Tapping opens the cook confirmation dialog

## Cook Confirmation Dialog

Modal overlay triggered by "I cooked this" on RecipeDetailPage.

**Content:**
- Title: "What did you use?"
- List of all matched ingredients with checkboxes (all checked by default)
- User can uncheck items they still have leftover
- Two buttons: "Cancel" and "Update fridge"

**On confirm:**
- Removes checked items from fridge inventory (Sub-Project 3)
- Logs cook action to recipe history (Sub-Project 3)
- Shows toast confirmation: "Fridge updated — nice cooking!"
- Navigates back to RecipeDiscoveryPage (selection state)

## Data Interfaces (Mock)

Until Sub-Project 2 provides real data, the UI will use these interfaces:

```typescript
interface RecipeCard {
  id: number; // Spoonacular recipe ID
  title: string;
  image: string; // URL
  readyMinutes: number;
  servings: number;
  likes: number;
  usedIngredients: string[]; // names of matched fridge items
  missedIngredients: string[]; // names of missing items
  matchScore: number; // e.g., 5/6
  reason: string; // one-line narration
  sourceUrl: string; // Spoonacular source URL
}

interface RecipeDetail extends RecipeCard {
  ingredients: { name: string; amount: string; unit: string; inFridge: boolean }[];
  instructions: { step: number; text: string }[];
}
```

## Component Tree

```
App
├── BottomNav (updated: 4 tabs)
├── InventoryPage (updated: expiry banner)
├── RecipeDiscoveryPage (new)
│   ├── SelectionState
│   │   ├── IngredientChipGrid
│   │   ├── MoodChipRow
│   │   └── SearchCTAs
│   └── ResultsState
│       ├── HeroCard (×3)
│       │   └── MissingIngredientsExpandable
│       └── ExploreMoreRow
└── RecipeDetailPage (new)
    └── CookConfirmationDialog
```

## New Files

| File | Purpose |
|------|---------|
| `src/pages/RecipeDiscoveryPage.tsx` | Main recipe discovery page (selection + results states) |
| `src/pages/RecipeDetailPage.tsx` | Full recipe detail view |
| `src/components/RecipeCard.tsx` | Hero recipe card component |
| `src/components/IngredientChip.tsx` | Toggleable ingredient chip |
| `src/components/MoodChip.tsx` | Mood selection chip |
| `src/components/CookConfirmationDialog.tsx` | Partial removal dialog |
| `src/components/ExpiryBanner.tsx` | InventoryPage expiry banner |
| `src/components/ExploreMoreRow.tsx` | Collapsible additional recipes |
| `src/types/recipe.ts` | Recipe TypeScript interfaces |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/recipes` and `/recipes/:id` routes |
| `src/components/BottomNav.tsx` | Add 4th tab (Recipes) |
| `src/pages/InventoryPage.tsx` | Add expiry banner component |

## Acceptance Criteria

AC-01: Bottom nav shows 4 tabs with Recipes tab between Fridge and Add
AC-02: InventoryPage shows expiry banner when items expire within 3 days
AC-03: RecipeDiscoveryPage selection state shows pre-selected expiring items, mood chips, and CTAs
AC-04: RecipeDiscoveryPage results state shows 3 hero cards with correct metadata
AC-05: Hero cards show likes count, ingredient match badge, and expandable missing ingredients
AC-06: RecipeDetailPage shows ingredients (from fridge + missing), instructions, and "I cooked this" button
AC-07: Cook confirmation dialog allows deselecting leftover ingredients
AC-08: All navigation preserves state (back from detail returns to results)
