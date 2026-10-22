import type { Product } from "../types";

export const initialProducts: Product[] = [
  { id: "prod_redbull", name: "Red Bull Energy Drink", category: "Drinks", price: 160, cost_price: 110, active: true, stock_count: 48 },
  { id: "prod_water", name: "Mineral Water (1L)", category: "Drinks", price: 30, cost_price: 12, active: true, stock_count: 120 },
  { id: "prod_cold_coffee", name: "Iced Cold Coffee", category: "Drinks", price: 120, cost_price: 45, active: true, stock_count: 35 },
  { id: "prod_masala_chai", name: "Artisan Masala Chai", category: "Drinks", price: 40, cost_price: 10, active: true, stock_count: 80 },
  { id: "prod_nachos", name: "Nachos & Cheese Dip", category: "Snacks", price: 140, cost_price: 50, active: true, stock_count: 24 },
  { id: "prod_sandwich", name: "Grilled Club Sandwich", category: "Snacks", price: 180, cost_price: 70, active: true, stock_count: 18 },
  { id: "prod_fries", name: "Seasoned Crisp Fries", category: "Snacks", price: 120, cost_price: 35, active: true, stock_count: 30 },
  { id: "prod_peanuts", name: "Roasted Masala Peanuts", category: "Snacks", price: 60, cost_price: 20, active: true, stock_count: 50 },
  { id: "prod_cue_chalk", name: "Master Blue Cue Chalk", category: "Other", price: 30, cost_price: 15, active: true, stock_count: 60 },
  { id: "prod_glove", name: "Pro Snooker Cue Glove", category: "Other", price: 250, cost_price: 120, active: true, stock_count: 15 },
];

export const mockProducts = initialProducts;
