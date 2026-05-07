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
  const valRows = parsedData["daily-values"].slice(1);
  const isComplete = valRows.some(r => r[0] === today && r[1] === "Complete" && r[2] === "1");

  // food-logs: Date, Name, Icon, Meal, Quantity, Units, Calories, Deleted, …
  const foodRows = parsedData["food-logs"].slice(1)
    .filter(r => r[0] === today && r[7] !== "1");

  const mealOrder = ["Breakfast", "Lunch", "Dinner", "Snacks"];
  const grouped = {};
  foodRows.forEach(r => {
    const meal = r[3] || "Other";
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push({ name: r[1], qtyStr: formatQty_(r[4], r[5]), cals: Number(r[6]), protein: Number(r[9]) || 0, emoji: getFoodEmoji_(r[1]) });
  });
  // Canonical meals always present; unknown meals appended alphabetically
  const otherMeals = Object.keys(grouped).filter(m => !mealOrder.includes(m)).sort();
  const mealGroups = [...mealOrder, ...otherMeals].map(m => {
    const items = grouped[m] || [];
    return {
      name: m,
      items,
      totalCals: items.reduce((s, item) => s + item.cals, 0),
      totalProtein: Math.round(items.reduce((s, item) => s + item.protein, 0)),
    };
  });

  const foodProtein = foodRows.length
    ? Math.round(foodRows.reduce((s, r) => s + (Number(r[9]) || 0), 0))
    : null;

  // weights: Date, Weight, Last Updated, Deleted
  const weightRows = parsedData["weights"].slice(1).filter(r => r[3] !== "true");

  // profile: Name,Value rows — find the "Goal Weight" row
  let goalWeightKg = null;
  const profileRows = parsedData["profile"];
  if (profileRows) {
    const goalRow = profileRows.slice(1).find(r => r[0] && r[0].toLowerCase().includes("goal") && r[0].toLowerCase().includes("weight"));
    if (goalRow && goalRow[1]) goalWeightKg = Math.round(Number(goalRow[1]) / 2.20462 * 10) / 10;
  }

  const MONTH_ABBR_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateToMs_ = s => { const [m, d, y] = s.split("/"); return new Date(y, m - 1, d).getTime(); };

  const weightByDate = {};
  weightRows.forEach(r => { weightByDate[r[0]] = Math.round(Number(r[1]) / 2.20462 * 10) / 10; });
  const calByDate = {};
  calRows.forEach(r => { calByDate[r[0]] = Number(r[1]); });

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

  const nonNullWeights = chartValues.filter(v => v !== null);
  const allYValues = goalWeightKg !== null ? [...nonNullWeights, goalWeightKg] : nonNullWeights;
  const yMin = allYValues.length ? Math.floor(Math.min(...allYValues)) - 2 : undefined;
  const yMax = allYValues.length ? Math.ceil(Math.max(...allYValues)) + 2 : undefined;

  const todayWeightKg = weightByDate[today] !== undefined ? weightByDate[today] : null;

  const sortedWeightDates = Object.keys(weightByDate).sort((a, b) => dateToMs_(a) - dateToMs_(b));
  const targetWeightKg = todayWeightKg !== null
    ? todayWeightKg
    : (sortedWeightDates.length ? weightByDate[sortedWeightDates[sortedWeightDates.length - 1]] : null);
  const proteinTargetG = targetWeightKg !== null ? Math.round(targetWeightKg * CONFIG.PROTEIN_G_PER_KG) : null;
  const proteinPct = (foodProtein !== null && proteinTargetG)
    ? Math.round(foodProtein / proteinTargetG * 100)
    : null;

  const chartAnnotations = [];
  if (goalWeightKg !== null) chartAnnotations.push({
    type: "line", mode: "horizontal", scaleID: "y-axis-0", value: goalWeightKg,
    borderColor: "#4a90d9", borderWidth: 1, borderDash: [5, 4],
    label: { enabled: true, content: `Goal: ${goalWeightKg} kg`, position: "left", fontSize: 8, fontColor: "#4a90d9", backgroundColor: "rgba(255,255,255,0.8)" },
  });
  if (budgetCals !== null) chartAnnotations.push({
    type: "line", mode: "horizontal", scaleID: "y-axis-1", value: budgetCals,
    borderColor: "#e88b00", borderWidth: 1, borderDash: [5, 4],
    label: { enabled: true, content: `Budget: ${budgetCals} kcal`, position: "left", fontSize: 8, fontColor: "#e88b00", backgroundColor: "rgba(255,255,255,0.8)" },
  });

  const chartConfig = JSON.stringify({
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          type: "line",
          label: "Weight",
          data: chartValues,
          fill: false,
          spanGaps: true,
          borderColor: "#4a90d9",
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: "#4a90d9",
          yAxisID: "y-axis-0",
          datalabels: { display: true, align: "top", anchor: "end", formatter: (v) => v.toFixed(1), font: { size: 9 }, color: "#4a90d9" },
        },
        {
          type: "bar",
          label: "Caloric Intake",
          data: chartCalories,
          backgroundColor: "rgba(255, 152, 0, 0.45)",
          borderColor: "rgba(255, 152, 0, 0.85)",
          borderWidth: 1,
          yAxisID: "y-axis-1",
          datalabels: { display: false, font: { size: 10 }, color: "rgba(255, 152, 0, 0.85)" },
        },
      ],
    },
    options: {
      legend: { display: true },
      ...(chartAnnotations.length ? { annotation: { annotations: chartAnnotations } } : {}),
      scales: {
        yAxes: [
          { id: "y-axis-0", position: "right", scaleLabel: { display: true, labelString: "kg" }, ticks: { precision: 1, min: yMin, max: yMax } },
          { id: "y-axis-1", position: "left", scaleLabel: { display: true, labelString: "kcal" }, ticks: { beginAtZero: true }, gridLines: { drawOnChartArea: false } },
        ],
      },
    },
  });
  const chartUrl = `https://quickchart.io/chart?w=560&h=200&bkg=white&c=${encodeURIComponent(chartConfig)}`;

  const emailData = { longDate, isComplete, foodCals, budgetCals, calPct, foodProtein, proteinTargetG, proteinPct, mealGroups, todayWeightKg, goalWeightKg, chartUrl };

  const htmlTmpl = HtmlService.createTemplateFromFile(CONFIG.EMAIL_TEMPLATE_DIGEST);
  htmlTmpl.data = emailData;

  MailApp.sendEmail({
    // name: ``,
    noReply: true,
    bcc: recipientStr,
    subject: `🏋️ Lose It! summary: ${longDate}`,
    htmlBody: htmlTmpl.evaluate().getContent(),
  });
}
