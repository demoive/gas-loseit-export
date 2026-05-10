function formatQty_(qty, units) {
  if (!qty) return '';
  const n = Number(qty);
  if (isNaN(n) || n === 0) return '';

  const u = (units || '').trim().toLowerCase();

  // Units that represent a count, not a measurement
  const COUNT_UNITS = new Set([
    'each', 'piece', 'pieces', 'slice', 'slices',
    'serving', 'servings', 'item', 'items',
    'unit', 'units', 'container', 'containers',
    'can', 'cans', 'bottle', 'bottles',
    'package', 'packages', 'pkg',
    'portion', 'portions', 'bar', 'bars',
    'tablet', 'tablets', 'capsule', 'capsules',
    'cookie', 'cookies', 'scoop', 'scoops',
    'strip', 'strips', 'patty', 'patties',
  ]);

  // Measurement unit → abbreviation
  const ABBREV = {
    // Weight
    'gram': 'g', 'grams': 'g', 'g': 'g',
    'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
    'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
    'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',
    'milligram': 'mg', 'milligrams': 'mg', 'mg': 'mg',
    // Volume
    'milliliter': 'ml', 'milliliters': 'ml', 'millilitre': 'ml', 'millilitres': 'ml', 'ml': 'ml',
    'liter': 'L', 'liters': 'L', 'litre': 'L', 'litres': 'L', 'l': 'L',
    'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl oz': 'fl oz', 'fl. oz.': 'fl oz',
    'cup': 'cup', 'cups': 'cup',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'tbs': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp',
    'pint': 'pt', 'pints': 'pt', 'pt': 'pt',
    'quart': 'qt', 'quarts': 'qt', 'qt': 'qt',
    'gallon': 'gal', 'gallons': 'gal',
    // Nutrition-specific
    'calorie': 'cal', 'calories': 'cal', 'kcal': 'kcal',
    'international unit': 'IU', 'iu': 'IU',
  };

  // Fraction glyphs for values < 1
  const FRACTIONS = [
    [1/8,  '⅛'], [1/6,  '⅙'], [1/5,  '⅕'], [1/4,  '¼'],
    [1/3,  '⅓'], [3/8,  '⅜'], [2/5,  '⅖'], [1/2,  '½'],
    [3/5,  '⅗'], [5/8,  '⅝'], [2/3,  '⅔'], [3/4,  '¾'],
    [4/5,  '⅘'], [5/6,  '⅚'], [7/8,  '⅞'],
  ];

  const fmtNum = (v) => v % 1 === 0 ? String(Math.round(v)) : String(v);

  const isCount = COUNT_UNITS.has(u) || u === '';
  if (isCount) {
    if (n < 1) {
      for (const [val, glyph] of FRACTIONS) {
        if (Math.abs(n - val) < 0.03) return glyph;
      }
      return fmtNum(n);
    }
    return `x${fmtNum(n)}`;
  }

  const abbrev = ABBREV[u] || units.trim();
  const INTEGER_UNITS = new Set(['ml', 'g', 'mg', 'kg', 'cal', 'kcal', 'IU']);
  const displayVal = INTEGER_UNITS.has(abbrev) ? Math.round(n) : fmtNum(n);
  return `${displayVal}${abbrev}`;
}

function getFoodEmoji_(name) {
  const n = name.toLowerCase()
    .replace(/berries\b/g, 'berry')   // blueberries→blueberry, strawberries→strawberry, etc.
    .replace(/erries\b/g, 'erry');    // cherries→cherry (doesn't affect "fries")
  const map = [
    // Specific phrases first
    ["egg white",      "🥚"], ["hard boil",     "🥚"],
    ["sweet potato",   "🍠"], ["ice cream",     "🍨"],
    ["hot dog",        "🌭"], ["hotdog",        "🌭"], ["hot sauce",     "🌶️"],
    ["stir fry",       "🥘"], ["peanut butter", "🥜"],
    ["almond milk",    "🥛"], ["oat milk",      "🥛"],
    ["green tea",      "🍵"], ["black tea",     "🍵"],
    ["fried rice",     "🍳"], ["brown rice",    "🍚"],
    ["white rice",     "🍚"],
    // Proteins
    ["egg",      "🥚"], ["chicken", "🍗"], ["turkey",  "🦃"],
    ["beef",     "🥩"], ["steak",   "🥩"], ["pork",    "🥩"],
    ["bacon",    "🥓"], ["butifarra","🌭"], ["chistorra","🌭"], ["fuet",    "🌭"],
    ["salmon",  "🐟"], ["tuna",    "🐟"],
    ["fish",     "🐟"], ["shrimp",  "🦐"], ["lobster", "🦞"],
    ["crab",     "🦀"], ["tofu",    "🫘"], ["tempeh",  "🫘"],
    // Dairy
    ["yogurt",  "🥛"], ["yoghurt", "🥛"], ["cheese",  "🧀"], ["queso",   "🧀"], ["brie",    "🧀"],
    ["butter",  "🧈"], ["milk",    "🥛"], ["cream",   "🥛"],
    ["whey",    "🥛"],
    // Fruits
    ["avocado",      "🥑"], ["strawberry",  "🍓"], ["blueberry",   "🫐"],
    ["raspberry",    "🍓"], ["watermelon",  "🍉"], ["pineapple",   "🍍"],
    ["mango",        "🥭"], ["banana",      "🍌"], ["apple",       "🍎"],
    ["orange",       "🍊"], ["tangerine",   "🍊"], ["lemon",       "🍋"],
    ["lime",         "🍋"], ["grape",       "🍇"], ["peach",       "🍑"],
    ["pear",         "🍐"], ["cherry",      "🍒"], ["coconut",     "🥥"],
    ["kiwi",         "🥝"], ["pomegranate", "🍎"], ["melon",       "🍈"],
    ["medjool",      "🌴"], ["date",        "🌴"],
    ["fig",          "🍑"], ["plum",        "🍑"],
    // Vegetables
    ["broccoli",   "🥦"], ["spinach",   "🥬"], ["kale",       "🥬"],
    ["lettuce",    "🥬"], ["arugula",   "🥬"], ["celery",     "🥬"],
    ["eggplant",   "🍆"], ["aubergine", "🍆"], ["corn",       "🌽"],
    ["carrot",     "🥕"], ["pepper",    "🫑"], ["jalapeño",   "🌶️"],
    ["tomato",     "🍅"], ["cucumber",  "🥒"], ["zucchini",   "🥒"],
    ["courgette",  "🥒"], ["mushroom",  "🍄"], ["onion",      "🧅"],
    ["garlic",     "🧄"], ["potato",    "🥔"], ["pea",        "🫛"],
    ["bean",       "🫘"], ["lentil",    "🫘"], ["chickpea",   "🫘"],
    ["edamame",    "🫛"], ["asparagus", "🌿"], ["artichoke",  "🌿"],
    ["cauliflower","🥦"],
    ["olive",     "🫒"], ["oliva",     "🫒"], ["kalamata",  "🫒"],
    // Grains & baked
    ["granola",   "🥣"], ["oat",       "🥣"], ["cereal",    "🥣"],
    ["pancake",   "🥞"], ["waffle",    "🧇"], ["bagel",     "🥯"],
    ["croissant", "🥐"], ["bread",     "🍞"], ["toast",     "🍞"],
    ["tortilla",  "🫓"], ["pita",      "🫓"], ["naan",      "🫓"],
    ["cracker",   "🍘"], ["pretzel",   "🥨"], ["rice",      "🍚"],
    ["pasta",     "🍝"], ["noodle",    "🍜"], ["ramen",     "🍜"],
    ["spaghetti", "🍝"], ["quinoa",    "🌾"], ["couscous",  "🌾"],
    // Beverages
    ["espresso", "☕"], ["coffee",  "☕"], ["tea",      "🍵"],
    ["smoothie", "🥤"], ["juice",   "🧃"], ["wine",     "🍷"],
    ["beer",     "🍺"], ["water",   "💧"], ["soda",     "🥤"],
    ["lemonade", "🍋"],
    // Dishes
    ["pizza",    "🍕"], ["burger",   "🍔"], ["sandwich", "🥪"],
    ["wrap",     "🌯"], ["taco",     "🌮"], ["burrito",  "🌯"],
    ["sushi",    "🍣"], ["soup",     "🍲"], ["stew",     "🍲"],
    ["chili",    "🍲"], ["salad",    "🥗"], ["curry",    "🍛"],
    ["fries",    "🍟"], ["dumpling", "🥟"], ["meatball", "🥩"],
    ["lasagna",  "🍝"],
    // Nuts & seeds
    ["almond",    "🌰"], ["walnut",    "🌰"], ["pecan",     "🌰"],
    ["cashew",    "🌰"], ["pistachio", "🌰"], ["peanut",    "🥜"],
    ["nut",       "🌰"], ["seed",      "🌱"], ["chia",      "🌱"],
    ["flax",      "🌱"], ["tahini",    "🌰"], ["hummus",    "🫘"],
    // Sweets
    ["chocolate", "🍫"], ["cocoa",     "🍫"], ["brownie",   "🍫"],
    ["cake",      "🎂"], ["cookie",    "🍪"], ["donut",     "🍩"],
    ["doughnut",  "🍩"], ["candy",     "🍬"], ["honey",     "🍯"],
    ["jam",       "🍓"], ["syrup",     "🍯"], ["muffin",    "🧁"],
    ["cupcake",   "🧁"], ["pie",       "🥧"], ["pudding",   "🍮"],
    // Condiments & misc
    ["guacamole",  "🥑"], ["ketchup",   "🍅"], ["salsa",     "🍅"],
    ["mayo",       "🫙"], ["mustard",   "🌭"], ["oil",       "🫙"],
    ["salt",       "🧂"], ["dressing",  "🥗"], ["sauce",     "🫙"],
    ["protein",    "💪"], ["bar",       "🍫"], ["shake",     "🥤"],
    ["supplement", "💊"], ["vitamin",   "💊"], ["collagen",  "💊"],
  ];
  for (const [kw, emoji] of map) {
    if (n.includes(kw)) return emoji;
  }
  return "🍽️";
}
