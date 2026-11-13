// Event-specific classics (what people actually cook for each occasion).
// Each has a per-serving ingredient list, so picking it builds the shopping
// list scaled by guest count, just like a catalog recipe.
// tags drive the filter chips in the Plan Menu dialog.
import { canonicalOf } from './normalize.js'

const D = (key, name, time_mins, tags, ingredients) => ({ key, name, time_mins, tags, ingredients })

export const EVENT_DISHES = {
  thanksgiving: [
    D('roast-turkey', 'Roast turkey', 210, ['Mains'], [['Turkey', 0.5, 'kg'], ['Butter', 15, 'g'], ['Onion', 0.25, 'unit'], ['Lemon', 0.1, 'unit']]),
    D('stuffing', 'Sage & onion stuffing', 45, ['Sides'], [['Bread', 1.5, 'slice'], ['Onion', 0.25, 'unit'], ['Celery', 0.5, 'stalk'], ['Butter', 10, 'g'], ['Chicken Stock', 60, 'ml']]),
    D('cranberry-sauce', 'Cranberry sauce', 15, ['Sides'], [['Cranberries', 40, 'g'], ['Sugar', 15, 'g'], ['Orange', 0.1, 'unit']]),
    D('mashed-potatoes', 'Mashed potatoes', 30, ['Sides'], [['Potato', 1, 'unit'], ['Butter', 10, 'g'], ['Milk', 30, 'ml']]),
    D('roasted-roots', 'Roasted root vegetables', 45, ['Sides', 'Vegetarian'], [['Carrot', 0.5, 'unit'], ['Parsnip', 0.5, 'unit'], ['Sweet Potato', 0.25, 'unit'], ['Olive Oil', 1, 'tsp']]),
    D('green-bean-casserole', 'Green bean casserole', 40, ['Sides', 'Vegetarian'], [['Green Beans', 75, 'g'], ['Mushrooms', 30, 'g'], ['Cream', 30, 'ml'], ['Onion', 0.1, 'unit']]),
    D('pumpkin-pie', 'Pumpkin pie', 75, ['Desserts'], [['Pumpkin Puree', 50, 'g'], ['Egg', 0.25, 'unit'], ['Sugar', 12, 'g'], ['Pie Crust', 0.125, 'unit']]),
  ],
  'christmas-eve': [
    D('glazed-ham', 'Honey-glazed ham', 150, ['Mains'], [['Ham', 0.25, 'kg'], ['Honey', 1, 'tbsp'], ['Dijon Mustard', 0.5, 'tsp']]),
    D('roast-beef', 'Herb-crusted roast beef', 120, ['Mains'], [['Beef Roast', 0.2, 'kg'], ['Garlic', 1, 'clove'], ['Rosemary', 0.1, 'bunch']]),
    D('roast-potatoes', 'Crispy roast potatoes', 60, ['Sides', 'Vegetarian'], [['Potato', 1.5, 'unit'], ['Olive Oil', 1, 'tbsp']]),
    D('glazed-carrots', 'Honey-glazed carrots', 25, ['Sides', 'Vegetarian'], [['Carrot', 1, 'unit'], ['Honey', 1, 'tsp'], ['Butter', 5, 'g']]),
    D('brussels-sprouts', 'Roasted Brussels sprouts', 30, ['Sides', 'Vegetarian'], [['Brussels Sprouts', 100, 'g'], ['Olive Oil', 1, 'tsp']]),
    D('cranberry-glaze', 'Cranberry glaze', 15, ['Sides'], [['Cranberries', 30, 'g'], ['Sugar', 10, 'g']]),
    D('yule-log', 'Chocolate yule log', 90, ['Desserts'], [['Flour', 15, 'g'], ['Egg', 0.5, 'unit'], ['Sugar', 15, 'g'], ['Chocolate', 20, 'g'], ['Cream', 30, 'ml']]),
  ],
  'new-years-eve': [
    D('shrimp-cocktail', 'Shrimp cocktail', 15, ['Starters'], [['Shrimp', 100, 'g'], ['Lemon', 0.25, 'unit'], ['Ketchup', 1, 'tbsp']]),
    D('cheese-board', 'Cheese board', 15, ['Starters', 'Vegetarian'], [['Cheese', 60, 'g'], ['Crackers', 30, 'g'], ['Grapes', 50, 'g']]),
    D('stuffed-mushrooms', 'Stuffed mushrooms', 30, ['Starters', 'Vegetarian'], [['Mushrooms', 80, 'g'], ['Cream Cheese', 20, 'g'], ['Garlic', 0.5, 'clove']]),
    D('beef-sliders', 'Beef sliders', 30, ['Mains'], [['Ground Beef', 120, 'g'], ['Slider Buns', 2, 'unit'], ['Cheese', 20, 'g']]),
    D('chocolate-strawberries', 'Chocolate-dipped strawberries', 20, ['Desserts', 'Vegetarian'], [['Strawberries', 80, 'g'], ['Chocolate', 25, 'g']]),
  ],
  'independence-day': [
    D('burgers', 'Grilled burgers', 25, ['Mains'], [['Ground Beef', 150, 'g'], ['Burger Buns', 1, 'unit'], ['Cheese', 20, 'g'], ['Tomato', 0.25, 'unit']]),
    D('hot-dogs', 'Hot dogs', 15, ['Mains'], [['Hot Dogs', 1.5, 'unit'], ['Hot Dog Buns', 1.5, 'unit']]),
    D('corn-on-the-cob', 'Corn on the cob', 15, ['Sides', 'Vegetarian'], [['Corn', 1, 'unit'], ['Butter', 10, 'g']]),
    D('potato-salad', 'Potato salad', 35, ['Sides', 'Vegetarian'], [['Potato', 1, 'unit'], ['Mayonnaise', 1.5, 'tbsp'], ['Celery', 0.25, 'stalk']]),
    D('coleslaw', 'Coleslaw', 15, ['Sides', 'Vegetarian'], [['Cabbage', 0.1, 'head'], ['Carrot', 0.25, 'unit'], ['Mayonnaise', 1, 'tbsp']]),
    D('berry-trifle', 'Red, white & blue berry trifle', 30, ['Desserts', 'Vegetarian'], [['Berries', 80, 'g'], ['Cream', 50, 'ml'], ['Sugar', 10, 'g']]),
  ],
}

export const classicsFor = (eventId) => EVENT_DISHES[eventId] || []

export const findClassic = (eventId, key) => classicsFor(eventId).find(d => d.key === key)

// Per-serving ingredients in the shape computeNeeds expects.
export const classicIngredients = (dish) => (dish?.ingredients || []).map(([display, quantity, unit]) => ({
  display, quantity, unit, canonical: canonicalOf(display),
}))
