// https://developers.google.com/apps-script/reference/properties/properties-service

const props = PropertiesService.getScriptProperties().getProperties();

const CONFIG = {

  // Units used by the Lose It! export for weight data.
  // "lbs"    → displayed as-is in lbs (default)
  // "kg"     → displayed as-is in kg
  // "stones" → converted and displayed in kg
  WEIGHT_UNIT: "kg",

  // Multiplier for the _recommended_ daily protein intake (g per kg of body weight).
  // Rough guidenace (https://www.health.harvard.edu/blog/how-much-protein-do-you-need-every-day-201506188096):
  // - Sedentary adults: 1.0
  // - Active / athletes: 1.4-1.8
  // - Active / muscle building: 2.0+
  PROTEIN_G_PER_KG: 1.8,

  // Number of days shown in the calorie chart (sliding window).
  CHART_WINDOW_DAYS: 7,

  //////////////////////////////////////////////////////////////////////////////////////

  // HtmlService template file names for email bodies.
  EMAIL_TEMPLATE_DIGEST: "Digest:EmailHtml",
  EMAIL_TEMPLATE_COOKIE_EXPIRY: "Email:CookieExpiryTxt",

  EXPORT_URL: "https://loseit.com/export/data",
  EXPORT_SESSION_COOKIE: `fn_auth=${props["LOSEIT_SESSION_COOKIE"]}`,
  EXPORT_SESSION_COOKIE_EXPIRY_WARNING_DAYS: 2,

  DIGEST_RECIPIENTS: props["DIGEST_RECIPIENTS"],

  // Controls which CSV files from the exported ZIP are processed.
  // The name of sheet tab excludes the ".csv" extension.
  CSV_FILES: [
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
  ],

};
