// https://developers.google.com/apps-script/reference/properties/properties-service

const props = PropertiesService.getScriptProperties().getProperties();

const CONFIG = {
  EXPORT_URL: "https://loseit.com/export/data",
  EXPORT_SESSION_COOKIE: `fn_auth=${props["LOSEIT_SESSION_COOKIE"]}`,
  EXPORT_SESSION_COOKIE_EXPIRY_WARNING_DAYS: 2,

  DIGEST_RECIPIENTS: props["DIGEST_RECIPIENTS"],

  // Recommended daily protein intake multiplier (g per kg of body weight).
  // Sedentary adults: 1.0
  // Active / athletes: 1.5
  // Active / muscle building: 2.0
  PROTEIN_G_PER_KG: 1.5,
};

// CSV filenames to process; sheet tab name = filename without ".csv"
const CSV_FILES = [
  // "achievement-actions.csv",
  // "achievements.csv",
  // "active-food-servings.csv",
  // "course-progress.csv",
  // "custom-exercises.csv",
  // "custom-foods.csv",
  "daily-calorie-summary.csv",
  "daily-values.csv",
  // "exercise-logs.csv",
  // "fasting-logs.csv",
  // "fasting-schedules.csv",
  "food-logs.csv",
  // "food-photos/food-photos.csv", // Refers to photos included in this directory.
  // "notes.csv",
  "profile.csv",
  // "progress-photos/progress-photos.csv", // Refers to photos included in this directory.
  // "recipes.csv",
  // "weight-loss-medication-logs.csv",
  "weights.csv",
];
