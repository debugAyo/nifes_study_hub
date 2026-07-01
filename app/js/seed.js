/* ══════════════════════════════════════════════════
   NIFES Study Hub — Seed Data (offline fallback)
   ══════════════════════════════════════════════════ */

var SEED_QUESTIONS = [
  {id:1,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2023",topic:"Differentiation",type:"Calculation",question:"Differentiate y = 3x³ − 5x² + 7x − 2 with respect to x. Find dy/dx when x = 2.",answer:"dy/dx = 9x² − 10x + 7. At x = 2: dy/dx = 9(4) − 10(2) + 7 = 36 − 20 + 7 = 23"},
  {id:2,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2023",topic:"Integration",type:"Calculation",question:"Evaluate ∫(4x³ + 6x − 3) dx.",answer:"∫(4x³ + 6x − 3) dx = x⁴ + 3x² − 3x + C"},
  {id:3,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2022",topic:"Matrices",type:"Calculation",question:"Find the determinant of A = [[2, 3], [1, 4]].",answer:"det(A) = (2)(4) − (3)(1) = 8 − 3 = 5"},
  {id:4,level:"100",course:"Applied Mechanics",code:"MEE 101",year:"2023",topic:null,type:"Theory",question:"State Newton's three laws of motion and give one engineering application of each.",answer:"1st Law (Inertia): seatbelts. 2nd Law (F=ma): braking distance. 3rd Law (Action-Reaction): rocket propulsion."},
  {id:5,level:"100",course:"Applied Mechanics",code:"MEE 101",year:"2022",topic:"Statics",type:"Calculation",question:"A 6m beam is simply supported at both ends. A 12kN load acts at mid-span. Find support reactions.",answer:"By symmetry: RA = RB = 6 kN each."},
  {id:6,level:"100",course:"Introduction to Computing",code:"CSC 101",year:"2023",topic:"Number Systems",type:"Calculation",question:"Convert decimal 245 to binary.",answer:"11110101₂"},
  {id:7,level:"100",course:"Introduction to Computing",code:"CSC 101",year:"2022",topic:"Programming",type:"Theory",question:"Distinguish between a compiler and an interpreter.",answer:"Compiler translates all source at once; interpreter translates line by line. Compiled programs run faster."},
  {id:8,level:"100",course:"Use of English",code:"GST 101",year:"2023",topic:"Essay Writing",type:"Essay",question:"Write an essay on: 'Technology and its Impact on Education in Nigeria'.",answer:"Key points: e-learning, global resources, challenges (power, internet), balanced conclusion."},
  {id:9,level:"100",course:"Technical Drawing",code:"MEE 103",year:"2023",topic:"Orthographic Projection",type:"Theory",question:"Difference between first-angle and third-angle projection. Which is used in Nigeria?",answer:"First-angle (Nigeria uses this): object between viewer and plane. Third-angle: plane between viewer and object."},
  {id:10,level:"200",course:"Engineering Mathematics II",code:"MTH 201",year:"2024",topic:"ODE",type:"Calculation",question:"Solve y'' + 3y' − 10y = 0, y(0)=2, y'(0)=1.",answer:"y = (11/7)e^(2t) + (3/7)e^(−5t)"},
  {id:11,level:"200",course:"Engineering Mathematics II",code:"MTH 201",year:"2023",topic:"Laplace Transform",type:"Calculation",question:"Find L{t·e^(2t)}.",answer:"1/(s−2)², valid for s > 2"},
  {id:12,level:"200",course:"Fluid Mechanics",code:"MEE 201",year:"2024",topic:null,type:"Calculation",question:"Water flows through a pipe narrowing from 0.4m to 0.2m diameter. v₁=2m/s, P₁=200kPa. Find P₂. (ρ=1000 kg/m³)",answer:"v₂=8m/s, P₂=170 kPa"},
  {id:13,level:"200",course:"Fluid Mechanics",code:"MEE 201",year:"2023",topic:"Viscosity",type:"Theory",question:"Define dynamic and kinematic viscosity. SI units? Relationship?",answer:"Dynamic μ (Pa·s): resistance to shear. Kinematic ν (m²/s): μ/ρ."},
  {id:14,level:"200",course:"Applied Electricity",code:"EEE 201",year:"2024",topic:"AC Circuits",type:"Calculation",question:"RLC series: R=10Ω, L=0.1H, C=100μF, 240V/50Hz. Find Z and I.",answer:"Z≈10Ω, I≈23.98A"},
  {id:15,level:"300",course:"Control Systems",code:"MEE 301",year:"2024",topic:"Transfer Functions",type:"Theory",question:"Define a transfer function. State two assumptions.",answer:"Ratio of Laplace output to input (zero ICs). Assumptions: linear, time-invariant, zero ICs."},
  {id:16,level:"300",course:"Thermodynamics",code:"MEE 302",year:"2024",topic:null,type:"Theory",question:"State Kelvin-Planck and Clausius statements of 2nd Law. Show equivalence.",answer:"KP: Can't have 100% efficient engine. Clausius: Can't have perfect refrigerator. Violating one lets you violate the other."},

  {id:17,level:"100",course:"General Studies",code:"GST 101",year:"2024",topic:"Logical Reasoning",type:"MCQ",question:"If all A are B, and some B are C, which conclusion is valid?",answer:'{"correct":"B","options":{"A":"All A are C","B":"Some B are A","C":"No C is A","D":"All C are B"}}'},
  {id:18,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2024",topic:"Algebra",type:"MCQ",question:"What is the value of log₁₀(1000)?",answer:'{"correct":"C","options":{"A":"1","B":"2","C":"3","D":"4"}}'},
];

/* ─── MCQ Helper ──────────────────────────────── */
function extractMCQ(q) {
  if (!q || q.type !== 'MCQ' || !q.answer) return null;
  try {
    var parsed = JSON.parse(q.answer);
    if (parsed && parsed.correct && parsed.options) return parsed;
  } catch {}
  return null;
}

function renderMCQOptions(q) {
  var mcq = extractMCQ(q);
  if (!mcq) return '';
  var labels = ['A', 'B', 'C', 'D'];
  var html = '<div class="mcq-list">';
  labels.forEach(function(l) {
    var val = mcq.options[l];
    if (!val) return;
    var isCorrect = mcq.correct === l;
    html += '<div class="mcq-option' + (isCorrect ? ' mcq-option-correct' : '') + '">' +
      '<span class="mcq-option-label">' + l + '</span><span>' + val + '</span>' +
      '</div>';
  });
  html += '</div>';
  if (mcq.correct) {
    html += '<div class="mcq-answer-inline">✓ Correct answer: <strong>' + mcq.correct + '</strong></div>';
  }
  return html;
}
