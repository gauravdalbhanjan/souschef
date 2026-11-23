// Diet tags derived by CODE from ingredients. No keto until rules are defined.
import { ALLERGEN_TABLE } from './allergens.js'

const MEAT = new Set(['chicken', 'beef', 'pork', 'bacon', 'turkey', 'lamb'])
const FISH = new Set(['salmon', 'shrimp', 'worcestershire', 'tuna'])
const ANIMAL = new Set(['milk', 'butter', 'cheese', 'parmesan', 'yogurt', 'cream', 'egg', 'mayonnaise', 'honey'])
export const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free']

// Tags are only given when every ingredient is known and clear.
export function dietTags(ingredients) {
  const cs = (ingredients || []).map(i => i.canonical)
  const known = cs.every(c => ALLERGEN_TABLE[c])
  const tags = []
  const veg = cs.every(c => !MEAT.has(c) && !FISH.has(c)) && !cs.includes('bacon')
  if (veg && known) tags.push('vegetarian')
  if (veg && known && cs.every(c => !ANIMAL.has(c))) tags.push('vegan')
  const gluten = cs.some(c => ALLERGEN_TABLE[c]?.contains.includes('gluten') || ALLERGEN_TABLE[c]?.mayContain)
  if (known && !gluten) tags.push('gluten-free')
  const dairy = cs.some(c => ALLERGEN_TABLE[c]?.contains.includes('dairy') || ALLERGEN_TABLE[c]?.mayContain)
  if (known && !dairy) tags.push('dairy-free')
  return tags
}

export function proteinLabel(ingredients) {
  const cs = (ingredients || []).map(i => i.canonical)
  if (cs.some(c => ['salmon', 'shrimp', 'tuna'].includes(c))) return 'Seafood'
  if (cs.includes('chicken')) return 'Chicken'
  if (cs.some(c => MEAT.has(c))) return 'Meat'
  if (cs.includes('egg')) return 'Eggs'
  return 'Vegetarian'
}
