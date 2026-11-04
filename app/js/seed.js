/* ══════════════════════════════════════════════════
   NIFES Study Hub — Seed Data (offline fallback)
   ══════════════════════════════════════════════════ */

var SEED_QUESTIONS = [
  // ─── 100 Level ───
  {id:1,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2023",topic:"Differentiation",type:"Calculation",question:"Differentiate y = 3x³ − 5x² + 7x − 2 with respect to x. Find dy/dx when x = 2.",answer:"dy/dx = 9x² − 10x + 7. At x = 2: dy/dx = 9(4) − 10(2) + 7 = 36 − 20 + 7 = 23"},
  {id:2,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2023",topic:"Integration",type:"Calculation",question:"Evaluate ∫(4x³ + 6x − 3) dx.",answer:"∫(4x³ + 6x − 3) dx = x⁴ + 3x² − 3x + C"},
  {id:3,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2022",topic:"Matrices",type:"Calculation",question:"Find the determinant of A = [[2, 3], [1, 4]].",answer:"det(A) = (2)(4) − (3)(1) = 8 − 3 = 5"},
  {id:4,level:"100",course:"Applied Mechanics",code:"MEE 101",year:"2023",topic:"Laws of Motion",type:"Theory",question:"State Newton's three laws of motion and give one engineering application of each.",answer:"1st Law (Inertia): seatbelts. 2nd Law (F=ma): braking distance. 3rd Law (Action-Reaction): rocket propulsion."},
  {id:5,level:"100",course:"Applied Mechanics",code:"MEE 101",year:"2022",topic:"Statics",type:"Calculation",question:"A 6m beam is simply supported at both ends. A 12kN load acts at mid-span. Find support reactions.",answer:"By symmetry: RA = RB = 6 kN each."},
  {id:6,level:"100",course:"Introduction to Computing",code:"CSC 101",year:"2023",topic:"Number Systems",type:"Calculation",question:"Convert decimal 245 to binary.",answer:"11110101₂"},
  {id:7,level:"100",course:"Introduction to Computing",code:"CSC 101",year:"2022",topic:"Programming",type:"Theory",question:"Distinguish between a compiler and an interpreter.",answer:"Compiler translates all source at once; interpreter translates line by line. Compiled programs run faster."},
  {id:8,level:"100",course:"Use of English",code:"GST 101",year:"2023",topic:"Essay Writing",type:"Essay",question:"Write an essay on: 'Technology and its Impact on Education in Nigeria'.",answer:"Key points: e-learning, global resources, challenges (power, internet), balanced conclusion."},
  {id:9,level:"100",course:"Technical Drawing",code:"MEE 103",year:"2023",topic:"Orthographic Projection",type:"Theory",question:"Difference between first-angle and third-angle projection. Which is used in Nigeria?",answer:"First-angle (Nigeria uses this): object between viewer and plane. Third-angle: plane between viewer and object."},
  {id:17,level:"100",course:"General Studies",code:"GST 101",year:"2024",topic:"Logical Reasoning",type:"MCQ",question:"If all A are B, and some B are C, which conclusion is definitely valid?",answer:'{"correct":"B","options":{"A":"All A are C","B":"Some B are A","C":"No C is A","D":"All C are B"}}'},
  {id:18,level:"100",course:"Engineering Mathematics",code:"MTH 101",year:"2024",topic:"Algebra",type:"MCQ",question:"What is the value of log₁₀(1000)?",answer:'{"correct":"C","options":{"A":"1","B":"2","C":"3","D":"4"}}'},
  {id:19,level:"100",course:"Engineering Physics",code:"PHY 101",year:"2024",topic:"Kinematics",type:"MCQ",question:"A body starting from rest accelerates uniformly at 4 m/s² for 5 seconds. What is the distance covered?",answer:'{"correct":"C","options":{"A":"20 m","B":"40 m","C":"50 m","D":"100 m"}}'},
  {id:20,level:"100",course:"Introduction to Computing",code:"CSC 101",year:"2024",topic:"Architecture",type:"MCQ",question:"Which part of the computer CPU is responsible for carrying out arithmetic and logic operations?",answer:'{"correct":"A","options":{"A":"ALU (Arithmetic Logic Unit)","B":"Control Unit","C":"Cache Memory","D":"Register Bus"}}'},
  {id:21,level:"100",course:"Engineering Chemistry",code:"CHM 101",year:"2024",topic:"Chemical Bonding",type:"MCQ",question:"What type of bond is formed by the complete transfer of one or more electrons between atoms?",answer:'{"correct":"B","options":{"A":"Covalent Bond","B":"Ionic / Electrovalent Bond","C":"Hydrogen Bond","D":"Metallic Bond"}}'},

  // ─── 200 Level ───
  {id:10,level:"200",course:"Engineering Mathematics II",code:"MTH 201",year:"2024",topic:"ODE",type:"Calculation",question:"Solve y'' + 3y' − 10y = 0, y(0)=2, y'(0)=1.",answer:"y = (11/7)e^(2t) + (3/7)e^(−5t)"},
  {id:11,level:"200",course:"Engineering Mathematics II",code:"MTH 201",year:"2023",topic:"Laplace Transform",type:"Calculation",question:"Find L{t·e^(2t)}.",answer:"1/(s−2)², valid for s > 2"},
  {id:12,level:"200",course:"Fluid Mechanics",code:"MEE 201",year:"2024",topic:"Bernoulli",type:"Calculation",question:"Water flows through a pipe narrowing from 0.4m to 0.2m diameter. v₁=2m/s, P₁=200kPa. Find P₂. (ρ=1000 kg/m³)",answer:"v₂=8m/s, P₂=170 kPa"},
  {id:13,level:"200",course:"Fluid Mechanics",code:"MEE 201",year:"2023",topic:"Viscosity",type:"Theory",question:"Define dynamic and kinematic viscosity. SI units? Relationship?",answer:"Dynamic μ (Pa·s): resistance to shear. Kinematic ν (m²/s): μ/ρ."},
  {id:14,level:"200",course:"Applied Electricity",code:"EEE 201",year:"2024",topic:"AC Circuits",type:"Calculation",question:"RLC series: R=10Ω, L=0.1H, C=100μF, 240V/50Hz. Find Z and I.",answer:"Z≈10Ω, I≈23.98A"},
  {id:22,level:"200",course:"Strength of Materials",code:"CVE 201",year:"2024",topic:"Stress & Strain",type:"MCQ",question:"Hooke's Law is valid up to which limit on the stress-strain curve?",answer:'{"correct":"A","options":{"A":"Proportional Limit","B":"Elastic Limit","C":"Yield Point","D":"Ultimate Tensile Strength"}}'},
  {id:23,level:"200",course:"Engineering Mathematics II",code:"MTH 201",year:"2024",topic:"Matrices",type:"MCQ",question:"If matrix A is orthogonal, what is the value of A · Aᵀ?",answer:'{"correct":"D","options":{"A":"Null Matrix (0)","B":"Determinant of A","C":"Inverse of A","D":"Identity Matrix (I)"}}'},
  {id:24,level:"200",course:"Electrical Circuits",code:"EEE 201",year:"2024",topic:"Thevenin Theorem",type:"MCQ",question:"According to Thevenin theorem, any linear bilateral network can be replaced by an equivalent voltage source in series with what?",answer:'{"correct":"B","options":{"A":"A parallel resistor","B":"A series resistor (R_th)","C":"An open circuit","D":"An ideal current source"}}'},

  // ─── 300 Level ───
  {id:15,level:"300",course:"Control Systems",code:"MEE 301",year:"2024",topic:"Transfer Functions",type:"Theory",question:"Define a transfer function. State two assumptions.",answer:"Ratio of Laplace output to input (zero ICs). Assumptions: linear, time-invariant, zero ICs."},
  {id:16,level:"300",course:"Thermodynamics",code:"MEE 302",year:"2024",topic:"2nd Law",type:"Theory",question:"State Kelvin-Planck and Clausius statements of 2nd Law. Show equivalence.",answer:"KP: Can't have 100% efficient engine. Clausius: Can't have perfect refrigerator. Violating one lets you violate the other."},
  {id:25,level:"300",course:"Control Engineering",code:"EEE 301",year:"2024",topic:"Stability",type:"MCQ",question:"A linear time-invariant system is BIBO stable if all poles of its closed-loop transfer function lie in which region of the s-plane?",answer:'{"correct":"A","options":{"A":"Left Half of the s-plane (LHP)","B":"Right Half of the s-plane (RHP)","C":"Directly on the imaginary axis (jω)","D":"At infinity"}}'},
  {id:26,level:"300",course:"Engineering Economics",code:"GET 301",year:"2024",topic:"Depreciation",type:"MCQ",question:"Which method of depreciation assumes constant depreciation expense each year throughout the asset's life?",answer:'{"correct":"C","options":{"A":"Sum-of-the-Years-Digits","B":"Declining Balance Method","C":"Straight-Line Method","D":"Sinking Fund Method"}}'},
  {id:27,level:"300",course:"Fluid Machinery",code:"MEE 304",year:"2024",topic:"Turbines",type:"MCQ",question:"Which of the following is classified as an impulse turbine?",answer:'{"correct":"B","options":{"A":"Francis Turbine","B":"Pelton Wheel Turbine","C":"Kaplan Turbine","D":"Propeller Turbine"}}'}
];

/* ─── MCQ Helper ──────────────────────────────── */
function extractMCQ(q) {
  if (!q || !q.answer) return null;
  // If explicitly MCQ or contains JSON answer with options
  try {
    var str = typeof q.answer === 'string' ? q.answer.trim() : '';
    if (str.startsWith('{') && str.endsWith('}')) {
      var parsed = JSON.parse(str);
      if (parsed && parsed.options) {
        return { options: parsed.options, correct: parsed.correct || '' };
      }
    }
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
