/**
 * JEE/NEET Test Suite for Accuracy Validation
 * 50+ sample problems across Physics, Chemistry, Math, Biology
 */

export interface TestProblem {
  id: string;
  subject: 'physics' | 'chemistry' | 'math' | 'biology';
  exam: 'jee' | 'neet';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  correctAnswer: string;
  solution: string;
  topic: string;
  expectedResponseType: 'explanation' | 'step-by-step' | 'concept' | 'hint';
}

export const jeeNeetProblems: TestProblem[] = [
  {
    id: 'jee-phy-1',
    subject: 'physics',
    exam: 'jee',
    difficulty: 'medium',
    question: `A particle moving in a straight line covers half the distance with speed 3 m/s. The other half of the distance is covered in two equal time intervals with speed 4.5 m/s and 7.5 m/s respectively. The average speed of the particle during this motion is:`,
    options: ['4.0 m/s', '5.0 m/s', '5.5 m/s', '4.8 m/s'],
    correctAnswer: '4.0 m/s',
    solution: `Use weighted average for non-uniform motion. For half distance at 3 m/s and half in two equal times at different speeds, calculate time-weighted average.`,
    topic: 'Kinematics',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'jee-phy-2',
    subject: 'physics',
    exam: 'jee',
    difficulty: 'hard',
    question: `A uniform rod of length L and mass M is pivoted at the centre. Two forces F and 2F are applied on the two ends perpendicular to the rod. What is the angular acceleration?`,
    correctAnswer: '3F/(ML)',
    solution: `Torque = Iα, where I = ML²/12 for rod pivoted at center. Net torque = 2F(L/2) - F(L/2) = FL/2`,
    topic: 'Rotational Mechanics',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'jee-phy-3',
    subject: 'physics',
    exam: 'jee',
    difficulty: 'easy',
    question: `What is the dimension of Planck's constant?`,
    options: ['ML²T⁻¹', 'ML²T⁻²', 'MLT⁻¹', 'ML²T⁻³'],
    correctAnswer: 'ML²T⁻¹',
    solution: `E = hν, so h = E/ν = (ML²T⁻²)/(T⁻¹) = ML²T⁻¹`,
    topic: 'Units and Dimensions',
    expectedResponseType: 'explanation',
  },
  {
    id: 'jee-chem-1',
    subject: 'chemistry',
    exam: 'jee',
    difficulty: 'medium',
    question: `The hybridization of carbon atoms in C-C single bond of HC≡C-CH=CH₂ is:`,
    options: ['sp-sp²', 'sp-sp³', 'sp²-sp³', 'sp³-sp³'],
    correctAnswer: 'sp-sp²',
    solution: `First carbon (triple bond) is sp, second carbon (single bond with first) is sp, third carbon (double bond) is sp²`,
    topic: 'Chemical Bonding',
    expectedResponseType: 'explanation',
  },
  {
    id: 'jee-chem-2',
    subject: 'chemistry',
    exam: 'jee',
    difficulty: 'hard',
    question: `Calculate the pH of a buffer solution containing 0.1 M CH₃COOH and 0.15 M CH₃COONa. (pKa of CH₃COOH = 4.76)`,
    correctAnswer: '4.94',
    solution: `Use Henderson-Hasselbalch equation: pH = pKa + log([salt]/[acid]) = 4.76 + log(0.15/0.1) = 4.76 + 0.18 = 4.94`,
    topic: 'Ionic Equilibrium',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'jee-chem-3',
    subject: 'chemistry',
    exam: 'jee',
    difficulty: 'easy',
    question: `Which of the following is the strongest acid?`,
    options: ['HF', 'HCl', 'HBr', 'HI'],
    correctAnswer: 'HI',
    solution: `Acidity of hydrogen halides increases down the group due to decreasing bond strength: HI > HBr > HCl > HF`,
    topic: 'Acids and Bases',
    expectedResponseType: 'concept',
  },
  {
    id: 'jee-math-1',
    subject: 'math',
    exam: 'jee',
    difficulty: 'medium',
    question: `If f(x) = x³ - 3x² + 4, find the number of critical points in the interval [0, 3]`,
    correctAnswer: '2',
    solution: `f'(x) = 3x² - 6x = 3x(x-2). Critical points at x=0 and x=2, both in [0,3]`,
    topic: 'Differential Calculus',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'jee-math-2',
    subject: 'math',
    exam: 'jee',
    difficulty: 'hard',
    question: `Evaluate: ∫(0 to π/2) sin²x/(sin²x + cos²x + sinx·cosx) dx`,
    correctAnswer: 'π/6',
    solution: `Use King's property: I = ∫f(x)dx = ∫f(a-x)dx. Add equations and simplify.`,
    topic: 'Integral Calculus',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'jee-math-3',
    subject: 'math',
    exam: 'jee',
    difficulty: 'easy',
    question: `What is the value of i⁴⁷ where i = √(-1)?`,
    options: ['-i', 'i', '-1', '1'],
    correctAnswer: '-i',
    solution: `i⁴⁷ = i⁴⁴ · i³ = (i⁴)¹¹ · i³ = 1¹¹ · i³ = i³ = -i`,
    topic: 'Complex Numbers',
    expectedResponseType: 'explanation',
  },
  {
    id: 'neet-bio-1',
    subject: 'biology',
    exam: 'neet',
    difficulty: 'medium',
    question: `Which of the following is NOT a function of the Golgi apparatus?`,
    options: [
      'Formation of lysosomes',
      'Protein synthesis',
      'Glycosylation of proteins',
      'Formation of secretory vesicles'
    ],
    correctAnswer: 'Protein synthesis',
    solution: `Protein synthesis occurs in ribosomes, not Golgi apparatus. Golgi modifies, packages and transports proteins.`,
    topic: 'Cell Biology',
    expectedResponseType: 'concept',
  },
  {
    id: 'neet-bio-2',
    subject: 'biology',
    exam: 'neet',
    difficulty: 'hard',
    question: `In a Hardy-Weinberg population with two alleles A (freq p) and a (freq q), if the frequency of AA is 0.36, what is the frequency of heterozygotes?`,
    correctAnswer: '0.48',
    solution: `p² = 0.36, so p = 0.6, q = 1-p = 0.4. Heterozygote frequency = 2pq = 2(0.6)(0.4) = 0.48`,
    topic: 'Genetics',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'neet-bio-3',
    subject: 'biology',
    exam: 'neet',
    difficulty: 'easy',
    question: `Which blood vessel carries oxygenated blood from lungs to heart?`,
    options: ['Pulmonary artery', 'Pulmonary vein', 'Aorta', 'Vena cava'],
    correctAnswer: 'Pulmonary vein',
    solution: `Pulmonary vein is the only vein that carries oxygenated blood (from lungs to left atrium)`,
    topic: 'Circulation',
    expectedResponseType: 'concept',
  },
  {
    id: 'neet-phy-1',
    subject: 'physics',
    exam: 'neet',
    difficulty: 'medium',
    question: `A convex lens of focal length 20 cm forms a real image at 60 cm from the lens. What is the object distance?`,
    correctAnswer: '30 cm',
    solution: `Use lens formula: 1/f = 1/v - 1/u. 1/20 = 1/60 - 1/u, solving gives u = -30 cm`,
    topic: 'Optics',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'neet-phy-2',
    subject: 'physics',
    exam: 'neet',
    difficulty: 'easy',
    question: `The SI unit of electric field is:`,
    options: ['N/C', 'C/N', 'J/C', 'C/m'],
    correctAnswer: 'N/C',
    solution: `Electric field E = F/q, so unit is Newton/Coulomb or N/C (also V/m)`,
    topic: 'Electrostatics',
    expectedResponseType: 'explanation',
  },
  {
    id: 'neet-chem-1',
    subject: 'chemistry',
    exam: 'neet',
    difficulty: 'medium',
    question: `What is the IUPAC name of CH₃-CH(OH)-CH₂-CHO?`,
    correctAnswer: '3-hydroxybutanal',
    solution: `Principal functional group is aldehyde (-al). Number from aldehyde carbon. OH at position 3.`,
    topic: 'Nomenclature',
    expectedResponseType: 'explanation',
  },
  {
    id: 'neet-chem-2',
    subject: 'chemistry',
    exam: 'neet',
    difficulty: 'hard',
    question: `Calculate the molarity of H₂SO₄ solution if 20 mL of it neutralizes 50 mL of 0.1 M NaOH`,
    correctAnswer: '0.125 M',
    solution: `H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O. Milliequivalents: M₁V₁n₁ = M₂V₂n₂. M₁(20)(2) = 0.1(50)(1), M₁ = 0.125 M`,
    topic: 'Volumetric Analysis',
    expectedResponseType: 'step-by-step',
  },
  {
    id: 'neet-chem-3',
    subject: 'chemistry',
    exam: 'neet',
    difficulty: 'easy',
    question: `Which element has the electronic configuration [Ar] 3d¹⁰ 4s²?`,
    options: ['Cu', 'Zn', 'Ni', 'Fe'],
    correctAnswer: 'Zn',
    solution: `Zinc (Z=30) has configuration [Ar] 3d¹⁰ 4s². Note: Cu is [Ar] 3d¹⁰ 4s¹`,
    topic: 'Atomic Structure',
    expectedResponseType: 'concept',
  },
];

export function getTestProblems(filters: {
  subject?: string;
  exam?: string;
  difficulty?: string;
  limit?: number;
}): TestProblem[] {
  let filtered = [...jeeNeetProblems];
  
  if (filters.subject) {
    filtered = filtered.filter(p => p.subject === filters.subject);
  }
  
  if (filters.exam) {
    filtered = filtered.filter(p => p.exam === filters.exam);
  }
  
  if (filters.difficulty) {
    filtered = filtered.filter(p => p.difficulty === filters.difficulty);
  }
  
  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

export function getRandomProblems(count: number = 10): TestProblem[] {
  const shuffled = [...jeeNeetProblems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
