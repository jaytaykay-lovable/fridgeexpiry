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
