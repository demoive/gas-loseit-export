const MONTH_ABBR_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dateToMs_(dateStr) {
  const [m, d, y] = dateStr.split("/");
  return new Date(y, m - 1, d).getTime();
}

// Returns { values, slope, intercept } — slope/intercept needed for intersection math.
function linearTrend_(values) {
  const idxs = [], vals = [];
  values.forEach((v, i) => { if (v !== null) { idxs.push(i); vals.push(v); } });
  if (idxs.length < 2) return { values: values.map(() => null), slope: 0, intercept: null };
  const n = idxs.length;
  const sumX = idxs.reduce((s, x) => s + x, 0);
  const sumY = vals.reduce((s, y) => s + y, 0);
  const sumXY = idxs.reduce((s, x, j) => s + x * vals[j], 0);
  const sumX2 = idxs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return {
    values: values.map((_, i) => Math.round((slope * i + intercept) * 100) / 100),
    slope,
    intercept,
  };
}

function buildMealGroups_(foodRows) {
  const mealOrder = ["Breakfast", "Lunch", "Dinner", "Snacks"];
  const grouped = {};
  foodRows.forEach(r => {
    const meal = r[3] || "Other";
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push({ name: r[1], qtyStr: formatQty_(r[4], r[5]), cals: Number(r[6]), protein: Number(r[9]) || 0, emoji: getFoodEmoji_(r[1]) });
  });
  const otherMeals = Object.keys(grouped).filter(m => !mealOrder.includes(m)).sort();
  const mealGroups = [...mealOrder, ...otherMeals].map(m => {
    const items = grouped[m] || [];
    return { name: m, items, totalCals: items.reduce((s, i) => s + i.cals, 0), totalProtein: Math.round(items.reduce((s, i) => s + i.protein, 0)) };
  });
  const foodProtein = foodRows.length ? Math.round(foodRows.reduce((s, r) => s + (Number(r[9]) || 0), 0)) : null;
  return { mealGroups, foodProtein };
}

function buildChartWindow_(today, weightByDate, calByDate) {
  const todayMs = dateToMs_(today);
  const windowDates = Array.from({ length: CONFIG.CHART_WINDOW_DAYS }, (_, i) => {
    const d = new Date(todayMs - (CONFIG.CHART_WINDOW_DAYS - 1 - i) * 24 * 60 * 60 * 1000);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  });
  const chartLabels = windowDates.map(d => { const [m, dy] = d.split("/"); return `${MONTH_ABBR_[Number(m) - 1]} ${Number(dy)}`; });
  const chartValues = windowDates.map(d => weightByDate[d] !== undefined ? weightByDate[d] : null);
  const chartCalories = windowDates.map(d => calByDate[d] !== undefined ? calByDate[d] : null);
  return { windowDates, chartLabels, chartValues, chartCalories };
}

function buildWeightOnlyChartUrl_(weightByDate, startDate, today, goalWeightKg, weightUnit) {
  const sortedDates = Object.keys(weightByDate).sort((a, b) => dateToMs_(a) - dateToMs_(b));
  if (sortedDates.length === 0) return "";

  const firstMs = startDate ? dateToMs_(startDate) : dateToMs_(sortedDates[0]);
  const lastMs  = dateToMs_(sortedDates[sortedDates.length - 1]);

  // Build a contiguous day range from first to last weight date.
  const windowDates = [];
  for (let ms = firstMs; ms <= lastMs; ms += 24 * 60 * 60 * 1000) {
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    windowDates.push(`${mm}/${dd}/${d.getFullYear()}`);
  }

  const chartLabels = windowDates.map(d => { const [m, dy] = d.split("/"); return `${MONTH_ABBR_[Number(m) - 1]} ${Number(dy)}`; });
  const chartValues = windowDates.map(d => weightByDate[d] !== undefined ? weightByDate[d] : null);

  const { values: trendValues, slope, intercept } = linearTrend_(chartValues);

  // Extend forward until the trend line reaches the goal weight (cap at 180 days).
  let extLabels = [...chartLabels];
  let extValues = [...chartValues];
  let extTrend  = [...trendValues];

  if (goalWeightKg !== null && slope !== 0 && intercept !== null) {
    const intersectIdx = (goalWeightKg - intercept) / slope;
    const lastIdx = chartValues.length - 1;
    if (intersectIdx > lastIdx) {
      const daysToAdd = Math.min(Math.ceil(intersectIdx) - lastIdx, 180);
      for (let i = 1; i <= daysToAdd; i++) {
        const d = new Date(lastMs + i * 24 * 60 * 60 * 1000);
        extLabels.push(`${MONTH_ABBR_[d.getMonth()]} ${d.getDate()}`);
        extValues.push(null);
        extTrend.push(Math.round((slope * (lastIdx + i) + intercept) * 100) / 100);
      }
    }
  }

  const nonNullWeights = extValues.filter(v => v !== null);
  const nonNullTrend   = extTrend.filter(v => v !== null);
  const allValues = goalWeightKg !== null
    ? [...nonNullWeights, goalWeightKg, ...nonNullTrend]
    : [...nonNullWeights, ...nonNullTrend];
  const yMin = allValues.length ? Math.floor(Math.min(...allValues)) - 2 : undefined;
  const yMax = allValues.length ? Math.ceil(Math.max(...allValues)) + 2 : undefined;

  const [tm, tdy] = today.split("/");
  const todayLabel = `${MONTH_ABBR_[Number(tm) - 1]} ${Number(tdy)}`;

  const startWeight = startDate && weightByDate[startDate] !== undefined
    ? weightByDate[startDate]
    : (sortedDates.length ? weightByDate[sortedDates[0]] : null);
  const currentWeight = weightByDate[today] !== undefined
    ? weightByDate[today]
    : (sortedDates.length ? weightByDate[sortedDates[sortedDates.length - 1]] : null);
  let todayAnnotationContent = "Today";
  if (startWeight !== null && currentWeight !== null) {
    const diff = Math.round((startWeight - currentWeight) * 10) / 10;
    const sign = diff < 0 ? "+" : diff > 0 ? "-" : "";
    todayAnnotationContent = `Today (𝚫 ${sign}${Math.abs(diff)} ${weightUnit})`;
  }

  const annotations = [];
  if (extLabels.includes(todayLabel)) annotations.push({
    type: "line", mode: "vertical", scaleID: "x-axis-0", value: todayLabel,
    borderColor: "rgba(220,50,50,0.7)", borderWidth: 1,
    label: { enabled: true, content: todayAnnotationContent, position: "top", fontSize: 8, fontColor: "#dc3232", backgroundColor: "rgba(255,255,255,0.8)" },
  });
  if (goalWeightKg !== null) annotations.push({
    type: "line", mode: "horizontal", scaleID: "y-axis-0", value: goalWeightKg,
    borderColor: "#27ae60", borderWidth: 1, borderDash: [5, 4],
    label: { enabled: true, content: `Goal: ${goalWeightKg} ${weightUnit}`, position: "left", fontSize: 8, fontColor: "#27ae60", backgroundColor: "rgba(255,255,255,0.8)" },
  });

  const config = JSON.stringify({
    type: "line",
    data: {
      labels: extLabels,
      datasets: [
        {
          label: "Weight", data: extValues,
          fill: false, spanGaps: true, borderColor: "#4a90d9", tension: 0.3, pointRadius: 2, pointBackgroundColor: "#4a90d9",
          yAxisID: "y-axis-0",
          datalabels: { display: false, align: "top", anchor: "end", formatter: (v) => v.toFixed(1), font: { size: 9 }, color: "#4a90d9" },
        },
        {
          label: "Trend", data: extTrend,
          fill: false, spanGaps: true, borderColor: "rgba(74, 143, 217, 0.6)", borderWidth: 1.5, tension: 0, pointRadius: 0,
          yAxisID: "y-axis-0",
          datalabels: { display: false },
        },
      ],
    },
    options: {
      title: { display: true, text: `Weight trend + projected goal date` },
      legend: { display: false },
      ...(annotations.length ? { annotation: { annotations } } : {}),
      scales: {
        yAxes: [{ id: "y-axis-0", position: "left", scaleLabel: { display: true, labelString: weightUnit }, ticks: { precision: 1, min: yMin, max: yMax } }],
      },
    },
  });
  return `https://quickchart.io/chart?w=560&h=200&bkg=white&c=${encodeURIComponent(config)}`;
}


function buildWeightCaloriesChartUrl_(chartLabels, chartCalories, budgetCals, chartProtein, proteinTargetG) {
  const annotations = [];
  if (budgetCals !== null) annotations.push({
    type: "line",
    mode: "horizontal",
    scaleID: "y-axis-0",
    value: budgetCals,
    borderColor: "#e88b00",
    borderWidth: 1,
    borderDash: [5, 4],
    label: {
      enabled: true,
      content: `Budget`,
      position: "left",
      fontSize: 8,
      fontColor: "#e88b00",
      backgroundColor: "rgba(255,255,255,0.8)",
      xPadding: 2,
      yPadding: 2,
      cornerRadius: 4,
    },
  });
  if (proteinTargetG !== null) annotations.push({
    type: "line",
    mode: "horizontal",
    scaleID: "y-axis-1",
    value: proteinTargetG,
    borderColor: "#a570cb",
    borderWidth: 1,
    borderDash: [5, 4],
    label: {
      enabled: true,
      content: `Target`,
      position: "right",
      fontSize: 8,
      fontColor: "#6a00b8",
      backgroundColor: "rgba(255,255,255,0.8)",
      xPadding: 2,
      yPadding: 2,
      cornerRadius: 4,
    },
  });

  const config = JSON.stringify({
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Calories",
          data: chartCalories,
          backgroundColor: "#efae4c",
          yAxisID: "y-axis-0",
          datalabels: { display: false },
        },
        {
          label: "Protein",
          data: chartProtein,
          // type: "line",
          // fill: false,
          // spanGaps: true,
          // tension: 0.3,
          // pointRadius: 2,
          // pointBackgroundColor: "rgba(106,0,184,0.8)",
          backgroundColor: "#aa53e9",
          yAxisID: "y-axis-1",
          datalabels: { display: false },
        },
      ],
    },
    options: {
      title: { display: true, text: `Daily intake (past ${CONFIG.CHART_WINDOW_DAYS} days)` },
      legend: { display: true },
      ...(annotations.length ? { annotation: { annotations } } : {}),
      scales: {
        yAxes: [
          { id: "y-axis-0", position: "left", scaleLabel: { display: true, labelString: "kcal" }, ticks: { beginAtZero: true } },
          { id: "y-axis-1", position: "right", scaleLabel: { display: true, labelString: "g" }, ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  });
  return `https://quickchart.io/chart?w=560&h=200&bkg=white&c=${encodeURIComponent(config)}`;
}

/**
 * Builds and sends the daily digest email.
 * @param {Object} parsedData    Map of tab name → 2D array of rows. Defaults to readAllSheets().
 * @param {Date}   targetDate    Date to report on. Defaults to today.
 * @param {string} recipientStr  BCC address. Defaults to CONFIG.DIGEST_RECIPIENTS.
 */
function sendDigest(parsedData = readAllSheets(), targetDate = new Date(), recipientStr = CONFIG.DIGEST_RECIPIENTS) {
  const today = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const longDate = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "d MMMM yyyy");

  // daily-calorie-summary: Date, Food cals, Exercise cals, Budget cals, EER
  const calRows = parsedData["daily-calorie-summary"].slice(1);
  const calRow = calRows.find(r => r[0] === today);
  const foodCals = calRow ? Number(calRow[1]) : null;
  const budgetCals = calRow ? Math.round(Number(calRow[3])) : null;
  const calPct = (foodCals !== null && budgetCals) ? Math.round(foodCals / budgetCals * 100) : null;

  // daily-values: Date, Name, Value
  const isComplete = parsedData["daily-values"].slice(1).some(r => r[0] === today && r[1] === "Complete" && r[2] === "1");

  // food-logs: Date, Name, Icon, Meal, Quantity, Units, Calories, Deleted, …
  const foodRows = parsedData["food-logs"].slice(1).filter(r => r[0] === today && r[7] !== "1");
  const { mealGroups, foodProtein } = buildMealGroups_(foodRows);

  // weights: Date, Weight, Last Updated, Deleted
  const weightByDate = {};
  const weightUnit = CONFIG.WEIGHT_UNIT === "lbs" ? "lbs" : "kg";
  const toDisplay = CONFIG.WEIGHT_UNIT === "stones" ? 6.35029 : 1;
  const displayToKg = CONFIG.WEIGHT_UNIT === "lbs" ? 1 / 2.20462 : 1;
  parsedData["weights"].slice(1).filter(r => r[3] !== "true")
    .forEach(r => { weightByDate[r[0]] = Math.round(Number(r[1]) * toDisplay * 10) / 10; });

  // profile: Name, Value rows — find Goal Weight and Start Date
  let goalWeightKg = null;
  let startDate = null;
  const profileRows = parsedData["profile"];
  if (profileRows) {
    const goalRow  = profileRows.slice(1).find(r => r[0] && r[0].toLowerCase().includes("goal") && r[0].toLowerCase().includes("weight"));
    if (goalRow && goalRow[1]) goalWeightKg = Math.round(Number(goalRow[1]) * toDisplay * 10) / 10;
    const startRow = profileRows.slice(1).find(r => r[0] && r[0].toLowerCase().includes("start") && r[0].toLowerCase().includes("date"));
    if (startRow && startRow[1]) startDate = Utilities.formatDate(new Date(startRow[1]), Session.getScriptTimeZone(), "MM/dd/yyyy");
  }

  const calByDate = {};
  calRows.forEach(r => { calByDate[r[0]] = Number(r[1]); });

  const proteinByDate = {};
  parsedData["food-logs"].slice(1).filter(r => r[7] !== "1").forEach(r => {
    const d = r[0];
    if (!d) return;
    proteinByDate[d] = (proteinByDate[d] || 0) + (Number(r[9]) || 0);
  });

  // protein target based on most recent weight
  const todayWeightKg = weightByDate[today] !== undefined ? weightByDate[today] : null;
  const sortedWeightDates = Object.keys(weightByDate).sort((a, b) => dateToMs_(a) - dateToMs_(b));
  const targetWeightDisplay = todayWeightKg !== null
    ? todayWeightKg
    : (sortedWeightDates.length ? weightByDate[sortedWeightDates[sortedWeightDates.length - 1]] : null);
  const proteinTargetG = targetWeightDisplay !== null ? Math.round(targetWeightDisplay * displayToKg * CONFIG.PROTEIN_G_PER_KG) : null;
  const proteinPct = (foodProtein !== null && proteinTargetG) ? Math.round(foodProtein / proteinTargetG * 100) : null;

  // charts
  const { windowDates, chartLabels, chartValues, chartCalories } = buildChartWindow_(today, weightByDate, calByDate);
  const weightOnlyChartUrl = buildWeightOnlyChartUrl_(weightByDate, startDate, today, goalWeightKg, weightUnit);
  const chartProtein = windowDates.map(d => proteinByDate[d] !== undefined ? Math.round(proteinByDate[d]) : null);
  const chartUrl = buildWeightCaloriesChartUrl_(chartLabels, chartCalories, budgetCals, chartProtein, proteinTargetG);

  const emailData = { longDate, isComplete, foodCals, budgetCals, calPct, foodProtein, proteinTargetG, proteinPct, mealGroups, todayWeightKg, goalWeightKg, weightUnit, weightOnlyChartUrl, chartUrl };

  const htmlTmpl = HtmlService.createTemplateFromFile(CONFIG.EMAIL_TEMPLATE_DIGEST);
  htmlTmpl.data = emailData;

  MailApp.sendEmail({
    noReply: true,
    bcc: recipientStr,
    subject: `🏋️ Lose It! summary: ${longDate}`,
    htmlBody: htmlTmpl.evaluate().getContent(),
  });
}
