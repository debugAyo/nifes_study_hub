-- NIFES Study Hub — Seed Data
-- Run after schema.sql + policies.sql in Supabase SQL Editor

insert into questions (level, course, code, year, topic, type, question, answer) values
-- 100 Level
('100', 'Engineering Mathematics', 'MTH 101', '2023', 'Differentiation', 'Calculation',
 'Differentiate y = 3x³ − 5x² + 7x − 2 with respect to x. Find the value of dy/dx when x = 2.',
 'dy/dx = 9x² − 10x + 7. At x = 2: dy/dx = 9(4) − 10(2) + 7 = 36 − 20 + 7 = 23'),

('100', 'Engineering Mathematics', 'MTH 101', '2023', 'Integration', 'Calculation',
 'Evaluate ∫(4x³ + 6x − 3) dx.',
 '∫(4x³ + 6x − 3) dx = x⁴ + 3x² − 3x + C'),

('100', 'Engineering Mathematics', 'MTH 101', '2022', 'Matrices', 'Calculation',
 'Find the determinant of the matrix A = [[2, 3], [1, 4]].',
 'det(A) = (2)(4) − (3)(1) = 8 − 3 = 5'),

('100', 'Applied Mechanics', 'MEE 101', '2023', 'Newton''s Laws', 'Theory',
 'State Newton''s three laws of motion and give one engineering application of each.',
 '1st Law (Inertia): A body at rest or uniform motion stays so unless acted upon by a net force. App: seatbelts. 2nd Law (F=ma): Net force = mass × acceleration. App: vehicle braking distance calculation. 3rd Law (Action-Reaction): For every action there is an equal and opposite reaction. App: rocket propulsion.'),

('100', 'Applied Mechanics', 'MEE 101', '2022', 'Statics', 'Calculation',
 'A beam of length 6 m is simply supported at both ends. A concentrated load of 12 kN acts at the mid-span. Calculate the support reactions.',
 'By symmetry: RA = RB = 12/2 = 6 kN each.'),

('100', 'Introduction to Computing', 'CSC 101', '2023', 'Number Systems', 'Calculation',
 'Convert the decimal number 245 to binary.',
 '245 ÷ 2 = 122 R0, 122 ÷ 2 = 61 R0, 61 ÷ 2 = 30 R1, 30 ÷ 2 = 15 R0, 15 ÷ 2 = 7 R1, 7 ÷ 2 = 3 R1, 3 ÷ 2 = 1 R1, 1 ÷ 2 = 0 R1. Result: 11110101₂'),

('100', 'Introduction to Computing', 'CSC 101', '2022', 'Programming', 'Theory',
 'Distinguish between a compiler and an interpreter. Which is generally faster at runtime and why?',
 'Compiler: Translates entire source code to machine code before execution. Interpreter: Translates and executes line by line at runtime. Compilers produce faster runtime programs because translation overhead happens once at compile time.'),

('100', 'Use of English', 'GST 101', '2023', 'Essay Writing', 'Essay',
 'Write an essay of not more than 500 words on: Technology and its Impact on Education in Nigeria.',
 'Key points: 1. Introduction defining technology in education. 2. Positive impacts: e-learning, global resources, interactive tools. 3. Challenges: power supply, internet cost, urban/rural inequality. 4. Conclusion: technology as a tool, not replacement for teachers.'),

('100', 'Technical Drawing', 'MEE 103', '2023', 'Orthographic Projection', 'Theory',
 'Explain the difference between first-angle and third-angle orthographic projection. Which is predominantly used in Nigeria?',
 'First-angle: object between viewer and projection plane, views opposite to viewing direction. Third-angle: projection plane between viewer and object, views same side as viewing. Nigeria uses first-angle projection (British Standard).'),

-- 200 Level
('200', 'Engineering Mathematics II', 'MTH 201', '2024', 'ODE', 'Calculation',
 'Solve the second-order ODE: y'''' + 3y'' − 10y = 0 with initial conditions y(0) = 2 and y''(0) = 1.',
 'Characteristic: r² + 3r − 10 = 0 → (r+5)(r−2)=0 → r=2, -5. General: y = C₁e^(2t) + C₂e^(-5t). Using ICs: y = (11/7)e^(2t) + (3/7)e^(-5t).'),

('200', 'Engineering Mathematics II', 'MTH 201', '2023', 'Laplace Transform', 'Calculation',
 'Find the Laplace transform of f(t) = t·e^(2t).',
 'Using L{t·e^(at)} = 1/(s−a)²: L{t·e^(2t)} = 1/(s−2)², valid for s > 2.'),

('200', 'Fluid Mechanics', 'MEE 201', '2024', 'Bernoulli''s Equation', 'Calculation',
 'Water flows through a pipe that narrows from 0.4m to 0.2m diameter. If velocity at wider section is 2 m/s and pressure is 200 kPa, find pressure at narrower section. (ρ = 1000 kg/m³)',
 'Continuity: A₁v₁ = A₂v₂ → v₂ = 8 m/s. Bernoulli: P₂ = P₁ + ½ρ(v₁²−v₂²) = 200,000 + ½(1000)(4−64) = 170,000 Pa = 170 kPa.'),

('200', 'Fluid Mechanics', 'MEE 201', '2023', 'Viscosity', 'Theory',
 'Define dynamic viscosity and kinematic viscosity. State their SI units and relationship.',
 'Dynamic viscosity (μ): resistance to shear deformation, unit Pa·s. Kinematic viscosity (ν): ratio of dynamic viscosity to density, unit m²/s. Relationship: ν = μ/ρ.'),

('200', 'Applied Electricity', 'EEE 201', '2024', 'AC Circuits', 'Calculation',
 'An RLC series circuit has R=10Ω, L=0.1H, C=100μF. Supply is 240V (rms) at 50 Hz. Find impedance and current.',
 'ω=314.16 rad/s, XL=31.42Ω, XC=31.83Ω, Z=√(100+(−0.41)²)≈10.008Ω, I=240/10.008≈23.98A.'),

-- 300 Level
('300', 'Control Systems', 'MEE 301', '2024', 'Transfer Functions', 'Theory',
 'Define a transfer function of a linear time-invariant system. State two assumptions made.',
 'Transfer function: ratio of Laplace transform of output to input, assuming zero initial conditions. Assumptions: 1) System is linear, 2) Initial conditions are zero, 3) System is time-invariant.'),

('300', 'Thermodynamics', 'MEE 302', '2024', 'Second Law', 'Theory',
  'State the Kelvin-Planck and Clausius statements of the Second Law of Thermodynamics and show their equivalence.',
  'Kelvin-Planck: Impossible to construct a cycle heat engine that produces no effect other than heat from a single reservoir and work. Clausius: Impossible to construct a cycle device that transfers heat from cooler to hotter body with no other effect. Violation of one implies violation of the other.'),

-- MCQ sample questions
('100', 'General Studies', 'GST 101', '2024', 'Logical Reasoning', 'MCQ',
  'If all A are B, and some B are C, which conclusion is valid?',
  '{"correct":"B","options":{"A":"All A are C","B":"Some B are A","C":"No C is A","D":"All C are B"}}'),

('100', 'Engineering Mathematics', 'MTH 101', '2024', 'Algebra', 'MCQ',
  'What is the value of log₁₀(1000)?',
  '{"correct":"C","options":{"A":"1","B":"2","C":"3","D":"4"}}');
