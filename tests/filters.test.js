// Filters work on every recipe (bundled + dataset), including the new Cuisine filter.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { pickCuisine, regionOf, cuisineOptions } from '../lib/cuisines.js'
import { shapeDataset, categoriesFor, proteinFor } from '../lib/dataset.js'
import { applyFilters } from '../lib/recipeMeta.js'

describe('cuisine', () => {
  it('picks the specific country over broad labels and folds regions', () => {
    expect(pickCuisine(['African recipes', 'Nigerian recipes', 'Yoruba recipes'], [])).toBe('Nigerian')
    expect(pickCuisine(['Vegetarian recipes'], ['the United States'])).toBe('American')
    expect(pickCuisine(['Texas recipes'], [])).toBe('American')
    expect(pickCuisine(['Baking recipes'], [])).toBe(null)
  })
  it('Ask Chef picks a named cuisine the recipes have, else the region', async () => {
    const { ruleFilter } = await import('../lib/guardrails/filter.js')
    const recipes = [{ slug: 'a', name: 'A', cuisine: 'Thai' }, { slug: 'b', name: 'B', cuisine: 'Italian' }]
    expect(ruleFilter('a thai dinner', recipes).cuisine).toBe('Thai')
    expect(ruleFilter('something korean', recipes).cuisine).toBe('Asian')
  })
  it('regions for Ask Chef', () => {
    expect(regionOf('Thai')).toBe('Asian')
    expect(regionOf('Pakistani')).toBe('Indian')
    expect(regionOf('Italian')).toBe('Italian')
  })
  it('options come from the recipes, most first', () => {
    expect(cuisineOptions([{ cuisine: 'Thai' }, { cuisine: 'Italian' }, { cuisine: 'Italian' }, { cuisine: null }]))
      .toEqual([{ id: 'Italian', label: 'Italian', count: 2 }, { id: 'Thai', label: 'Thai', count: 1 }])
  })
})

describe('dataset recipes carry filter fields', () => {
  const ing = (c, d = c) => ({ canonical: c, display: d, quantity: 1, unit: 'unit' })
  it('category and protein', () => {
    expect(categoriesFor('Chocolate Cake', null, [ing('flour'), ing('egg')])).toEqual(['Dessert'])
    expect(categoriesFor('Spaghetti Bolognese', 'main', [ing('pasta'), ing('beef')])).toEqual(['Mains', 'Pasta'])
    expect(proteinFor([ing('chicken'), ing('rice')], ['Mains'])).toBe('Chicken')
    expect(proteinFor([ing('flour'), ing('egg')], ['Dessert'])).toBe('Vegetarian')
    expect(proteinFor([ing('egg'), ing('onion')], ['Breakfast'])).toBe('Eggs')
  })
  it('the real dataset: every filter reaches beyond the 16 bundled recipes', () => {
    const json = JSON.parse(fs.readFileSync(new URL('../public/data/recipes-wikibooks.json', import.meta.url), 'utf8'))
    const ds = shapeDataset(json).recipes
    expect(ds.length).toBeGreaterThan(3000)
    const count = (f) => applyFilters(ds, { time: 'any', protein: 'any', category: 'any', cuisine: 'any', ...f }).length
    expect(count({ time: 'u30' })).toBeGreaterThan(100)
    expect(count({ protein: 'Chicken' })).toBeGreaterThan(100)
    expect(count({ protein: 'Vegetarian' })).toBeGreaterThan(500)
    expect(count({ category: 'Dessert' })).toBeGreaterThan(100)
    expect(count({ cuisine: 'Italian' })).toBeGreaterThan(50)
    expect(cuisineOptions(ds).length).toBeGreaterThan(30)
  }, 30000) // reads all 3,000+ recipes
})
